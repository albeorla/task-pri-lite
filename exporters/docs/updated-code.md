Okay, let's refactor the provided `google_calendar_exporter` code, incorporating best practices like Protocols, SOLID principles, and improved OOD.

**Key Changes:**

1.  **Protocols (`protocols.py`):** Introduced `typing.Protocol` to define clear interfaces for core components (`Authenticator`, `ApiClient`, `Processor`, `Formatter`). This strengthens the Dependency Inversion Principle (DIP) and Open/Closed Principle (OCP).
2.  **Dependency Injection:** Modified `GoogleCalendarExporter` and `main.py` to explicitly inject dependencies based on the defined protocols. This improves testability and flexibility.
3.  **Data Models (`models.py`):** Used the existing `dataclasses` more consistently, especially ensuring `EventProcessor` returns `List[ProcessedEvent]`. Added type hints using these models throughout.
4.  **Type Hinting:** Improved type hinting across all modules, leveraging the new protocols and data models.
5.  **`py.typed` File:** Added an empty `py.typed` file to indicate PEP 561 compliance for type checkers.
6.  **Strategy Pattern:** The `OutputFormatter` interface (`Formatter` protocol) naturally facilitates the Strategy pattern, allowing different formatting strategies (like JSON, CSV) to be plugged in.
7.  **Configuration:** Kept the `Config` class but ensured components primarily rely on injected configuration or specific values passed during method calls where appropriate, rather than directly importing `settings` everywhere.

**Refactored Code:**

**1. `src/google_calendar_exporter/py.typed`** (Create this empty file)

**2. `src/google_calendar_exporter/protocols.py`** (New file)

```python
# src/google_calendar_exporter/protocols.py
"""Defines protocols (interfaces) for core components."""

from typing import Protocol, List, Dict, Any, Optional
from google.oauth2.credentials import Credentials as GoogleCredentials
from .models import ProcessedEvent # Assuming models.py is in the same directory

# Type alias for raw calendar/event data from API
RawCalendarData = Dict[str, Any]
RawEventData = Dict[str, Any]
ExportResult = Dict[str, List[ProcessedEvent]] # Calendar Name -> List of Events

class Authenticator(Protocol):
    """Protocol for authentication managers."""

    def get_credentials(self) -> GoogleCredentials:
        """Returns valid Google API credentials."""
        ...

class ApiClient(Protocol):
    """Protocol for API clients interacting with Google Calendar."""

    def list_calendars(self) -> List[RawCalendarData]:
        """Fetches the list of user's calendars."""
        ...

    def list_events(self, calendar_id: str) -> List[RawEventData]:
        """Fetches all events for a specific calendar."""
        ...

class Processor(Protocol):
    """Protocol for processing raw event data."""

    def process_events(
        self, raw_events: List[RawEventData], calendar_tz: str
    ) -> List[ProcessedEvent]:
        """Processes raw events into structured ProcessedEvent objects."""
        ...

class Formatter(Protocol):
    """Protocol for formatting the final exported data."""

    def format(self, data: ExportResult) -> str:
        """Formats the structured data into a string representation (e.g., JSON)."""
        ...

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the formatted string data to a file."""
        ...

```

**3. `src/google_calendar_exporter/config.py`** (Minor change: removed direct validation call)

```python
# src/google_calendar_exporter/config.py
"""Configuration for the Google Calendar exporter."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # OAuth Scopes - Read-only access is sufficient for exporting
    SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

    # File Paths - Load from environment variables with defaults
    CREDENTIALS_FILE = os.getenv("CREDENTIALS_FILE", "credentials.json")
    TOKEN_FILE = os.getenv("TOKEN_FILE", "token.json")
    OUTPUT_FILE = os.getenv("OUTPUT_FILE", "google_calendar_export.json")

    # API Settings
    API_SERVICE_NAME = "calendar"
    API_VERSION = "v3"

    # Export Settings (as per blueprint)
    FETCH_SINGLE_EVENTS = False  # Fetch recurring series as single items
    FETCH_SHOW_DELETED = True  # Include deleted/cancelled items initially
    SORT_EVENTS_BY_START = True  # Sort events chronologically within each calendar

    @classmethod
    def validate(cls):
        """Validate that essential configuration files exist."""
        if not os.path.exists(cls.CREDENTIALS_FILE):
            raise FileNotFoundError(
                f"Credentials file not found at: {cls.CREDENTIALS_FILE}. "
                "Please download it from Google Cloud Console and place it correctly "
                "or set the CREDENTIALS_FILE environment variable."
            )

# Instantiate config for easy import primarily in main/factories
settings = Config()
# Removed settings.validate() here - validation should happen explicitly at startup
```

