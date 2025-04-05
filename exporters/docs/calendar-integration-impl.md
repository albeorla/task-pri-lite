# Calendar Integration Implementation

## Overview

This document outlines the implementation of a calendar integration system using Google Calendar API. The system allows users to export their Google Calendar events to a JSON file.

## Project Structure

The project follows a modular structure with the following key components:

1. `src/google_calendar_exporter/`

**1. Project Setup (Following `python-project-template`)**

* Ensure you have the `python-project-template` structure cloned or set up.
* Create a virtual environment and activate it.
* Install necessary libraries:
    ```bash
    pip install google-api-python-client google-auth-oauthlib google-auth-httplib2 python-dotenv
    ```
* Create a `requirements.txt`:
    ```bash
    pip freeze > requirements.txt
    ```
* Create your `credentials.json` file from Google Cloud Console and place it in the root directory (or configure its path).
* Create a `.env` file based on `.env.example` to specify paths:
    ```dotenv
    # .env
    CREDENTIALS_FILE=credentials.json
    TOKEN_FILE=token.json
    OUTPUT_FILE=google_calendar_export.json
    ```

**2. Core Module Structure (`src/google_calendar_exporter/`)**

We'll create the following files within the `src/google_calendar_exporter/` directory:

* `__init__.py` (empty)
* `config.py`: Handles loading configuration.
* `auth.py`: Manages OAuth 2.0 authentication.
* `api_client.py`: Handles interaction with the Google Calendar API.
* `event_processor.py`: Processes raw event data, handling recurrence.
* `output_formatter.py`: Formats the processed data (e.g., JSON).
* `exporter.py`: Orchestrates the entire export process.
* `models.py`: (Optional but good practice) Define simple data classes for structured data (e.g., ProcessedEvent, ExceptionInfo).
* `main.py`: The main entry point of the application.

**3. Implementation Details**

**`src/google_calendar_exporter/config.py`**

```python
# src/google_calendar_exporter/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration."""

    # OAuth Scopes - Read-only access is sufficient for exporting
    SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

    # File Paths - Load from environment variables with defaults
    CREDENTIALS_FILE = os.getenv('CREDENTIALS_FILE', 'credentials.json')
    TOKEN_FILE = os.getenv('TOKEN_FILE', 'token.json')
    OUTPUT_FILE = os.getenv('OUTPUT_FILE', 'google_calendar_export.json')

    # API Settings
    API_SERVICE_NAME = 'calendar'
    API_VERSION = 'v3'

    # Export Settings (as per blueprint)
    FETCH_SINGLE_EVENTS = False # Fetch recurring series as single items
    FETCH_SHOW_DELETED = True  # Include deleted/cancelled items initially
    SORT_EVENTS_BY_START = True # Sort events chronologically within each calendar

    @classmethod
    def validate(cls):
        """Validate that essential configuration files exist."""
        if not os.path.exists(cls.CREDENTIALS_FILE):
            raise FileNotFoundError(
                f"Credentials file not found at: {cls.CREDENTIALS_FILE}. "
                "Please download it from Google Cloud Console and place it correctly "
                "or set the CREDENTIALS_FILE environment variable."
            )

# Instantiate config for easy import elsewhere
settings = Config()
settings.validate() # Validate paths on import
```

**`src/google_calendar_exporter/auth.py`**

