"""Defines protocols (interfaces) for core components."""

from typing import Any, Protocol

# Type alias for raw calendar/event data from API
RawCalendarData = dict[str, Any]
RawEventData = dict[str, Any]

# Forward references for type hints
Event = Any
Task = Any
GoogleCredentials = Any

# Result type aliases
CalendarEventResult = dict[str, list[Event]]  # Calendar Name -> List of Events
TaskResult = list[Task]  # List of tasks derived from events
FilteredEventResult = dict[str, Any]  # Structure for filtered events with metadata


class Authenticator(Protocol):
    """Protocol for authentication managers."""

    def get_credentials(self) -> GoogleCredentials:
        """Returns valid Google API credentials."""
        ...


class ApiClient(Protocol):
    """Protocol for API clients interacting with Google Calendar."""

    def list_calendars(self) -> list[RawCalendarData]:
        """Fetches the list of user's calendars."""
        ...

    def list_events(self, calendar_id: str) -> list[RawEventData]:
        """Fetches all events for a specific calendar."""
        ...


class Processor(Protocol):
    """Protocol for processing raw event data."""

    def process_events(self, raw_events: list[RawEventData], calendar_tz: str) -> list[Event]:
        """Processes raw events into structured Event objects."""
        ...

    def convert_to_tasks(
        self, events: list[Event], calendar_id: str, calendar_name: str
    ) -> list[Task]:
        """Converts events to tasks."""
        ...


class EventFormatter(Protocol):
    """Protocol for formatting calendar events data."""

    def format(self, data: CalendarEventResult) -> str:
        """Formats the structured event data into a string representation (e.g., JSON)."""
        ...

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the formatted string data to a file."""
        ...


class TaskFormatter(Protocol):
    """Protocol for formatting task data."""

    def format(self, data: TaskResult) -> str:
        """Formats the structured task data into a string representation (e.g., JSON)."""
        ...

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the formatted string data to a file."""
        ...


class EventFilter(Protocol):
    """Protocol for filtering calendar events."""
    
    def filter_events(self, events: CalendarEventResult) -> FilteredEventResult:
        """Filters events based on specific criteria and returns filtered results with metadata."""
        ...
    
    def save_filtered_events(self, filtered_data: FilteredEventResult, file_path: str) -> None:
        """Saves the filtered events data to a file."""
        ...
