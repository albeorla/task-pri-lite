"""Planning processor for the Google Calendar exporter."""

import datetime
import logging

from dateutil import parser

from google_calendar_exporter.models.planning import (
    DenormalizedEventAttendee,
    DenormalizedEventItem,
    DenormalizedEventReminder,
    PlanningCalendar,
)
from google_calendar_exporter.protocols import RawCalendarData, RawEventData

logger = logging.getLogger(__name__)


class PlanningProcessor:
    """Processes raw Google Calendar data into denormalized planning models."""

    def process_calendars(self, raw_calendars: list[RawCalendarData]) -> list[PlanningCalendar]:
        """
        Process a list of raw calendars into planning calendars.

        Args:
            raw_calendars: List of raw calendar data from the API

        Returns:
            List of PlanningCalendar objects
        """
        planning_calendars = []

        for calendar_data in raw_calendars:
            calendar_id = calendar_data.get("id")
            if not calendar_id:
                logger.warning("Skipping calendar without ID")
                continue

            # Extract calendar metadata
            planning_calendar = PlanningCalendar(
                calendar_id=calendar_id,
                calendar_summary=calendar_data.get("summary"),
                description=calendar_data.get("description"),
                time_zone=calendar_data.get("timeZone"),
                color_id=calendar_data.get("colorId"),
                background_color=calendar_data.get("backgroundColor"),
                foreground_color=calendar_data.get("foregroundColor"),
                access_role=calendar_data.get("accessRole"),
                is_primary=calendar_data.get("primary", False),
                selected=calendar_data.get("selected", False),
                items=[],  # Will be populated later
            )

            planning_calendars.append(planning_calendar)

        return planning_calendars

    def process_events(
        self, raw_events: list[RawEventData], calendar_id: str, calendar_tz: str
    ) -> list[DenormalizedEventItem]:
        """
        Process raw events for a calendar into denormalized event items.

        Args:
            raw_events: List of raw event data from the API
            calendar_id: ID of the calendar containing these events
            calendar_tz: Default timezone of the calendar

        Returns:
            List of DenormalizedEventItem objects
        """
        event_items = []

        for event_data in raw_events:
            event_id = event_data.get("id")
            if not event_id:
                logger.warning("Skipping event without ID")
                continue

            # Process date/time information
            start_info = event_data.get("start", {})
            end_info = event_data.get("end", {})

            # Determine if it's an all-day event
            is_all_day = "date" in start_info

            # Get effective timezone
            event_tz = start_info.get("timeZone") or end_info.get("timeZone") or calendar_tz

            # Parse start and end times
            start_datetime = None
            start_date = None
            end_datetime = None
            end_date = None

            if is_all_day:
                # All-day event
                if "date" in start_info:
                    start_date = self._parse_date(start_info["date"])
                if "date" in end_info:
                    end_date = self._parse_date(end_info["date"])
            else:
                # Timed event
                if "dateTime" in start_info:
                    start_datetime = self._parse_datetime(start_info["dateTime"])
                if "dateTime" in end_info:
                    end_datetime = self._parse_datetime(end_info["dateTime"])

            # Process recurrence information
            recurrence_rules = event_data.get("recurrence", [])
            is_recurring = len(recurrence_rules) > 0
            recurrence_rule = recurrence_rules[0] if is_recurring else None

            # Process attendees
            attendees = []
            for attendee_data in event_data.get("attendees", []):
                attendee = DenormalizedEventAttendee(
                    email=attendee_data.get("email"),
                    response_status=attendee_data.get("responseStatus"),
                )
                attendees.append(attendee)

            # Process reminders
            reminders = []
            for reminder_data in event_data.get("reminders", {}).get("overrides", []):
                reminder = DenormalizedEventReminder(
                    method=reminder_data.get("method"), minutes_before=reminder_data.get("minutes")
                )
                reminders.append(reminder)

            # Determine if user is organizer
            organizer_data = event_data.get("organizer", {})
            organizer_email = organizer_data.get("email")
            is_organizer = organizer_data.get("self", False)

            # Create the denormalized event item
            event_item = DenormalizedEventItem(
                item_id=event_id,
                content=event_data.get("summary"),
                description=event_data.get("description"),
                status=event_data.get("status"),
                # Date/time fields
                start_datetime=start_datetime,
                start_date=start_date,
                end_datetime=end_datetime,
                end_date=end_date,
                timezone=event_tz,
                is_all_day=is_all_day,
                # Recurrence fields
                is_recurring=is_recurring,
                recurrence_rule=recurrence_rule,
                recurring_event_id=event_data.get("recurringEventId"),
                # Other details
                location=event_data.get("location"),
                color_id=event_data.get("colorId"),
                source_link=event_data.get("htmlLink"),
                # Nested details
                attendees=attendees,
                organizer_email=organizer_email,
                is_organizer=is_organizer,
                reminders=reminders,
            )

            event_items.append(event_item)

        return event_items

    def _parse_datetime(self, datetime_str: str) -> datetime.datetime | None:
        """Parse a datetime string into a datetime object."""
        try:
            return parser.parse(datetime_str)
        except (ValueError, TypeError):
            logger.warning(f"Failed to parse datetime: {datetime_str}")
            return None

    def _parse_date(self, date_str: str) -> datetime.date | None:
        """Parse a date string into a date object."""
        try:
            return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            logger.warning(f"Failed to parse date: {date_str}")
            return None
