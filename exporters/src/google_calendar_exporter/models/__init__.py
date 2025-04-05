"""Domain models for Google Calendar entities."""

# Legacy models (to be deprecated)
from google_calendar_exporter.models.base import CalendarEntity
from google_calendar_exporter.models.calendar import Calendar
from google_calendar_exporter.models.event import Event, EventDateTime, EventException

# New denormalized planning models
from google_calendar_exporter.models.planning import (
    DenormalizedEventAttendee,
    DenormalizedEventItem,
    DenormalizedEventReminder,
    PlanningCalendar,
)
from google_calendar_exporter.models.task import Task

__all__ = [
    # Legacy models
    "CalendarEntity",
    "Calendar",
    "Event",
    "EventDateTime",
    "EventException",
    "Task",
    # New planning models
    "DenormalizedEventAttendee",
    "DenormalizedEventReminder",
    "DenormalizedEventItem",
    "PlanningCalendar",
]