```python
# src/google_calendar_exporter/auth.py
import os.path
import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from .config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class GoogleAuthManager:
    """Handles Google OAuth 2.0 authentication and credential management."""

    def __init__(self, config=settings):
        self.config = config
        self.credentials = None

    def _load_token(self):
        """Loads existing token from file if it exists."""
        if os.path.exists(self.config.TOKEN_FILE):
            try:
                self.credentials = Credentials.from_authorized_user_file(
                    self.config.TOKEN_FILE, self.config.SCOPES
                )
                logging.info("Loaded credentials from token file.")
            except Exception as e:
                logging.warning(f"Could not load token file: {e}. Will re-authenticate.")
                self.credentials = None

    def _save_token(self):
        """Saves the current credentials (including refresh token) to file."""
        if self.credentials:
            try:
                with open(self.config.TOKEN_FILE, 'w') as token_file:
                    token_file.write(self.credentials.to_json())
                logging.info(f"Credentials saved to {self.config.TOKEN_FILE}")
            except IOError as e:
                logging.error(f"Failed to save token file: {e}")

    def _refresh_token(self):
        """Refreshes the access token using the refresh token."""
        if self.credentials and self.credentials.expired and self.credentials.refresh_token:
            logging.info("Credentials expired. Refreshing token...")
            try:
                self.credentials.refresh(Request())
                logging.info("Token refreshed successfully.")
                self._save_token() # Save the updated token
                return True
            except Exception as e:
                logging.error(f"Failed to refresh token: {e}")
                # Invalidate credentials if refresh fails
                self.credentials = None
                # Optionally delete the invalid token file
                if os.path.exists(self.config.TOKEN_FILE):
                    try:
                        os.remove(self.config.TOKEN_FILE)
                        logging.info(f"Removed invalid token file: {self.config.TOKEN_FILE}")
                    except OSError as remove_err:
                        logging.error(f"Error removing invalid token file: {remove_err}")
                return False
        return True # Return True if no refresh was needed or possible

    def _run_auth_flow(self):
        """Runs the installed application OAuth flow to get new credentials."""
        logging.info("No valid credentials found or refresh failed. Starting authentication flow...")
        try:
            flow = InstalledAppFlow.from_client_secrets_file(
                self.config.CREDENTIALS_FILE, self.config.SCOPES
            )
            # Request offline access to get a refresh token
            flow.authorization_url(access_type='offline', include_granted_scopes='true')
            # run_local_server will open a browser tab for user authorization
            self.credentials = flow.run_local_server(port=0)
            logging.info("Authentication successful.")
            self._save_token()
        except FileNotFoundError:
            logging.error(f"Credentials file not found at: {self.config.CREDENTIALS_FILE}")
            raise # Re-raise the exception to halt execution
        except Exception as e:
            logging.error(f"Authentication flow failed: {e}")
            raise # Re-raise for clarity

    def authenticate(self):
        """Authenticates the user, loading, refreshing, or running the auth flow."""
        self._load_token()

        if not self.credentials or not self.credentials.valid:
            if not self._refresh_token(): # If refresh failed
                self._run_auth_flow() # Try full auth flow
            elif not self.credentials: # If no credentials after trying refresh (e.g., no initial token)
                 self._run_auth_flow()

        if not self.credentials or not self.credentials.valid:
            raise RuntimeError("Failed to obtain valid Google API credentials.")

        logging.info("Authentication check complete. Credentials are valid.")
        return self.credentials

    def get_credentials(self):
        """Returns the valid credentials, performing authentication if needed."""
        if not self.credentials or not self.credentials.valid:
            return self.authenticate()
        # Check expiry and refresh if needed before returning
        if self.credentials.expired and self.credentials.refresh_token:
             if not self._refresh_token():
                 # If refresh fails again right before use, force re-auth
                 return self.authenticate()
        return self.credentials
```

**`src/google_calendar_exporter/api_client.py`**

```python
# src/google_calendar_exporter/api_client.py
import logging
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from .config import settings

class GoogleCalendarApiClient:
    """Handles communication with the Google Calendar API."""

    def __init__(self, credentials):
        self.credentials = credentials
        self.service = None
        self._build_service()

    def _build_service(self):
        """Builds the Google Calendar API service object."""
        try:
            self.service = build(
                settings.API_SERVICE_NAME,
                settings.API_VERSION,
                credentials=self.credentials,
                cache_discovery=False # Avoid potential discovery cache issues
            )
            logging.info("Google Calendar API service built successfully.")
        except Exception as e:
            logging.error(f"Failed to build Google Calendar API service: {e}")
            raise

    def list_calendars(self):
        """Fetches the list of user's calendars."""
        logging.info("Fetching calendar list...")
        try:
            calendar_list_result = self.service.calendarList().list().execute()
            calendars = calendar_list_result.get('items', [])
            logging.info(f"Found {len(calendars)} calendars.")
            return calendars
        except HttpError as error:
            logging.error(f"An API error occurred while fetching calendars: {error}")
            # Handle specific errors if necessary (e.g., 403 permission denied)
            raise
        except Exception as e:
            logging.error(f"An unexpected error occurred fetching calendars: {e}")
            raise


    def list_events(self, calendar_id):
        """Fetches all events for a specific calendar, handling pagination."""
        logging.info(f"Fetching events for calendar ID: {calendar_id}...")
        all_events = []
        page_token = None
        while True:
            try:
                events_result = self.service.events().list(
                    calendarId=calendar_id,
                    singleEvents=settings.FETCH_SINGLE_EVENTS,
                    showDeleted=settings.FETCH_SHOW_DELETED,
                    maxResults=2500, # Max allowed page size
                    pageToken=page_token
                ).execute()

                events = events_result.get('items', [])
                all_events.extend(events)
                logging.debug(f"Fetched {len(events)} events page for calendar {calendar_id}.")

                page_token = events_result.get('nextPageToken')
                if not page_token:
                    break # Exit loop when no more pages

            except HttpError as error:
                logging.error(f"An API error occurred fetching events for {calendar_id}: {error}")
                # Consider retry logic or partial data return based on requirements
                raise # Or return partial data: return all_events
            except Exception as e:
                logging.error(f"An unexpected error occurred fetching events for {calendar_id}: {e}")
                raise # Or return partial data: return all_events


        logging.info(f"Fetched a total of {len(all_events)} events for calendar ID: {calendar_id}.")
        return all_events
```

