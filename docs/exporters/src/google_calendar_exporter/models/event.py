"""Event model for Google Calendar events."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from google_calendar_exporter.models.base import CalendarEntity


class EventDateTime(BaseModel):
    """Represents a date/time in a Google Calendar event."""

    date: str | None = Field(None, description="Date in YYYY-MM-DD format for all-day events")
    dateTime: str | None = Field(None, description="Datetime in RFC3339 format for timed events")
    timeZone: str | None = Field(None, description="Timezone for the date/time")

    @field_validator("dateTime", mode="before")
    def validate_datetime(cls, v):
        """Validate dateTime format."""
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class EventException(CalendarEntity):
    """Represents an exception to a recurring event."""

    instance_id: str = Field(..., description="ID of the exception instance")
    original_start_time: EventDateTime = Field(
        ..., description="Original start time of the instance"
    )
    start: EventDateTime = Field(..., description="Start time of the exception")
    end: EventDateTime = Field(..., description="End time of the exception")
    status: str = Field(
        "confirmed", description="Status of the exception (confirmed, cancelled, etc.)"
    )
    title_override: str | None = Field(None, description="Override for the event title")
    description_override: str | None = Field(None, description="Override for the event description")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EventException":
        """Create an event exception from a dictionary.

        Args:
            data: Dictionary containing event exception data

        Returns:
            An EventException instance
        """
        return cls(**data)


class Event(CalendarEntity):
    """Represents a Google Calendar event."""

    summary: str = Field(..., description="Event title/summary")
    description: str | None = Field("", description="Event description")
    location: str | None = Field("", description="Event location")
    status: str = Field("confirmed", description="Event status (confirmed, cancelled, tentative)")
    start: EventDateTime = Field(..., description="Event start time")
    end: EventDateTime = Field(..., description="Event end time")
    all_day: bool = Field(False, description="Whether this is an all-day event")
    time_zone: str | None = Field(None, description="Event timezone")
    created: datetime | None = Field(None, description="When the event was created")
    updated: datetime | None = Field(None, description="When the event was last updated")
    recurrence: list[str] | None = Field(None, description="Recurrence rules (RRULE, EXDATE, etc.)")
    recurring_event_id: str | None = Field(None, description="ID of parent recurring event")
    original_start_time: EventDateTime | None = Field(
        None, description="Original start time for recurring instances"
    )

    # Composite pattern: child elements
    exceptions: list[EventException] | None = Field(
        None, description="Exceptions to recurring events"
    )

    @classmethod
    def from_dict(cls, data: dict[str, Any], include_exceptions: bool = True) -> "Event":
        """Create an event from a dictionary.

        Args:
            data: Dictionary containing event data
            include_exceptions: Whether to include exceptions

        Returns:
            An Event instance
        """
        # Create a copy of the data to avoid modifying the original
        event_data = data.copy()

        # Extract child elements if present and if include_exceptions is True
        exceptions_data = event_data.pop("exceptions", []) if include_exceptions else []

        # Process start and end times
        if "start" in event_data and isinstance(event_data["start"], dict):
            event_data["all_day"] = "date" in event_data["start"]
            event_data["start"] = EventDateTime(**event_data["start"])

        if "end" in event_data and isinstance(event_data["end"], dict):
            event_data["end"] = EventDateTime(**event_data["end"])

        if "original_start_time" in event_data and isinstance(
            event_data["original_start_time"], dict
        ):
            event_data["original_start_time"] = EventDateTime(**event_data["original_start_time"])

        # Create the event instance
        event = cls(**event_data)

        # Add child elements if include_exceptions is True
        if include_exceptions and exceptions_data:
            event.exceptions = [
                EventException.from_dict(exception) for exception in exceptions_data
            ]

        return event
