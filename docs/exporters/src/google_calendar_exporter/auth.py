"""Authentication for the Google Calendar exporter."""

import logging
import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from .config import Config  # Import Config class directly
from .protocols import Authenticator  # Import the protocol

# Setup logger for this module
logger = logging.getLogger(__name__)


class GoogleAuthManager(Authenticator):  # Inherit from protocol (optional but good practice)
    """Handles Google OAuth 2.0 authentication and credential management."""

    def __init__(self, config: Config):
        # Store the config object
        self.config = config
        self.credentials: Credentials | None = None  # Use Optional type hint

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
            except OSError as e:
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
        if self.credentials:  # Check added for type narrowing
            logger.debug("Returning valid credentials.")
            return self.credentials
        else:
            # This state should ideally not be reached due to the exception in _ensure_valid_credentials
            logger.error("Credentials object is unexpectedly None after validation.")
            raise RuntimeError("Credentials are None after validation check.")