**`src/google_calendar_exporter/event_processor.py`**

```python
# src/google_calendar_exporter/event_processor.py
import logging
from collections import defaultdict

class EventProcessor:
    """Processes raw Google Calendar event data into a structured format."""

    def __init__(self, config=settings):
        self.config = config

    def _extract_event_details(self, event, calendar_tz):
        """Extracts relevant details from a single raw event dictionary."""
        start_info = event.get('start', {})
        end_info = event.get('end', {})

        # Determine time zone: event specific > calendar default
        event_tz = start_info.get('timeZone', calendar_tz)

        # Handle date vs dateTime
        start_time = start_info.get('dateTime', start_info.get('date'))
        end_time = end_info.get('dateTime', end_info.get('date'))
        is_all_day = 'date' in start_info # Check if 'date' key exists

        return {
            "id": event.get('id'),
            "title": event.get('summary', 'No Title'),
            "description": event.get('description', ''),
            "location": event.get('location', ''),
            "status": event.get('status', 'confirmed'), # e.g., confirmed, tentative, cancelled
            "start": start_time,
            "end": end_time,
            "all_day": is_all_day,
            "timeZone": event_tz if not is_all_day else None, # No specific TZ needed for all-day
            "created": event.get('created'),
            "updated": event.get('updated'),
            "recurrence": event.get('recurrence'), # List of RRULE, EXDATE strings
            "recurringEventId": event.get('recurringEventId'), # ID of parent series if this is an instance/exception
            "originalStartTime": event.get('originalStartTime'), # Original start if instance/exception
            # Add other fields as needed: attendees, colorId, reminders, etc.
        }

    def process_events(self, raw_events, calendar_tz):
        """
        Processes a list of raw events from the API.
        Identifies recurring series and their exceptions.
        Returns a list of processed event objects.
        """
        processed_events = []
        # Temporarily store exceptions keyed by their parent series ID
        exceptions_map = defaultdict(list)
        # Keep track of seen series IDs to add exceptions later
        series_event_map = {}

        logging.debug(f"Processing {len(raw_events)} raw events for calendar with TZ {calendar_tz}.")

        for event in raw_events:
            # Skip events without an ID if they somehow occur
            if not event.get('id'):
                 logging.warning(f"Skipping event without ID: {event.get('summary', 'N/A')}")
                 continue

            processed_event = self._extract_event_details(event, calendar_tz)

            # Check if it's an exception/instance of a recurring event
            if processed_event['recurringEventId']:
                exception_info = {
                    "instance_id": processed_event['id'], # ID of this specific instance
                    "originalStartTime": processed_event['originalStartTime'],
                    "start": processed_event['start'],
                    "end": processed_event['end'],
                    "status": processed_event['status'], # Important for cancellations
                    # Include other modified fields if necessary (title, description...)
                    "title_override": processed_event['title'] if event.get('summary') else None,
                    "description_override": processed_event['description'] if event.get('description') else None,
                }
                exceptions_map[processed_event['recurringEventId']].append(exception_info)
                # We don't add exceptions directly to the main list; they'll be nested
                logging.debug(f"Identified exception for series {processed_event['recurringEventId']}.")

            # Check if it's the definition of a recurring series
            elif processed_event['recurrence']:
                 # This is the main series definition
                processed_event["exceptions"] = [] # Add placeholder for exceptions
                processed_events.append(processed_event)
                series_event_map[processed_event['id']] = processed_event # Store reference to attach exceptions later
                logging.debug(f"Identified recurring series: {processed_event['id']}")

            # Otherwise, it's a single, non-recurring event
            else:
                processed_event["exceptions"] = None # Indicate it's not a series
                processed_events.append(processed_event)
                logging.debug(f"Identified single event: {processed_event['id']}")

        # Attach collected exceptions to their respective series
        logging.debug(f"Attaching {sum(len(v) for v in exceptions_map.values())} exceptions to series...")
        for series_id, series_event in series_event_map.items():
            if series_id in exceptions_map:
                # Sort exceptions by original start time for consistency
                sorted_exceptions = sorted(
                    exceptions_map[series_id],
                    key=lambda ex: ex.get('originalStartTime', {}).get('dateTime') or ex.get('originalStartTime', {}).get('date') or ''
                )
                series_event["exceptions"] = sorted_exceptions
                logging.debug(f"Attached {len(sorted_exceptions)} exceptions to series {series_id}.")

        # Optional: Filter out cancelled *single* events if showDeleted was True but they aren't needed
        # final_events = [e for e in processed_events if e['status'] != 'cancelled' or e['recurrence']]
        # Or keep cancelled events and let the consumer decide. Sticking with blueprint: keep them for now.

        logging.info(f"Processed {len(processed_events)} main events/series.")
        return processed_events
```