**4. `src/google_calendar_exporter/models.py`** (Ensure consistent usage)

```python
# src/google_calendar_exporter/models.py
"""Data models for the Google Calendar exporter."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# Type alias for the raw start/end time dictionary from Google API
TimeData = Dict[str, str]

@dataclass
class EventException:
    """Represents an exception to a recurring event."""

    instance_id: str
    original_start_time: Optional[TimeData] # Can be date or dateTime
    start: Optional[TimeData] # Can be date or dateTime
    end: Optional[TimeData] # Can be date or dateTime
    status: str
    title_override: Optional[str] = None
    description_override: Optional[str] = None
    # Add other fields that can be overridden in an exception


@dataclass
class ProcessedEvent:
    """Represents a processed calendar event, mapping closer to output needs."""

    id: str
    title: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    status: str = "confirmed"
    # Store raw start/end dicts for flexibility, or parse them further
    start: Optional[TimeData] = None # e.g., {'dateTime': '...', 'timeZone': '...'} or {'date': '...'}
    end: Optional[TimeData] = None
    all_day: bool = False
    time_zone: Optional[str] = None # Store effective timezone if needed, derived from start usually
    created: Optional[str] = None
    updated: Optional[str] = None
    recurrence: Optional[List[str]] = None # RRULE, EXDATE etc.
    # These are more internal processing fields, maybe remove from final *model*?
    # recurring_event_id: Optional[str] = None # Not needed if exceptions are nested
    # original_start_time: Optional[TimeData] = None # Only relevant for exceptions
    exceptions: Optional[List[EventException]] = None # Use None for single events, [] for series


# These are less used in the current flattened output structure but good for potential expansion
# @dataclass
# class CalendarInfo:
#     """Represents metadata about a calendar."""
#     id: str
#     name: str
#     description: Optional[str] = None
#     time_zone: str = "UTC"

# @dataclass
# class ExportStructure:
#     """Represents the complete export with calendar hierarchy."""
#     calendars: Dict[str, CalendarInfo] = field(default_factory=dict)
#     events_by_calendar: Dict[str, List[ProcessedEvent]] = field(default_factory=dict)

```

**5. `src/google_calendar_exporter/auth.py`** (Implement `Authenticator` protocol)

