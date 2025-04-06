"""Exporter orchestrator for the Google Calendar exporter."""

import logging

from google_calendar_exporter.config import Config  # Import Config for type hint
from google_calendar_exporter.formatters.planning_formatter import PlanningJsonFormatter

# Import protocols
from google_calendar_exporter.models.event import Event
from google_calendar_exporter.models.planning import PlanningCalendar
from google_calendar_exporter.planning_processor import PlanningProcessor
from google_calendar_exporter.protocols import (
    ApiClient,
    Authenticator,
    CalendarEventResult,
    EventFilter,
    EventFormatter,
    FilteredEventResult,
    Processor,
    RawCalendarData,
    TaskFormatter,
    TaskResult,
)

logger = logging.getLogger(__name__)


class GoogleCalendarExporter:
    """Orchestrates the Google Calendar data export process using dependency injection."""

    def __init__(
        self,
        config: Config,
        auth_manager: Authenticator,
        api_client: ApiClient,  # Now expects an object matching the protocol
        event_processor: Processor,
        event_formatter: EventFormatter,
        task_formatter: TaskFormatter,
        planning_processor: PlanningProcessor | None = None,
        planning_formatter: PlanningJsonFormatter | None = None,
        event_filter: EventFilter | None = None,
    ):
        self.config = config
        self.auth_manager = auth_manager
        self.api_client = api_client  # Use the injected client directly
        self.event_processor = event_processor
        self.event_formatter = event_formatter
        self.task_formatter = task_formatter
        self.planning_processor = planning_processor or PlanningProcessor()
        self.planning_formatter = planning_formatter or PlanningJsonFormatter()
        self.event_filter = event_filter  # Optional event filter
        self.calendar_events: CalendarEventResult = {}
        self.tasks: TaskResult = []
        self.planning_calendars: list[PlanningCalendar] = []
        self.filtered_events: FilteredEventResult | None = None

    # No longer needed as api_client is initialized externally and injected
    # def _initialize_api_client(self): ...

    def _sort_events(self, events: list[Event]) -> list[Event]:
        """Sorts events chronologically based on start time/date."""

        def sort_key(event: Event) -> str:
            if not event.start:
                return ""
            # Prioritize dateTime, fallback to date, then empty string
            return event.start.dateTime or event.start.date or ""

        return sorted(events, key=sort_key)

    def _fetch_and_process_calendar_events(self, calendar: RawCalendarData) -> None:
        """Fetches and processes events for a single calendar."""
        calendar_id: str = calendar["id"]
        calendar_name: str = calendar.get("summary", calendar_id)  # Use summary, fallback to ID
        calendar_tz: str = calendar.get("timeZone", "UTC")  # Default to UTC
        logger.info(f"--- Processing Calendar: {calendar_name} ({calendar_id}) ---")

        try:
            # Use the injected api_client
            raw_events = self.api_client.list_events(calendar_id)

            # Process events using the legacy processor
            processed_events = self.event_processor.process_events(raw_events, calendar_tz)

            # Sort events if configured
            if self.config.SORT_EVENTS_BY_START and processed_events:
                logger.debug(
                    f"Sorting {len(processed_events)} events for calendar {calendar_name}..."
                )
                processed_events = self._sort_events(processed_events)

            # Store events in calendar_events dictionary
            self.calendar_events[calendar_name] = processed_events

            # Convert events to tasks and add to tasks list
            calendar_tasks = self.event_processor.convert_to_tasks(
                processed_events, calendar_id, calendar_name
            )
            self.tasks.extend(calendar_tasks)

            # Process events using the planning processor
            planning_events = self.planning_processor.process_events(
                raw_events, calendar_id, calendar_tz
            )

            # Find or create the planning calendar
            planning_calendar = None
            for cal in self.planning_calendars:
                if cal.calendar_id == calendar_id:
                    planning_calendar = cal
                    break

            if not planning_calendar:
                # Create a new planning calendar
                planning_calendar = PlanningCalendar(
                    calendar_id=calendar_id,
                    calendar_summary=calendar_name,
                    description=calendar.get("description"),
                    time_zone=calendar_tz,
                    color_id=calendar.get("colorId"),
                    background_color=calendar.get("backgroundColor"),
                    foreground_color=calendar.get("foregroundColor"),
                    access_role=calendar.get("accessRole"),
                    is_primary=calendar.get("primary", False),
                    selected=calendar.get("selected", False),
                    items=[],
                )
                self.planning_calendars.append(planning_calendar)

            # Add the planning events to the calendar
            planning_calendar.items.extend(planning_events)

            logger.info(f"--- Finished Processing Calendar: {calendar_name} ---")

        except Exception as e:
            logger.error(f"Failed to process calendar {calendar_name} ({calendar_id}): {e}")
            # Add error marker or skip calendar based on desired error handling
            self.calendar_events[calendar_name] = [
                # Create a dummy Event to indicate error
                Event(
                    id=f"error-{calendar_id}",
                    summary=f"Error: Failed to process calendar {calendar_name}",
                    description=f"Error details: {e!s}",
                    status="cancelled",
                    start=None,
                    end=None,
                )
            ]

    def filter_events(self) -> FilteredEventResult | None:
        """Filters calendar events using the event filter if available."""
        if not self.event_filter:
            logger.warning("No event filter available. Skipping event filtering.")
            return None
            
        try:
            logger.info("Starting event filtering...")
            self.filtered_events = self.event_filter.filter_events(self.calendar_events)
            
            # Save filtered events if output file is specified
            if hasattr(self.config, "FILTERED_EVENTS_OUTPUT_FILE") and self.config.FILTERED_EVENTS_OUTPUT_FILE:
                self.event_filter.save_filtered_events(
                    self.filtered_events, self.config.FILTERED_EVENTS_OUTPUT_FILE
                )
                logger.info(f"Filtered events saved to: {self.config.FILTERED_EVENTS_OUTPUT_FILE}")
                
            return self.filtered_events
        except Exception as e:
            logger.error(f"Error during event filtering: {e}")
            return None

    def export_data(self) -> tuple[str | None, str | None, str | None, FilteredEventResult | None]:
        """Runs the full export process. 
        
        Returns tuple of (events_json, tasks_json, planning_json, filtered_events) or (None, None, None, None) on failure.
        """
        logger.info("Starting Google Calendar export process...")
        try:
            # Authentication is handled externally before api_client is created/injected
            # 1. Retrieve Calendar List (using injected api_client)
            calendars = self.api_client.list_calendars()
            if not calendars:
                logger.warning("No calendars found for this user.")
                # Return empty structures formatted
                empty_events: CalendarEventResult = {}
                empty_tasks: TaskResult = []
                empty_planning: list[PlanningCalendar] = []
                events_json = self.event_formatter.format(empty_events)
                tasks_json = self.task_formatter.format(empty_tasks)
                planning_json = self.planning_formatter.format(empty_planning)
                self.event_formatter.save_to_file(events_json, self.config.EVENTS_OUTPUT_FILE)
                self.task_formatter.save_to_file(tasks_json, self.config.TASKS_OUTPUT_FILE)
                self.planning_formatter.save_to_file(
                    planning_json, self.config.PLANNING_OUTPUT_FILE
                )
                return events_json, tasks_json, planning_json, None

            # 2. Fetch and Process Events for Each Calendar
            self.calendar_events = {}  # Reset data for this run
            self.tasks = []  # Reset tasks for this run
            self.planning_calendars = []  # Reset planning calendars for this run
            for calendar_data in calendars:
                self._fetch_and_process_calendar_events(calendar_data)

            # 3. Format Output (using injected formatters)
            events_json = self.event_formatter.format(self.calendar_events)
            tasks_json = self.task_formatter.format(self.tasks)
            planning_json = self.planning_formatter.format(self.planning_calendars)

            # 4. Save Output (using injected formatters)
            self.event_formatter.save_to_file(events_json, self.config.EVENTS_OUTPUT_FILE)
            self.task_formatter.save_to_file(tasks_json, self.config.TASKS_OUTPUT_FILE)
            self.planning_formatter.save_to_file(planning_json, self.config.PLANNING_OUTPUT_FILE)
            
            # 5. Apply event filtering if available
            filtered_events = None
            if self.event_filter:
                filtered_events = self.filter_events()

            logger.info("Google Calendar export process completed successfully.")
            logger.info(f"Events saved to: {self.config.EVENTS_OUTPUT_FILE}")
            logger.info(f"Tasks saved to: {self.config.TASKS_OUTPUT_FILE}")
            logger.info(f"Planning data saved to: {self.config.PLANNING_OUTPUT_FILE}")
            if filtered_events:
                logger.info(f"Filtered events saved to: {getattr(self.config, 'FILTERED_EVENTS_OUTPUT_FILE', 'N/A')}")
            return events_json, tasks_json, planning_json, filtered_events  # Return all results

        except Exception:
            # Log the full traceback for detailed debugging
            logger.exception("An error occurred during the export process.")
            return None, None, None, None  # Indicate failure
