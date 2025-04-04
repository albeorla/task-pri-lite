"""Command-line interface for the Planning Data exporter."""

import os
import sys

import click
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

from todoist_data_exporter.application.services import (
    TodoistDataService,
    TodoistExportService,
)
from todoist_data_exporter.domain.interfaces import TodoistRepository
from todoist_data_exporter.domain.interfaces.repository import (
    TodoistData as PlanningData,  # Keep alias for now
)
from todoist_data_exporter.infrastructure.api.planning_client import PlanningClient
from todoist_data_exporter.infrastructure.repositories.file_repository import FileRepository
from todoist_data_exporter.infrastructure.repositories.planning_repository import (
    PlanningApiRepository,
)

# Load environment variables from .env file
load_dotenv()

console = Console()


@click.group()
def cli() -> None:
    """Planning Data Exporter - Export planning data in various formats."""
    pass


# Define a class to hold export options to avoid too many function parameters
class ExportOptions:
    """Options for exporting data."""

    def __init__(
        self,
        api_token: str | None = None,
        output: str = os.getenv("DEFAULT_OUTPUT_PATH", "./output/planning_export.json"),
        format_type: str = os.getenv("DEFAULT_FORMAT", "json"),
        structure: str = os.getenv("DEFAULT_STRUCTURE", "hierarchical"),
        input_file: str | None = None,
        project_id: str | None = None,
    ) -> None:
        """Initialize export options.

        Args:
            api_token: Todoist API token
            output: Output file path
            format_type: Output format type
            structure: Data structure
            input_file: Input JSON file
            project_id: Project ID to export
        """
        self.api_token = api_token
        self.output = output
        self.format_type = format_type
        self.structure = structure
        self.input_file = input_file
        self.project_id = project_id


@cli.command()
@click.option(
    "--api-token",
    envvar="TODOIST_API_TOKEN",
    help="Todoist API token (can also be set via TODOIST_API_TOKEN environment variable)",
)
@click.option(
    "--output",
    "-o",
    default=os.getenv("DEFAULT_OUTPUT_PATH", "./output/planning_export.json"),
    help="Output file path (default: from .env or ./output/planning_export.json)",
)
@click.option(
    "--format",
    "-f",
    "format_type",
    type=click.Choice(["json", "markdown", "csv"]),
    default=os.getenv("DEFAULT_FORMAT", "json"),
    help="Output format (default: from .env or json)",
)
@click.option(
    "--structure",
    "-s",
    type=click.Choice(["hierarchical", "flat"]),
    default=os.getenv("DEFAULT_STRUCTURE", "hierarchical"),
    help="Data structure (default: from .env or hierarchical)",
)
@click.option(
    "--input-file",
    "-i",
    help="Input JSON file (instead of using the API)",
)
@click.option(
    "--project-id",
    "-p",
    help="Export only a specific project by ID",
)
def export(
    api_token: str | None,
    output: str,
    format_type: str,
    structure: str,
    input_file: str | None,
    project_id: str | None,
) -> None:
    """Export planning data to a file."""
    # Create options object to reduce function complexity
    options = ExportOptions(
        api_token=api_token,
        output=output,
        format_type=format_type,
        structure=structure,
        input_file=input_file,
        project_id=project_id,
    )

    # Call the implementation function
    _export_implementation(options)


def _export_implementation(options: ExportOptions) -> None:
    """Implementation of the export command.

    Args:
        options: Export options
    """
    try:
        # Determine repository based on input
        repository: TodoistRepository
        if options.input_file:
            console.print(f"Loading data from file: {options.input_file}")
            if not os.path.exists(options.input_file):
                raise FileNotFoundError(f"Input file not found: {options.input_file}")
            repository = FileRepository(options.input_file)
        elif options.api_token:
            console.print("Fetching data from Todoist API...")
            client = PlanningClient(api_token=options.api_token)
            repository = PlanningApiRepository(api_client=client)
        else:
            raise click.UsageError("Either --api-token or --input-file must be provided.")

        # Create services
        data_service = TodoistDataService(repository)
        export_service = TodoistExportService()

        # Get data
        data: PlanningData
        if options.structure == "hierarchical":
            console.print("Formatting data in hierarchical structure...")
            data = data_service.get_hierarchical_data()
            # Debug: Print the formatted data structure
            console.print(f"Formatted data has {len(data.get('projects', []))} projects")
            if "metadata" in data:
                console.print("Formatted data has metadata")
        else:
            console.print("Formatting data in flat structure...")
            data = data_service.get_flat_data()
            # Debug: Print the formatted data structure
            console.print(f"Formatted data has {len(data.get('projects', []))} projects")
            console.print(f"Formatted data has {len(data.get('tasks', []))} tasks")
            if "metadata" in data:
                console.print("Formatted data has metadata")

        # Filter by project ID if specified
        if options.project_id:
            console.print(f"Filtering data for project ID: {options.project_id}")
            projects = data.get("projects", [])
            filtered_projects = [p for p in projects if p.get("id") == options.project_id]
            if filtered_projects:
                data["projects"] = filtered_projects
                console.print(f"Found project with ID {options.project_id}")
            else:
                console.print(f"Warning: No project found with ID {options.project_id}")

        # Export data
        console.print(f"Exporting data to {options.format_type} format...")
        export_service.export_data(data, options.output, options.format_type)

        console.print(
            Panel.fit(
                f"Data exported successfully to: {options.output}",
                title="Success",
                border_style="green",
            )
        )

    except Exception as e:
        console.print(
            Panel.fit(
                f"Error: {e!s}",
                title="Error",
                border_style="red",
            )
        )
        sys.exit(1)


@cli.command()
@click.option(
    "--api-token",
    envvar="TODOIST_API_TOKEN",
    help="Todoist API token (can also be set via TODOIST_API_TOKEN environment variable)",
    required=True,
)
@click.option(
    "--output",
    "-o",
    default=os.getenv("DEFAULT_OUTPUT_PATH", "./output/planning_backup.json"),
    help="Output file path (default: from .env or ./output/planning_backup.json)",
)
def backup(api_token: str, output: str) -> None:
    """Backup all planning data to a JSON file."""
    try:
        console.print("Fetching data from Todoist API in parallel...")
        client = PlanningClient(api_token)
        repository = PlanningApiRepository(api_client=client)

        # Get all data
        data = repository.get_all_data()

        # Save data
        repository.save_data(data, output)

        console.print(
            Panel.fit(
                f"Data backed up successfully to: {output}",
                title="Success",
                border_style="green",
            )
        )

    except Exception as e:
        console.print(
            Panel.fit(
                f"Error: {e!s}",
                title="Error",
                border_style="red",
            )
        )
        sys.exit(1)


def main() -> None:
    """Entry point for the CLI."""
    cli()