```python
# src/google_calendar_exporter/auth.py
"""Authentication for the Google Calendar exporter."""

import os.path
import logging
from typing import Optional # Import Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from .config import Config # Import Config class directly
from .protocols import Authenticator # Import the protocol

# Setup logger for this module
logger = logging.getLogger(__name__)


class GoogleAuthManager(Authenticator): # Inherit from protocol (optional but good practice)
    """Handles Google OAuth 2.0 authentication and credential management."""

    def __init__(self, config: Config):
        # Store the config object
        self.config = config
        self.credentials: Optional[Credentials] = None # Use Optional type hint

    def _load_token(self) -> None:
        """Loads existing token from file if it exists."""
        if os.path.exists(self.config.TOKEN_FILE):
            try:
                self.credentials = Credentials.from_authorized_user_file(
                    self.config.TOKEN_FILE, self.config.SCOPES
                )
                logger.info("Loaded credentials from token file.")
            except Exception as e:
                logger.warning(f"Could not load token file: {e}. Will re-authenticate.")
                self.credentials = None

    def _save_token(self) -> None:
        """Saves the current credentials (including refresh token) to file."""
        if self.credentials:
            try:
                with open(self.config.TOKEN_FILE, "w", encoding="utf-8") as token_file:
                    token_file.write(self.credentials.to_json())
                logger.info(f"Credentials saved to {self.config.TOKEN_FILE}")
            except IOError as e:
                logger.error(f"Failed to save token file: {e}")

    def _refresh_token(self) -> bool:
        """Refreshes the access token using the refresh token. Returns True if successful or not needed."""
        if self.credentials and self.credentials.expired and self.credentials.refresh_token:
            logger.info("Credentials expired. Refreshing token...")
            try:
                self.credentials.refresh(Request())
                logger.info("Token refreshed successfully.")
                self._save_token()  # Save the updated token
                return True
            except Exception as e:
                logger.error(f"Failed to refresh token: {e}")
                # Invalidate credentials if refresh fails
                self.credentials = None
                # Optionally delete the invalid token file
                if os.path.exists(self.config.TOKEN_FILE):
                    try:
                        os.remove(self.config.TOKEN_FILE)
                        logger.info(f"Removed invalid token file: {self.config.TOKEN_FILE}")
                    except OSError as remove_err:
                        logger.error(f"Error removing invalid token file: {remove_err}")
                return False
        # Return True if no refresh was needed or if refresh wasn't possible (no refresh token)
        return True

    def _run_auth_flow(self) -> None:
        """Runs the installed application OAuth flow to get new credentials."""
        logger.info("No valid credentials found or refresh failed. Starting authentication flow...")
        try:
            flow = InstalledAppFlow.from_client_secrets_file(
                self.config.CREDENTIALS_FILE, self.config.SCOPES
            )
            # Request offline access to get a refresh token
            # Note: run_local_server implicitly handles some args, but explicitly setting is clearer
            # auth_url, _ = flow.authorization_url(access_type="offline", include_granted_scopes="true")
            # print(f"Please go to this URL: {auth_url}") # Manual step if run_local_server fails
            self.credentials = flow.run_local_server(
                port=0, access_type="offline", include_granted_scopes="true"
                )
            logger.info("Authentication successful.")
            self._save_token()
        except FileNotFoundError:
            logger.error(f"Credentials file not found at: {self.config.CREDENTIALS_FILE}")
            raise  # Re-raise the exception to halt execution
        except Exception as e:
            logger.error(f"Authentication flow failed: {e}")
            raise  # Re-raise for clarity

    def _ensure_valid_credentials(self) -> None:
        """Internal method to ensure credentials are loaded and valid."""
        if not self.credentials:
            self._load_token()

        if not self.credentials or not self.credentials.valid:
            # Try refreshing first if possible
            if self.credentials and self.credentials.refresh_token:
                if not self._refresh_token():
                    # If refresh failed, force new auth flow
                     self._run_auth_flow()
                # If refresh succeeded or wasn't needed but creds still invalid/None, run flow
                elif not self.credentials or not self.credentials.valid:
                     self._run_auth_flow()
            else:
                # No credentials or no refresh token, must run auth flow
                 self._run_auth_flow()

        # Final check after attempting load/refresh/auth_flow
        if not self.credentials or not self.credentials.valid:
            raise RuntimeError("Failed to obtain valid Google API credentials after all attempts.")

    def get_credentials(self) -> Credentials:
        """Returns valid Google API credentials, authenticating if necessary."""
        logger.debug("Requesting credentials...")
        self._ensure_valid_credentials()
        # We checked validity in _ensure_valid_credentials, so self.credentials should be valid now
        if self.credentials: # Check added for type narrowing
             logger.debug("Returning valid credentials.")
             return self.credentials
        else:
             # This state should ideally not be reached due to the exception in _ensure_valid_credentials
             logger.error("Credentials object is unexpectedly None after validation.")
             raise RuntimeError("Credentials are None after validation check.")

```

**6. `src/google_calendar_exporter/api_client.py`** (Implement `ApiClient` protocol)