**`src/google_calendar_exporter/output_formatter.py`**

```python
# src/google_calendar_exporter/output_formatter.py
import json
import logging

class JsonOutputFormatter:
    """Formats the processed data into JSON."""

    def format(self, data):
        """Converts the data dictionary to a JSON string."""
        logging.info("Formatting data to JSON...")
        try:
            # Use indent for readability
            json_output = json.dumps(data, indent=2, ensure_ascii=False)
            logging.info("Data successfully formatted to JSON.")
            return json_output
        except TypeError as e:
            logging.error(f"Error serializing data to JSON: {e}")
            # Consider logging problematic data structure here
            raise

    def save_to_file(self, json_data, file_path):
        """Saves the JSON string to a file."""
        logging.info(f"Saving JSON data to file: {file_path}")
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(json_data)
            logging.info(f"Successfully saved export to {file_path}")
        except IOError as e:
            logging.error(f"Failed to write JSON to file {file_path}: {e}")
            raise
```

**`src/google_calendar_exporter/exporter.py`**

```python
# src/google_calendar_exporter/exporter.py
import logging
from .config import settings
from .auth import GoogleAuthManager
from .api_client import GoogleCalendarApiClient
from .event_processor import EventProcessor
from .output_formatter import JsonOutputFormatter

class GoogleCalendarExporter:
    """Orchestrates the Google Calendar data export process."""

    def __init__(self, config=settings):
        self.config = config
        # Dependency Injection: Create instances of the components
        self.auth_manager = GoogleAuthManager(config)
        # Pass credentials obtained from auth_manager to api_client
        self.api_client = None # Will be initialized after authentication
        self.event_processor = EventProcessor(config)
        self.output_formatter = JsonOutputFormatter()
        self.exported_data = {}

    def _initialize_api_client(self):
        """Initializes the API client after successful authentication."""
        credentials = self.auth_manager.get_credentials()
        self.api_client = GoogleCalendarApiClient(credentials)

    def _fetch_and_process_calendar_events(self, calendar):
        """Fetches and processes events for a single calendar."""
        calendar_id = calendar['id']
        calendar_name = calendar.get('summary', calendar_id) # Use summary as name, fallback to ID
        calendar_tz = calendar.get('timeZone', 'UTC') # Default to UTC if not specified
        logging.info(f"--- Processing Calendar: {calendar_name} ({calendar_id}) ---")

        try:
            raw_events = self.api_client.list_events(calendar_id)
            processed_events = self.event_processor.process_events(raw_events, calendar_tz)

            # Sort events if configured
            if self.config.SORT_EVENTS_BY_START:
                logging.debug(f"Sorting {len(processed_events)} events for calendar {calendar_name}...")
                processed_events.sort(
                     key=lambda event: event.get('start') or '', # Handle missing start key gracefully
                     # Use appropriate key based on whether it's date or dateTime
                     # This simple sort might need refinement for mixed date/dateTime cases if strict order is vital
                     # A more robust key: lambda e: (e.get('start') or {}).get('dateTime', (e.get('start') or {}).get('date', ''))
                 )


            self.exported_data[calendar_name] = processed_events
            logging.info(f"--- Finished Processing Calendar: {calendar_name} ---")

        except Exception as e:
            logging.error(f"Failed to process calendar {calendar_name} ({calendar_id}): {e}")
            # Decide whether to skip this calendar or halt the export
            self.exported_data[calendar_name] = {"error": f"Failed to process: {e}"} # Add error marker

    def export_data(self):
        """Runs the full export process."""
        logging.info("Starting Google Calendar export process...")
        try:
            # 1. Authenticate and Initialize API Client
            self._initialize_api_client() # Handles auth flow if needed

            # 2. Retrieve Calendar List
            calendars = self.api_client.list_calendars()
            if not calendars:
                logging.warning("No calendars found for this user.")
                return None # Or return empty structure

            # 3. Fetch and Process Events for Each Calendar
            self.exported_data = {} # Reset data for this run
            for calendar in calendars:
                self._fetch_and_process_calendar_events(calendar)

            # 4. Format Output
            json_output = self.output_formatter.format(self.exported_data)

            # 5. Save Output
            self.output_formatter.save_to_file(json_output, self.config.OUTPUT_FILE)

            logging.info("Google Calendar export process completed successfully.")
            return json_output # Return the JSON string as well

        except Exception as e:
            logging.exception("An error occurred during the export process.") # Log full traceback
            return None # Indicate failure
```

