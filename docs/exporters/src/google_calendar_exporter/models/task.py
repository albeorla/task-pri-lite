"""Task model for representing calendar events as tasks."""

from pydantic import Field

from google_calendar_exporter.models.base import CalendarEntity
from google_calendar_exporter.models.event import Event


class Task(CalendarEntity):
    """Represents a task derived from a Google Calendar event."""

    title: str = Field(..., description="Task title (from event summary)")
    description: str | None = Field("", description="Task description (from event description)")
    calendar_id: str = Field(..., description="ID of the calendar containing the event")
    calendar_name: str = Field(..., description="Name of the calendar containing the event")
    due_date: str | None = Field(None, description="Due date for the task (from event end time)")
    start_date: str | None = Field(
        None, description="Start date for the task (from event start time)"
    )
    is_all_day: bool = Field(False, description="Whether this is an all-day task")
    location: str | None = Field(None, description="Location of the task (from event location)")
    status: str = Field("active", description="Task status (active, completed, cancelled)")
    priority: int = Field(1, description="Task priority (1-4, where 4 is highest)")
    tags: list[str] = Field(default_factory=list, description="Tags for the task")
    url: str | None = Field(None, description="URL to the original event")

    @classmethod
    def from_event(cls, event: Event, calendar_id: str, calendar_name: str) -> "Task":
        """Create a task from an event.

        Args:
            event: The event to convert to a task
            calendar_id: ID of the calendar containing the event
            calendar_name: Name of the calendar containing the event

        Returns:
            A Task instance
        """
        # Determine due date and start date
        due_date = None
        if event.end:
            due_date = event.end.date if event.end.date else event.end.dateTime

        start_date = None
        if event.start:
            start_date = event.start.date if event.start.date else event.start.dateTime

        # Determine status
        status = "active"
        if event.status == "cancelled":
            status = "cancelled"
        elif event.status == "completed":
            status = "completed"

        # Create tags from event properties
        tags = []
        if event.all_day:
            tags.append("all-day")
        if event.recurrence:
            tags.append("recurring")
        if event.location:
            tags.append("has-location")

        return cls(
            id=event.id,
            title=event.summary,
            description=event.description,
            calendar_id=calendar_id,
            calendar_name=calendar_name,
            due_date=due_date,
            start_date=start_date,
            is_all_day=event.all_day,
            location=event.location,
            status=status,
            priority=1,  # Default priority
            tags=tags,
            url=f"https://calendar.google.com/calendar/event?eid={event.id}",
        )