```python
# src/google_calendar_exporter/api_client.py
"""API client for the Google Calendar exporter."""

import logging
from typing import List, Dict, Any # Import necessary types
from googleapiclient.discovery import build, Resource # Import Resource for type hint
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials as GoogleCredentials
from .config import Config # Import Config for settings access
from .protocols import ApiClient, RawCalendarData, RawEventData # Import protocol and type aliases

logger = logging.getLogger(__name__)

class GoogleCalendarApiClient(ApiClient): # Inherit from protocol
    """Handles communication with the Google Calendar API."""

    # Type hint for the Google API service object
    service: Resource

    def __init__(self, credentials: GoogleCredentials, config: Config):
        self.credentials = credentials
        self.config = config
        self._build_service()

    def _build_service(self) -> None:
        """Builds the Google Calendar API service object."""
        try:
            # Type hint for service confirms it's a Resource object
            self.service = build(
                self.config.API_SERVICE_NAME,
                self.config.API_VERSION,
                credentials=self.credentials,
                cache_discovery=False,  # Avoid potential discovery cache issues
            )
            logger.info("Google Calendar API service built successfully.")
        except Exception as e:
            logger.error(f"Failed to build Google Calendar API service: {e}")
            raise

    def list_calendars(self) -> List[RawCalendarData]:
        """Fetches the list of user's calendars."""
        logger.info("Fetching calendar list...")
        try:
            # Use type hint provided by googleapiclient stubs if available, otherwise Dict
            calendar_list_result: Dict[str, Any] = self.service.calendarList().list().execute()
            calendars: List[RawCalendarData] = calendar_list_result.get("items", [])
            logger.info(f"Found {len(calendars)} calendars.")
            return calendars
        except HttpError as error:
            logger.error(f"An API error occurred while fetching calendars: {error}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred fetching calendars: {e}")
            raise

    def list_events(self, calendar_id: str) -> List[RawEventData]:
        """Fetches all events for a specific calendar, handling pagination."""
        logger.info(f"Fetching events for calendar ID: {calendar_id}...")
        all_events: List[RawEventData] = []
        page_token: Optional[str] = None # Use Optional type hint
        while True:
            try:
                events_result: Dict[str, Any] = self.service.events().list(
                    calendarId=calendar_id,
                    singleEvents=self.config.FETCH_SINGLE_EVENTS,
                    showDeleted=self.config.FETCH_SHOW_DELETED,
                    maxResults=2500,  # Max allowed page size
                    pageToken=page_token,
                ).execute()

                events: List[RawEventData] = events_result.get("items", [])
                all_events.extend(events)
                logger.debug(f"Fetched {len(events)} events page for calendar {calendar_id}.")

                page_token = events_result.get("nextPageToken")
                if not page_token:
                    break  # Exit loop when no more pages

            except HttpError as error:
                logger.error(f"An API error occurred fetching events for {calendar_id}: {error}")
                raise
            except Exception as e:
                logger.error(f"An unexpected error occurred fetching events for {calendar_id}: {e}")
                raise

        logger.info(f"Fetched a total of {len(all_events)} events for calendar ID: {calendar_id}.")
        return all_events
```

**7. `src/google_calendar_exporter/event_processor.py`** (Implement `Processor`, use Models)

