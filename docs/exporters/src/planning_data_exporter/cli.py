"""Command-line interface for the Planning Data Exporter."""

import shutil
import subprocess
import sys

import click
from rich.console import Console

console = Console()


# Import the exporters dynamically to avoid import errors
def import_todoist_export():
    try:
        from todoist_data_exporter.cli import main as todoist_export
        return todoist_export
    except ImportError as e:
        console.print(f"[bold red]Error importing Todoist exporter: {e}[/bold red]")
        return None


def import_gcal_export():
    try:
        from google_calendar_exporter.main import run_export as gcal_export
        return gcal_export
    except ImportError as e:
        console.print(f"[bold red]Error importing Google Calendar exporter: {e}[/bold red]")
        return None


def run_todoist_export() -> bool:
    """Run the Todoist exporter using subprocess."""
    console.print("[bold blue]Running Todoist Exporter...[/bold blue]")
    todoist_cmd = shutil.which("todoist-export")
    if not todoist_cmd:
        console.print("[bold red]Error: 'todoist-export' command not found in PATH.[/bold red]")
        return False
    try:
        # Run the command with the 'export' subcommand.
        # Check=True raises CalledProcessError for non-zero exit codes.
        # text=True decodes stdout/stderr as strings.
        result = subprocess.run([todoist_cmd, "export"], check=True, text=True)
        console.print("[green]Todoist export completed successfully![/green]")
        return True
    except subprocess.CalledProcessError as e:
        console.print(f"[bold red]Error running Todoist exporter: Command failed with exit code {e.returncode}[/bold red]")
        console.print(f"[red]stdout:\n{e.stdout}[/red]")
        console.print(f"[red]stderr:\n{e.stderr}[/red]")
        return False
    except Exception as e:
        console.print(f"[bold red]An unexpected error occurred running Todoist exporter: {e}[/bold red]")
        return False


def run_gcal_export() -> bool:
    """Run the Google Calendar exporter using subprocess."""
    console.print("[bold green]Running Google Calendar Exporter...[/bold green]")
    gcal_cmd = shutil.which("gcal-export")
    if not gcal_cmd:
        console.print("[bold red]Error: 'gcal-export' command not found in PATH.[/bold red]")
        return False
    try:
        # Don't capture output for gcal as it might need user interaction for OAuth
        result = subprocess.run([gcal_cmd], check=True, text=True)
        # Add back the success message for consistency with the Todoist pattern.
        console.print("[bold green]Google Calendar export completed successfully![/bold green]")
        return True
    except subprocess.CalledProcessError as e:
        # If gcal-export prints its own errors, stderr might be captured here if capture_output was True
        console.print(f"[bold red]Error running Google Calendar exporter: Command failed with exit code {e.returncode}[/bold red]")
        # If output wasn't captured, e.stdout and e.stderr will be None
        if e.stdout: console.print(f"[red]stdout:\n{e.stdout}[/red]")
        if e.stderr: console.print(f"[red]stderr:\n{e.stderr}[/red]")
        return False
    except FileNotFoundError:
        # This specific error might be less likely now if shutil.which succeeds,
        # but keeping the original handler logic for Google credentials might still be relevant
        # depending on how gcal-export handles missing credentials.
        # Consider if gcal-export handles this internally now.
        console.print("[bold red]Error running Google Calendar exporter: FileNotFoundError[/bold red]")
        console.print(
            "[yellow]Note: Google Calendar exporter might require a credentials.json file.[/yellow]"
        )
        console.print(
            "[yellow]Please ensure it's set up correctly as per the gcal-export instructions.[/yellow]"
        )
        return False
    except Exception as e:
        console.print(f"[bold red]An unexpected error occurred running Google Calendar exporter: {e}[/bold red]")
        return False


@click.command()
@click.option(
    "--exporters", "-e",
    type=click.Choice(["todoist", "gcal", "all"], case_sensitive=False),
    multiple=True,
    help="Specify which exporters to run. Can be used multiple times. If not specified, all exporters will run."
)
def main(exporters: list[str]):
    """Planning Data Exporter - Export data from various planning tools.
    
    If no exporters are specified, all available exporters will run.
    
    Examples:
        planning-export                   # Run all exporters
        planning-export -e todoist        # Run only Todoist exporter
        planning-export -e gcal           # Run only Google Calendar exporter
        planning-export -e todoist -e gcal  # Run both exporters
    """
    # If no exporters specified, run all
    if not exporters:
        exporters = ["all"]

    # If "all" is in the list, run all exporters
    run_all = "all" in exporters
    run_todoist = run_all or "todoist" in exporters
    run_gcal = run_all or "gcal" in exporters

    if run_all:
        console.print("[bold yellow]Running all available exporters...[/bold yellow]")
    else:
        console.print(f"[bold yellow]Running selected exporters: {', '.join(exporters)}[/bold yellow]")

    success_count = 0
    failure_count = 0

    # Run Todoist exporter if selected
    if run_todoist:
        console.print("\n[bold]Todoist Exporter[/bold]")
        if run_todoist_export():
            success_count += 1
        else:
            failure_count += 1

    # Run Google Calendar exporter if selected
    if run_gcal:
        console.print("\n[bold]Google Calendar Exporter[/bold]")
        if run_gcal_export():
            success_count += 1
        else:
            failure_count += 1

    # Print summary
    console.print("\n[bold yellow]Export process completed![/bold yellow]")
    if success_count > 0 and failure_count == 0:
        console.print(f"[bold green]All {success_count} exporters completed successfully.[/bold green]")
    elif success_count > 0 and failure_count > 0:
        console.print(f"[bold yellow]{success_count} exporters completed successfully, {failure_count} failed.[/bold yellow]")
    else:
        console.print(f"[bold red]All {failure_count} exporters failed.[/bold red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
