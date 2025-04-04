"""Calendar model for Google Calendar."""

from typing import Any

from pydantic import Field

from google_calendar_exporter.models.base import CalendarEntity
from google_calendar_exporter.models.event import Event


class Calendar(CalendarEntity):
    """Represents a Google Calendar."""

    summary: str = Field(..., description="Calendar name/summary")
    description: str | None = Field(None, description="Calendar description")
    time_zone: str = Field("UTC", description="Calendar timezone")
    access_role: str | None = Field(None, description="User's access role for this calendar")
    background_color: str | None = Field(None, description="Calendar background color")
    foreground_color: str | None = Field(None, description="Calendar foreground color")
    selected: bool | None = Field(None, description="Whether the calendar is selected")
    primary: bool | None = Field(None, description="Whether this is the primary calendar")

    # Composite pattern: child elements
    events: list[Event] = Field(default_factory=list, description="Events in this calendar")

    @classmethod
    def from_dict(cls, data: dict[str, Any], include_events: bool = True) -> "Calendar":
        """Create a calendar from a dictionary.

        Args:
            data: Dictionary containing calendar data
            include_events: Whether to include events

        Returns:
            A Calendar instance
        """
        # Create a copy of the data to avoid modifying the original
        calendar_data = data.copy()

        # Extract child elements if present and if include_events is True
        events_data = calendar_data.pop("events", []) if include_events else []

        # Create the calendar instance
        calendar = cls(**calendar_data)

        # Add child elements if include_events is True
        if include_events:
            from google_calendar_exporter.models.event import Event

            calendar.events = [Event.from_dict(event) for event in events_data]

        return calendar
