"""Main entry point for the Google Calendar exporter."""

import logging

from rich.console import Console
from rich.panel import Panel

from google_calendar_exporter.api_client import GoogleCalendarApiClient

# Import settings instance and Config class
from google_calendar_exporter.auth import GoogleAuthManager
from google_calendar_exporter.config import (
    Config,
    settings,
)
from google_calendar_exporter.event_processor import EventProcessor
from google_calendar_exporter.exporter import GoogleCalendarExporter
from google_calendar_exporter.formatters import (
    EventJsonFormatter,
    PlanningJsonFormatter,
    TaskJsonFormatter,
)
from google_calendar_exporter.planning_processor import PlanningProcessor

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
# Optionally set levels for specific libraries
logging.getLogger("googleapiclient.discovery_cache").setLevel(logging.ERROR)
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
        raise  # Re-raise to stop execution

    # --- API Client ---
    # Pass authenticated credentials and config
    api_client = GoogleCalendarApiClient(credentials, config)
    logger.info("API Client initialized.")

    # --- Event Processor ---
    event_processor = EventProcessor()  # Doesn't need config currently
    logger.info("Event Processor initialized.")

    # --- Output Formatters (Strategy Pattern) ---
    # Create formatters for events and tasks
    event_formatter = EventJsonFormatter()
    task_formatter = TaskJsonFormatter()
    planning_formatter = PlanningJsonFormatter()
    logger.info("Output Formatters initialized (JSON).")

    # --- Planning Processor ---
    planning_processor = PlanningProcessor()
    logger.info("Planning Processor initialized.")

    # --- Exporter ---
    # Inject all dependencies
    exporter = GoogleCalendarExporter(
        config=config,
        auth_manager=auth_manager,  # Although creds already obtained, might be needed for future ops
        api_client=api_client,
        event_processor=event_processor,
        event_formatter=event_formatter,
        task_formatter=task_formatter,
        planning_processor=planning_processor,
        planning_formatter=planning_formatter,
    )
    logger.info("Exporter initialized with dependencies.")
    return exporter


def run_export():
    """Initializes dependencies and runs the exporter."""
    print("=============================================")
    print(" Starting Google Calendar Exporter ")
    print("=============================================")
    logger.info("=============================================")
    logger.info(" Starting Google Calendar Exporter ")
    logger.info("=============================================")
    try:
        # Validate config explicitly at startup
        try:
            settings.validate()
            print("Configuration validated.")
            logger.info("Configuration validated.")
        except FileNotFoundError as e:
            print(f"Configuration error: {e}")
            print(f"Looking for credentials file at: {settings.CREDENTIALS_FILE}")
            raise

        # Create the exporter instance with dependencies wired up
        exporter = setup_dependencies(settings)

        # Run the export process
        events_json, tasks_json, planning_json = exporter.export_data()

        if (
            events_json is not None and tasks_json is not None and planning_json is not None
        ):  # Check for None which indicates failure
            # logger.info("Export process finished successfully.")
            # logger.info(f"Events output saved to: {settings.EVENTS_OUTPUT_FILE}")
            # logger.info(f"Tasks output saved to: {settings.TASKS_OUTPUT_FILE}")
            # logger.info(f"Planning data saved to: {settings.PLANNING_OUTPUT_FILE}")

            # Use Rich Panel for success message
            console = Console()
            success_message = (
                f"[bold green]✓ Export Successful![/bold green]\n\n"
                f"Events saved to: [cyan]{settings.EVENTS_OUTPUT_FILE}[/cyan]\n"
                f"Tasks saved to: [cyan]{settings.TASKS_OUTPUT_FILE}[/cyan]\n"
                f"Planning data saved to: [cyan]{settings.PLANNING_OUTPUT_FILE}[/cyan]"
            )
            console.print(Panel(success_message, title="Google Calendar Export", expand=False, border_style="green"))
        else:
            logger.error("Export process failed. Check previous logs for details.")
            raise RuntimeError(
                "Export process failed. Check logs for details."
            )  # Raise exception instead of exiting

    except FileNotFoundError as e:
        # Specific handling for config file not found during validation
        logger.error(f"Configuration error: {e}")
        raise  # Re-raise the exception to be caught by the CLI
    except Exception:
        # Catch-all for unexpected errors during setup or export
        logger.exception("An unexpected critical error occurred during execution.")
        raise  # Re-raise the exception to be caught by the CLI
    finally:
        print("=============================================")
        print(" Google Calendar Exporter Finished ")
        print("=============================================")
        logger.info("=============================================")
        logger.info(" Google Calendar Exporter Finished ")
        logger.info("=============================================")


if __name__ == "__main__":
    run_export()
