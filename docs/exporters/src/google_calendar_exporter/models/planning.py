"""Denormalized planning models for Google Calendar data."""

import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DenormalizedEventAttendee(BaseModel):
    """Simplified representation of an event attendee."""

    email: str | None = None
    response_status: str | None = Field(
        None, description="e.g., accepted, declined, needsAction, tentative"
    )


class DenormalizedEventReminder(BaseModel):
    """Simplified representation of an event reminder."""

    method: Literal["email", "popup"] | None = None
    minutes_before: int | None = Field(None, alias="minutes")  # Match API naming if needed


class DenormalizedEventItem(BaseModel):
    """Represents a denormalized Google Calendar event item for planning."""

    item_id: str = Field(..., description="Unique Event ID from Google Calendar")
    type: Literal["event"] = Field("event", description="Type identifier")
    content: str | None = Field(None, description="Event summary/title")
    description: str | None = Field(None, description="Event description")
    status: Literal["confirmed", "tentative", "cancelled"] | None = Field(
        None, description="Event status"
    )

    # Denormalized Date/Time fields
    start_datetime: datetime.datetime | None = Field(
        None, description="Combined start dateTime (timezone-aware)"
    )
    start_date: datetime.date | None = Field(None, description="Start date for all-day events")
    end_datetime: datetime.datetime | None = Field(
        None, description="Combined end dateTime (timezone-aware)"
    )
    end_date: datetime.date | None = Field(None, description="End date for all-day events")
    timezone: str | None = Field(None, description="Effective timezone (e.g., America/New_York)")
    is_all_day: bool = Field(False, description="True if it's an all-day event")

    # Denormalized Recurrence
    is_recurring: bool = Field(False, description="Simplified flag indicating recurrence")
    recurrence_rule: str | None = Field(
        None, description="Optional: First recurrence rule string (RRULE)"
    )
    recurring_event_id: str | None = Field(
        None, description="Optional: ID of the parent recurring event if this is an instance"
    )

    # Other Event details
    location: str | None = Field(None, description="Event location")
    color_id: str | None = Field(None, description="Event-specific color ID")
    source_link: str | None = Field(None, description="Link to the original event (e.g., htmlLink)")

    # Optional nested details (simplified)
    attendees: list[DenormalizedEventAttendee] = Field(default_factory=list)
    organizer_email: str | None = Field(None, description="Email of the event organizer")
    is_organizer: bool | None = Field(
        None, description="True if the authenticated user is the organizer"
    )  # Needs to be derived
    reminders: list[DenormalizedEventReminder] = Field(default_factory=list)

    class Config:
        # Optional: If you want aliases to match the Google API exactly during parsing
        # populate_by_name = True
        # Example alias (if needed):
        # field_aliases = {'source_link': 'htmlLink'}
        pass


class PlanningCalendar(BaseModel):
    """Represents a Google Calendar containing denormalized planning items."""

    calendar_id: str = Field(..., description="Unique ID of the calendar")
    calendar_summary: str | None = Field(
        None, alias="summary", description="Name/summary of the calendar"
    )
    description: str | None = Field(None, description="Calendar description")
    time_zone: str | None = Field(None, description="Primary timezone of the calendar")
    color_id: str | None = Field(
        None, description="Calendar color ID"
    )  # From CalendarList, not event
    background_color: str | None = Field(None, description="Calendar background color from API")
    foreground_color: str | None = Field(None, description="Calendar foreground color from API")
    access_role: Literal["owner", "writer", "reader", "freeBusyReader"] | None = Field(
        None, description="User's access level"
    )
    is_primary: bool | None = Field(None, description="True if this is the user's primary calendar")
    selected: bool | None = Field(
        None, description="Whether the calendar is selected by default in the UI"
    )

    items: list[DenormalizedEventItem] = Field(
        default_factory=list, description="List of denormalized events belonging to this calendar"
    )