```python
# src/google_calendar_exporter/event_processor.py
"""Event processor for the Google Calendar exporter."""

import logging
from collections import defaultdict
from typing import List, Dict, Any, Optional
from .config import Config # Import Config
from .models import ProcessedEvent, EventException, TimeData # Import models
from .protocols import Processor, RawEventData # Import protocol and type alias

logger = logging.getLogger(__name__)

class EventProcessor(Processor): # Inherit from protocol
    """Processes raw Google Calendar event data into a structured format."""

    # No config needed if settings aren't used directly in processing logic
    # def __init__(self, config: Config):
    #     self.config = config

    def _extract_event_base(self, event: RawEventData, calendar_tz: str) -> ProcessedEvent:
        """Extracts common details into a ProcessedEvent, excluding recurrence specifics."""
        start_info: TimeData = event.get("start", {})
        end_info: TimeData = event.get("end", {})

        # Determine time zone: event specific > calendar default
        # Use calendar_tz as fallback
        event_tz = start_info.get("timeZone", calendar_tz)

        # Handle date vs dateTime
        is_all_day = "date" in start_info

        return ProcessedEvent(
            id=event.get("id", "N/A"), # Should ideally always have ID
            title=event.get("summary", "No Title"),
            description=event.get("description", ""),
            location=event.get("location", ""),
            status=event.get("status", "confirmed"),
            start=start_info if start_info else None,
            end=end_info if end_info else None,
            all_day=is_all_day,
            # Store effective timezone if needed, or rely on start/end dicts
            time_zone=event_tz if not is_all_day else None,
            created=event.get("created"),
            updated=event.get("updated"),
            recurrence=event.get("recurrence"), # List of RRULE, EXDATE strings
            # Initialize exceptions based on whether it *could* be a series
            exceptions=None if not event.get("recurrence") else [],
            # Keep original start time only for exceptions, not base event
            original_start_time=event.get("originalStartTime") if event.get("recurringEventId") else None,
            recurring_event_id=event.get("recurringEventId") # Keep for processing step
        )

    def process_events(
        self, raw_events: List[RawEventData], calendar_tz: str
    ) -> List[ProcessedEvent]:
        """
        Processes a list of raw events from the API.
        Identifies recurring series and their exceptions.
        Returns a list of processed event objects.
        """
        processed_event_list: List[ProcessedEvent] = []
        # Temporarily store exceptions keyed by their parent series ID
        exceptions_map: Dict[str, List[EventException]] = defaultdict(list)
        # Keep track of series ProcessedEvent objects to attach exceptions later
        series_event_map: Dict[str, ProcessedEvent] = {}

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
                    instance_id=processed_event.id,
                    original_start_time=processed_event.original_start_time,
                    start=processed_event.start,
                    end=processed_event.end,
                    status=processed_event.status,
                    # Only include overrides if they differ from what would be inherited
                    # This requires fetching the parent event or making assumptions
                    # Simplified: just include current title/desc if present on instance
                    title_override=processed_event.title if event_data.get("summary") else None,
                    description_override=processed_event.description if event_data.get("description") else None,
                )
                exceptions_map[processed_event.recurring_event_id].append(exception_info)
                logger.debug(f"Identified exception for series {processed_event.recurring_event_id}.")
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
        logger.debug(f"Attaching {sum(len(v) for v in exceptions_map.values())} exceptions to series...")
        for series_id, series_obj in series_event_map.items():
            if series_id in exceptions_map:
                # Sort exceptions by original start time for consistency
                sorted_exceptions = sorted(
                    exceptions_map[series_id],
                    key=lambda ex: (ex.original_start_time or {}).get("dateTime") or (ex.original_start_time or {}).get("date") or ""
                )
                # series_obj should be mutable, directly assign
                series_obj.exceptions = sorted_exceptions
                logger.debug(f"Attached {len(sorted_exceptions)} exceptions to series {series_id}.")

        # Clean up internal processing fields if desired (optional)
        for p_event in processed_event_list:
            p_event.recurring_event_id = None # Not needed in final output model
            if not p_event.exceptions: # If it was an exception instance (filtered out) or single event
                 p_event.original_start_time = None # Not needed

        logger.info(f"Processed into {len(processed_event_list)} main events/series.")
        return processed_event_list
```

**8. `src/google_calendar_exporter/output_formatter.py`** (Implement `Formatter` protocol)

```python
# src/google_calendar_exporter/output_formatter.py
"""Output formatter for the Google Calendar exporter."""

import json
import logging
import dataclasses # Import dataclasses for converting models
from typing import Any # Import Any for type hints
from .protocols import Formatter, ExportResult # Import protocol and type alias

logger = logging.getLogger(__name__)

class EnhancedJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle dataclasses."""
    def default(self, o: Any) -> Any:
        if dataclasses.is_dataclass(o):
            # Convert dataclass to dict, handling nested dataclasses
            # Exclude None values for cleaner output (optional)
            return {
                k: v
                for k, v in dataclasses.asdict(o).items()
                if v is not None or k == 'exceptions' # Keep empty exceptions list
            }
        return super().default(o)


class JsonOutputFormatter(Formatter): # Inherit from protocol
    """Formats the processed data into JSON."""

    def format(self, data: ExportResult) -> str:
        """Converts the data dictionary (CalendarName -> List[ProcessedEvent]) to a JSON string."""
        logger.info("Formatting data to JSON...")
        try:
            # Use the enhanced encoder to handle dataclasses
            json_output = json.dumps(data, indent=2, ensure_ascii=False, cls=EnhancedJSONEncoder)
            logger.info("Data successfully formatted to JSON.")
            return json_output
        except TypeError as e:
            logger.error(f"Error serializing data to JSON: {e}")
            raise

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the JSON string to a file."""
        logger.info(f"Saving JSON data to file: {file_path}")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(formatted_data)
            logger.info(f"Successfully saved export to {file_path}")
        except IOError as e:
            logger.error(f"Failed to write JSON to file {file_path}: {e}")
            raise

```

