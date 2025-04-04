"""Event processor for the Google Calendar exporter."""

import logging
from collections import defaultdict

# Import new models
from google_calendar_exporter.models.event import Event, EventDateTime, EventException
from google_calendar_exporter.models.task import Task
from google_calendar_exporter.protocols import Processor, RawEventData

logger = logging.getLogger(__name__)


class EventProcessor(Processor):  # Inherit from protocol
    """Processes raw Google Calendar event data into a structured format."""

    def _extract_event_base(self, event: RawEventData, calendar_tz: str) -> Event:
        """Extracts common details into an Event, excluding recurrence specifics."""
        # Process start and end times
        start_info = event.get("start", {})
        end_info = event.get("end", {})

        # Determine time zone: event specific > calendar default
        event_tz = start_info.get("timeZone", calendar_tz)

        # Handle date vs dateTime
        is_all_day = "date" in start_info

        # Create EventDateTime objects
        start_datetime = EventDateTime(**start_info) if start_info else None
        end_datetime = EventDateTime(**end_info) if end_info else None

        # Create original_start_time if present
        original_start_time = None
        if event.get("originalStartTime"):
            original_start_time = EventDateTime(**event.get("originalStartTime"))

        # Create the event
        return Event(
            id=event.get("id", "N/A"),
            summary=event.get("summary", "No Title"),
            description=event.get("description", ""),
            location=event.get("location", ""),
            status=event.get("status", "confirmed"),
            start=start_datetime,
            end=end_datetime,
            all_day=is_all_day,
            time_zone=event_tz if not is_all_day else None,
            created=event.get("created"),
            updated=event.get("updated"),
            recurrence=event.get("recurrence"),
            recurring_event_id=event.get("recurringEventId"),
            original_start_time=original_start_time,
            exceptions=[] if event.get("recurrence") else None,
        )

    def process_events(self, raw_events: list[RawEventData], calendar_tz: str) -> list[Event]:
        """
        Processes a list of raw events from the API.
        Identifies recurring series and their exceptions.
        Returns a list of processed event objects.
        """
        processed_event_list: list[Event] = []
        # Temporarily store exceptions keyed by their parent series ID
        exceptions_map: dict[str, list[EventException]] = defaultdict(list)
        # Keep track of series Event objects to attach exceptions later
        series_event_map: dict[str, Event] = {}

        logger.debug(f"Processing {len(raw_events)} raw events for calendar with TZ {calendar_tz}.")

        for event_data in raw_events:
            if not event_data.get("id"):
                logger.warning(f"Skipping event without ID: {event_data.get('summary', 'N/A')}")
                continue

            # Extract base details first
            processed_event = self._extract_event_base(event_data, calendar_tz)

            # If it's an instance/exception of a recurring event
            if processed_event.recurring_event_id:
                # Create an EventException object
                exception_info = EventException(
                    id=processed_event.id,  # Use the event ID as the exception ID
                    instance_id=processed_event.id,
                    original_start_time=processed_event.original_start_time,
                    start=processed_event.start,
                    end=processed_event.end,
                    status=processed_event.status,
                    # Only include overrides if they differ from what would be inherited
                    # This requires fetching the parent event or making assumptions
                    # Simplified: just include current title/desc if present on instance
                    title_override=processed_event.summary if event_data.get("summary") else None,
                    description_override=processed_event.description
                    if event_data.get("description")
                    else None,
                )
                if processed_event.recurring_event_id:  # Type narrowing for mypy
                    exceptions_map[processed_event.recurring_event_id].append(exception_info)
                    logger.debug(
                        f"Identified exception for series {processed_event.recurring_event_id}."
                    )
                # Don't add instance to main list; it belongs in the series' exceptions

            # If it's the definition of a recurring series (has recurrence, not an instance)
            elif processed_event.recurrence:
                # Mark as a series (exceptions initialized to [] in _extract_event_base)
                processed_event_list.append(processed_event)
                series_event_map[processed_event.id] = processed_event
                logger.debug(f"Identified recurring series: {processed_event.id}")

            # Otherwise, it's a single, non-recurring event
            else:
                # Ensure exceptions is None for single events
                processed_event.exceptions = None
                processed_event_list.append(processed_event)
                logger.debug(f"Identified single event: {processed_event.id}")

        # Attach collected exceptions to their respective series
        logger.debug(
            f"Attaching {sum(len(v) for v in exceptions_map.values())} exceptions to series..."
        )
        for series_id, series_obj in series_event_map.items():
            if series_id in exceptions_map:
                # Sort exceptions by original start time for consistency
                sorted_exceptions = sorted(
                    exceptions_map[series_id],
                    key=lambda ex: (
                        ex.original_start_time.dateTime
                        if ex.original_start_time and ex.original_start_time.dateTime
                        else (ex.original_start_time.date if ex.original_start_time else "")
                    ),
                )
                # series_obj should be mutable, directly assign
                series_obj.exceptions = sorted_exceptions
                logger.debug(f"Attached {len(sorted_exceptions)} exceptions to series {series_id}.")

        # Clean up internal processing fields if desired (optional)
        for p_event in processed_event_list:
            p_event.recurring_event_id = None  # Not needed in final output model
            if (
                not p_event.exceptions
            ):  # If it was an exception instance (filtered out) or single event
                p_event.original_start_time = None  # Not needed

        logger.info(f"Processed into {len(processed_event_list)} main events/series.")
        return processed_event_list

    def convert_to_tasks(
        self, events: list[Event], calendar_id: str, calendar_name: str
    ) -> list[Task]:
        """Converts events to tasks."""
        tasks = []
        logger.info(f"Converting {len(events)} events to tasks for calendar: {calendar_name}")

        for event in events:
            # Skip cancelled events
            if event.status == "cancelled":
                continue

            # Create a task from the event
            task = Task.from_event(event, calendar_id, calendar_name)
            tasks.append(task)

            # If this is a recurring event with exceptions, create tasks for non-cancelled exceptions
            if event.exceptions:
                for exception in event.exceptions:
                    if exception.status != "cancelled":
                        # Create a modified event for the exception
                        exception_event = Event(
                            id=exception.instance_id,
                            summary=exception.title_override or event.summary,
                            description=exception.description_override or event.description,
                            location=event.location,
                            status=exception.status,
                            start=exception.start,
                            end=exception.end,
                            all_day=event.all_day,
                            time_zone=event.time_zone,
                            created=event.created,
                            updated=event.updated,
                            recurrence=None,  # Not a recurring event
                            recurring_event_id=event.id,
                            original_start_time=exception.original_start_time,
                            exceptions=None,  # Not a recurring event
                        )

                        # Create a task from the exception event
                        exception_task = Task.from_event(
                            exception_event, calendar_id, calendar_name
                        )
                        tasks.append(exception_task)

        logger.info(f"Converted {len(tasks)} tasks from {len(events)} events")
        return tasks