**`src/google_calendar_exporter/main.py`**

```python
# src/google_calendar_exporter/main.py
import logging
import sys
from .exporter import GoogleCalendarExporter
from .config import settings # Import settings to ensure validation runs

# Configure logging for the main script entry point
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def run_export():
    """Initializes and runs the exporter."""
    logging.info("=============================================")
    logging.info(" Starting Google Calendar Exporter ")
    logging.info("=============================================")
    try:
        exporter = GoogleCalendarExporter()
        exported_json = exporter.export_data()

        if exported_json:
            logging.info(f"Export saved to: {settings.OUTPUT_FILE}")
            # Optionally print a snippet or confirmation
            # print("\nExport successful. Sample data snippet:")
            # print(exported_json[:500] + "...") # Print first 500 chars
        else:
            logging.error("Export process failed. Check logs for details.")
            sys.exit(1) # Exit with error code

    except FileNotFoundError as e:
         logging.error(f"Configuration error: {e}")
         sys.exit(1)
    except Exception as e:
        logging.exception("An unexpected critical error occurred.") # Log full traceback
        sys.exit(1)

if __name__ == "__main__":
    run_export()
```

**4. Running the Exporter**

From your project's root directory (where `src`, `tests`, etc. are):

```bash
python -m src.google_calendar_exporter.main
```

The first time you run it, it should:

1.  Detect no `token.json` exists.
2.  Open a web browser asking you to log in to your Google account.
3.  Ask you to grant the application "View your calendars" permission (based on the `calendar.readonly` scope).
4.  Once authorized, it will save `token.json`.
5.  Proceed to fetch calendars and events.
6.  Save the output to `google_calendar_export.json` (or the path specified in `.env`).

Subsequent runs should use the `token.json` and refresh the access token automatically if needed, without requiring browser interaction unless the refresh token is revoked or invalid.

**5. Key Design Choices & SOLID Principles**

* **Single Responsibility Principle (SRP):** Each class has a clear purpose: `GoogleAuthManager` for auth, `GoogleCalendarApiClient` for API calls, `EventProcessor` for data transformation, `JsonOutputFormatter` for output, `GoogleCalendarExporter` for orchestration, `Config` for settings.
* **Open/Closed Principle (OCP):** The system is open for extension (e.g., adding a `CsvOutputFormatter`) but closed for modification (core classes like `api_client` don't need changes to support new output formats).
* **Liskov Substitution Principle (LSP):** While less apparent without inheritance hierarchies here, interfaces are implicitly defined by how classes are used. For example, any object passed as `credentials` to `GoogleCalendarApiClient` should behave like Google's `Credentials` object.
* **Interface Segregation Principle (ISP):** Not strongly applicable here due to the lack of explicit interfaces, but the focused nature of each class prevents "fat" interfaces.
* **Dependency Inversion Principle (DIP):** High-level modules (`GoogleCalendarExporter`) depend on abstractions (the roles fulfilled by `GoogleAuthManager`, `GoogleCalendarApiClient`, etc.) rather than concrete implementations directly. Dependencies are injected (e.g., `credentials` into `GoogleCalendarApiClient`, components into `GoogleCalendarExporter` although created internally in this example for simplicity – could be injected from `main.py` for stricter DI). Configuration is centralized in `Config`.

This structure provides a solid foundation that aligns with the technical blueprint and good software design practices.