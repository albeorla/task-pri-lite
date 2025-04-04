"""Configuration for the Google Calendar exporter."""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # OAuth Scopes - Read-only access is sufficient for exporting
    SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

    # File Paths - Load from environment variables with defaults
    CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "bin/google-client-secret.json")
    TOKEN_FILE = os.getenv("GOOGLE_TOKEN_FILE", "bin/google-token.json")

    # Output Files
    EVENTS_OUTPUT_FILE = os.getenv("GOOGLE_EVENTS_OUTPUT_FILE", "output/calendar_events.json")
    TASKS_OUTPUT_FILE = os.getenv("GOOGLE_TASKS_OUTPUT_FILE", "output/calendar_tasks.json")
    PLANNING_OUTPUT_FILE = os.getenv("GOOGLE_PLANNING_OUTPUT_FILE", "output/calendar_planning.json")

    # For backward compatibility
    OUTPUT_FILE = EVENTS_OUTPUT_FILE

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
