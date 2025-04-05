"""Data models for the Google Calendar exporter."""

from dataclasses import dataclass, field

# Type alias for the raw start/end time dictionary from Google API
TimeData = dict[str, str]


@dataclass
class EventException:
    """Represents an exception to a recurring event."""

    instance_id: str
    original_start_time: TimeData | None  # Can be date or dateTime
    start: TimeData | None  # Can be date or dateTime
    end: TimeData | None  # Can be date or dateTime
    status: str
    title_override: str | None = None
    description_override: str | None = None
    # Add other fields that can be overridden in an exception


@dataclass
class ProcessedEvent:
    """Represents a processed calendar event, mapping closer to output needs."""

    id: str
    title: str
    description: str | None = ""
    location: str | None = ""
    status: str = "confirmed"
    # Store raw start/end dicts for flexibility, or parse them further
    start: TimeData | None = None  # e.g., {'dateTime': '...', 'timeZone': '...'} or {'date': '...'}
    end: TimeData | None = None
    all_day: bool = False
    time_zone: str | None = None  # Store effective timezone if needed, derived from start usually
    created: str | None = None
    updated: str | None = None
    recurrence: list[str] | None = None  # RRULE, EXDATE etc.
    # These are more internal processing fields
    recurring_event_id: str | None = None  # ID of parent series if this is an instance/exception
    original_start_time: TimeData | None = None  # Original start if instance/exception
    exceptions: list[EventException] | None = None  # Use None for single events, [] for series


# These are less used in the current flattened output structure but good for potential expansion
@dataclass
class CalendarInfo:
    """Represents metadata about a calendar."""

    id: str
    name: str
    description: str | None = None
    time_zone: str = "UTC"


@dataclass
class ExportStructure:
    """Represents the complete export with calendar hierarchy."""

    calendars: dict[str, CalendarInfo] = field(default_factory=dict)
    events_by_calendar: dict[str, list[ProcessedEvent]] = field(default_factory=dict)