**9. `src/google_calendar_exporter/exporter.py`** (Use injected components, protocols)

```python
# src/google_calendar_exporter/exporter.py
"""Exporter orchestrator for the Google Calendar exporter."""

import logging
from typing import Optional, List, Dict # Import necessary types
from .config import Config # Import Config for type hint
from .protocols import Authenticator, ApiClient, Processor, Formatter, ExportResult, RawCalendarData # Import protocols
from .models import ProcessedEvent # Import model

logger = logging.getLogger(__name__)

class GoogleCalendarExporter:
    """Orchestrates the Google Calendar data export process using dependency injection."""

    def __init__(
        self,
        config: Config,
        auth_manager: Authenticator,
        api_client: ApiClient, # Now expects an object matching the protocol
        event_processor: Processor,
        output_formatter: Formatter,
    ):
        self.config = config
        self.auth_manager = auth_manager
        self.api_client = api_client # Use the injected client directly
        self.event_processor = event_processor
        self.output_formatter = output_formatter
        self.exported_data: ExportResult = {}

    # No longer needed as api_client is initialized externally and injected
    # def _initialize_api_client(self): ...

    def _sort_events(self, events: List[ProcessedEvent]) -> List[ProcessedEvent]:
        """Sorts events chronologically based on start time/date."""
        def sort_key(event: ProcessedEvent) -> str:
            start_data = event.start or {}
            # Prioritize dateTime, fallback to date, then empty string
            return start_data.get("dateTime", start_data.get("date", ""))

        return sorted(events, key=sort_key)


    def _fetch_and_process_calendar_events(self, calendar: RawCalendarData) -> None:
        """Fetches and processes events for a single calendar."""
        calendar_id: str = calendar["id"]
        calendar_name: str = calendar.get("summary", calendar_id) # Use summary, fallback to ID
        calendar_tz: str = calendar.get("timeZone", "UTC") # Default to UTC
        logger.info(f"--- Processing Calendar: {calendar_name} ({calendar_id}) ---")

        try:
            # Use the injected api_client
            raw_events = self.api_client.list_events(calendar_id)
            # Use the injected event_processor
            processed_events = self.event_processor.process_events(raw_events, calendar_tz)

            # Sort events if configured
            if self.config.SORT_EVENTS_BY_START and processed_events:
                logger.debug(f"Sorting {len(processed_events)} events for calendar {calendar_name}...")
                processed_events = self._sort_events(processed_events)

            self.exported_data[calendar_name] = processed_events
            logger.info(f"--- Finished Processing Calendar: {calendar_name} ---")

        except Exception as e:
            logger.error(f"Failed to process calendar {calendar_name} ({calendar_id}): {e}")
            # Add error marker or skip calendar based on desired error handling
            self.exported_data[calendar_name] = [
                 # Create a dummy ProcessedEvent or dict to indicate error
                 # Using a dict here for simplicity, but could be a specific error model
                 {"error": f"Failed to process calendar: {e}"} # type: ignore
            ]

    def export_data(self) -> Optional[str]:
        """Runs the full export process. Returns formatted string or None on failure."""
        logger.info("Starting Google Calendar export process...")
        try:
            # Authentication is handled externally before api_client is created/injected
            # 1. Retrieve Calendar List (using injected api_client)
            calendars = self.api_client.list_calendars()
            if not calendars:
                logger.warning("No calendars found for this user.")
                # Return empty structure formatted
                empty_data: ExportResult = {}
                formatted_empty = self.output_formatter.format(empty_data)
                self.output_formatter.save_to_file(formatted_empty, self.config.OUTPUT_FILE)
                return formatted_empty

            # 2. Fetch and Process Events for Each Calendar
            self.exported_data = {}  # Reset data for this run
            for calendar_data in calendars:
                self._fetch_and_process_calendar_events(calendar_data)

            # 3. Format Output (using injected formatter)
            json_output = self.output_formatter.format(self.exported_data)

            # 4. Save Output (using injected formatter)
            self.output_formatter.save_to_file(json_output, self.config.OUTPUT_FILE)

            logger.info("Google Calendar export process completed successfully.")
            return json_output  # Return the JSON string

        except Exception as e:
            # Log the full traceback for detailed debugging
            logger.exception("An error occurred during the export process.")
            return None  # Indicate failure

```

