"""Main entry point for the Google Calendar exporter."""

import logging
import os
from typing import Optional, Tuple

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
    SchemaValidationFormatterWrapper,
    TaskJsonFormatter,
    validate_calendar_events,
    validate_calendar_tasks,
)
from google_calendar_exporter.planning_processor import PlanningProcessor

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
# Optionally set levels for specific libraries
logging.getLogger("googleapiclient.discovery_cache").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)


def setup_dependencies(config: Config, validate_schema: bool = True) -> GoogleCalendarExporter:
    """Creates and wires up the application components.
    
    Args:
        config: Configuration settings
        validate_schema: Whether to validate data against JSON schema
        
    Returns:
        Configured GoogleCalendarExporter instance
    """
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
    
    # If schema validation is enabled, wrap the formatters with validators
    if validate_schema:
        logger.info("Schema validation enabled for output formatters.")
        event_formatter = SchemaValidationFormatterWrapper(
            event_formatter, validate_calendar_events
        )
        task_formatter = SchemaValidationFormatterWrapper(
            task_formatter, validate_calendar_tasks
        )
        # Note: We don't validate planning data as it uses a different format
    
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


def run_export(validate_schema: bool = True) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Initializes dependencies and runs the exporter.
    
    Args:
        validate_schema: Whether to validate output against JSON schema
        
    Returns:
        Tuple of (events_json, tasks_json, planning_json) or (None, None, None) on failure
    """
    console = Console()
    console.print("=============================================")
    console.print(" Starting Google Calendar Exporter ")
    console.print("=============================================")
    logger.info("=============================================")
    logger.info(" Starting Google Calendar Exporter ")
    logger.info("=============================================")
    
    if validate_schema:
        logger.info("Schema validation is ENABLED")
        console.print("[bold]Schema validation:[/bold] [green]ENABLED[/green]")
    else:
        logger.info("Schema validation is DISABLED")
        console.print("[bold]Schema validation:[/bold] [yellow]DISABLED[/yellow]")
        
    try:
        # Validate config explicitly at startup
        try:
            settings.validate()
            logger.info("Configuration validated.")
        except FileNotFoundError as e:
            console.print(f"[bold red]Configuration error:[/bold red] {e}")
            console.print(f"Looking for credentials file at: {settings.CREDENTIALS_FILE}")
            raise

        # Create the exporter instance with dependencies wired up
        exporter = setup_dependencies(settings, validate_schema)

        # Run the export process
        events_json, tasks_json, planning_json = exporter.export_data()

        if (
            events_json is not None and tasks_json is not None and planning_json is not None
        ):  # Check for None which indicates failure
            # Use Rich Panel for success message
            success_message = (
                f"[bold green]✓ Export Successful![/bold green]\n\n"
                f"Events saved to: [cyan]{settings.EVENTS_OUTPUT_FILE}[/cyan]\n"
                f"Tasks saved to: [cyan]{settings.TASKS_OUTPUT_FILE}[/cyan]\n"
                f"Planning data saved to: [cyan]{settings.PLANNING_OUTPUT_FILE}[/cyan]"
            )
            console.print(Panel(success_message, title="Google Calendar Export", expand=False, border_style="green"))
            return events_json, tasks_json, planning_json
        else:
            logger.error("Export process failed. Check previous logs for details.")
            console.print(Panel(
                "[bold red]Export process failed.[/bold red]\nCheck logs for details.",
                title="Google Calendar Export",
                expand=False,
                border_style="red"
            ))
            return None, None, None

    except FileNotFoundError as e:
        # Specific handling for config file not found during validation
        logger.error(f"Configuration error: {e}")
        console.print(Panel(
            f"[bold red]Configuration error:[/bold red] {str(e)}",
            title="Google Calendar Export",
            expand=False,
            border_style="red"
        ))
        return None, None, None
    except Exception as e:
        # Catch-all for unexpected errors during setup or export
        logger.exception("An unexpected critical error occurred during execution.")
        console.print(Panel(
            f"[bold red]Error:[/bold red] {str(e)}",
            title="Google Calendar Export",
            expand=False,
            border_style="red"
        ))
        return None, None, None
    finally:
        console.print("=============================================")
        console.print(" Google Calendar Exporter Finished ")
        console.print("=============================================")
        logger.info("=============================================")
        logger.info(" Google Calendar Exporter Finished ")
        logger.info("=============================================")


if __name__ == "__main__":
    # When run directly, execute with schema validation enabled
    run_export(validate_schema=True)
