"""API client for the Google Calendar exporter."""

import logging
from typing import Any  # Import necessary types

from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import Resource, build  # Import Resource for type hint
from googleapiclient.errors import HttpError

from .config import Config  # Import Config for settings access
from .protocols import ApiClient, RawCalendarData, RawEventData  # Import protocol and type aliases

logger = logging.getLogger(__name__)


class GoogleCalendarApiClient(ApiClient):  # Inherit from protocol
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

    def list_calendars(self) -> list[RawCalendarData]:
        """Fetches the list of user's calendars."""
        logger.info("Fetching calendar list...")
        try:
            # Use type hint provided by googleapiclient stubs if available, otherwise Dict
            calendar_list_result: dict[str, Any] = self.service.calendarList().list().execute()
            calendars: list[RawCalendarData] = calendar_list_result.get("items", [])
            logger.info(f"Found {len(calendars)} calendars.")
            return calendars
        except HttpError as error:
            logger.error(f"An API error occurred while fetching calendars: {error}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred fetching calendars: {e}")
            raise

    def list_events(self, calendar_id: str) -> list[RawEventData]:
        """Fetches all events for a specific calendar, handling pagination."""
        logger.info(f"Fetching events for calendar ID: {calendar_id}...")
        all_events: list[RawEventData] = []
        page_token: str | None = None  # Use Optional type hint
        while True:
            try:
                events_result: dict[str, Any] = (
                    self.service.events()
                    .list(
                        calendarId=calendar_id,
                        singleEvents=self.config.FETCH_SINGLE_EVENTS,
                        showDeleted=self.config.FETCH_SHOW_DELETED,
                        maxResults=2500,  # Max allowed page size
                        pageToken=page_token,
                    )
                    .execute()
                )

                events: list[RawEventData] = events_result.get("items", [])
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