**10. `src/google_calendar_exporter/main.py`** (Inject dependencies)

```python
# src/google_calendar_exporter/main.py
"""Main entry point for the Google Calendar exporter."""

import logging
import sys
from .config import settings, Config # Import settings instance and Config class
from .auth import GoogleAuthManager
from .api_client import GoogleCalendarApiClient
from .event_processor import EventProcessor
from .output_formatter import JsonOutputFormatter
from .exporter import GoogleCalendarExporter
# Import protocols for type hinting if needed, though concrete classes are used here
# from .protocols import Authenticator, ApiClient, Processor, Formatter

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
# Optionally set levels for specific libraries
logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)
logger = logging.getLogger(__name__)


def setup_dependencies(config: Config) -> GoogleCalendarExporter:
    """Creates and wires up the application components."""
    logger.info("Setting up application dependencies...")

    # --- Authentication ---
    auth_manager = GoogleAuthManager(config)
    # Trigger authentication early to catch issues before creating API client
    try:
        credentials = auth_manager.get_credentials()
        logger.info("Authentication successful, credentials obtained.")
    except Exception as auth_error:
        logger.error(f"Authentication failed: {auth_error}", exc_info=True)
        raise # Re-raise to stop execution

    # --- API Client ---
    # Pass authenticated credentials and config
    api_client = GoogleCalendarApiClient(credentials, config)
    logger.info("API Client initialized.")

    # --- Event Processor ---
    event_processor = EventProcessor() # Doesn't need config currently
    logger.info("Event Processor initialized.")

    # --- Output Formatter (Strategy Pattern) ---
    # Choose the desired formatter strategy
    output_formatter = JsonOutputFormatter()
    logger.info("Output Formatter initialized (JSON).")

    # --- Exporter ---
    # Inject all dependencies
    exporter = GoogleCalendarExporter(
        config=config,
        auth_manager=auth_manager, # Although creds already obtained, might be needed for future ops
        api_client=api_client,
        event_processor=event_processor,
        output_formatter=output_formatter,
    )
    logger.info("Exporter initialized with dependencies.")
    return exporter


def run_export():
    """Initializes dependencies and runs the exporter."""
    logger.info("=============================================")
    logger.info(" Starting Google Calendar Exporter ")
    logger.info("=============================================")
    try:
        # Validate config explicitly at startup
        settings.validate()
        logger.info("Configuration validated.")

        # Create the exporter instance with dependencies wired up
        exporter = setup_dependencies(settings)

        # Run the export process
        exported_json = exporter.export_data()

        if exported_json is not None: # Check for None which indicates failure
            logger.info(f"Export process finished. Output saved to: {settings.OUTPUT_FILE}")
            # Optionally print confirmation or snippet
        else:
            logger.error("Export process failed. Check previous logs for details.")
            sys.exit(1) # Exit with error code

    except FileNotFoundError as e:
         # Specific handling for config file not found during validation
         logger.error(f"Configuration error: {e}")
         sys.exit(1)
    except Exception as e:
        # Catch-all for unexpected errors during setup or export
        logger.exception("An unexpected critical error occurred during execution.")
        sys.exit(1)
    finally:
        logger.info("=============================================")
        logger.info(" Google Calendar Exporter Finished ")
        logger.info("=============================================")


if __name__ == "__main__":
    run_export()

```

This refactored version uses Protocols for interfaces, clearly separates concerns, uses dependency injection, leverages data models, and is better structured according to SOLID principles, making it more maintainable, testable, and extensible.