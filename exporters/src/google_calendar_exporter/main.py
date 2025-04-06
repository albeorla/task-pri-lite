"""Main entry point for the Google Calendar exporter CLI."""

import argparse
import importlib.metadata
import logging
import os
import sys
from pathlib import Path
import json

# Import dotenv for loading environment variables from .env file
from dotenv import load_dotenv

from google_calendar_exporter.config import Config, settings
from google_calendar_exporter.factories.exporter_factory import GoogleCalendarExporterFactory

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def parse_args():
    """Parse command line arguments."""
    # Get version from package metadata if available, or default to 'dev'
    try:
        version = importlib.metadata.version("google_calendar_exporter")
    except importlib.metadata.PackageNotFoundError:
        version = "dev"

    parser = argparse.ArgumentParser(
        description="Export Google Calendar data to JSON files.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--credentials-file",
        type=str,
        default=os.environ.get("GOOGLE_CREDENTIALS_FILE", "bin/client_secret.json"),
        help="Path to Google API credentials file.",
    )
    parser.add_argument(
        "--token-file",
        type=str,
        default=os.environ.get("GOOGLE_TOKEN_FILE", "bin/google-token.json"),
        help="Path to Google API token file.",
    )
    parser.add_argument(
        "--events-output",
        type=str,
        default=os.environ.get("EVENTS_OUTPUT_FILE", "output/calendar_events.json"),
        help="Output path for the events JSON file.",
    )
    parser.add_argument(
        "--tasks-output",
        type=str,
        default=os.environ.get("TASKS_OUTPUT_FILE", "output/calendar_tasks.json"),
        help="Output path for the tasks JSON file.",
    )
    parser.add_argument(
        "--planning-output",
        type=str,
        default=os.environ.get("PLANNING_OUTPUT_FILE", "output/calendar_planning.json"),
        help="Output path for the planning JSON file.",
    )
    parser.add_argument(
        "--sort-events",
        action="store_true",
        help="Sort events by start date/time in each calendar.",
    )
    parser.add_argument(
        "--filter-events",
        action="store_true",
        help="Enable AI filtering of events using Claude.",
    )
    parser.add_argument(
        "--claude-api-key",
        type=str,
        default=os.environ.get("ANTHROPIC_API_KEY", ""),
        help="Anthropic API key for Claude. If not provided, uses ANTHROPIC_API_KEY env variable.",
    )
    parser.add_argument(
        "--claude-model",
        type=str,
        default=os.environ.get("CLAUDE_MODEL", "claude-3.7-sonnet"),
        help="Claude model to use for filtering.",
    )
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=float(os.environ.get("CLAUDE_CONFIDENCE_THRESHOLD", "0.7")),
        help="Confidence threshold for keeping filtered events (0.0-1.0).",
    )
    parser.add_argument(
        "--filtered-output",
        type=str,
        default=os.environ.get("FILTERED_EVENTS_OUTPUT_FILE", "output/filtered_calendar_events.json"),
        help="Output path for the filtered events JSON file.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=int(os.environ.get("CLAUDE_BATCH_SIZE", "10")),
        help="Number of events to process in a single Claude API call.",
    )
    parser.add_argument(
        "--max-concurrent-batches",
        type=int,
        default=int(os.environ.get("CLAUDE_MAX_CONCURRENT_BATCHES", "3")),
        help="Maximum number of batches to process concurrently.",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {version}")

    return parser.parse_args()


def main():
    """Run the Google Calendar export script."""
    args = parse_args()

    # Set logging level based on verbosity
    if args.verbose:
        logger.setLevel(logging.DEBUG)
        # Also set root logger to DEBUG
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Verbose logging enabled")

    logger.info("Starting Google Calendar Exporter")
    logger.info(f"Environment variables loaded from .env file")

    try:
        # Validate paths exist or can be created
        for path_arg in [args.credentials_file, args.token_file]:
            if not os.path.exists(path_arg):
                logger.warning(f"Path does not exist: {path_arg}")

        # Create output directories if they don't exist
        for output_path in [
            args.events_output,
            args.tasks_output,
            args.planning_output,
            args.filtered_output,
        ]:
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
                logger.info(f"Created output directory: {output_dir}")

        # Update config settings from command line arguments if provided
        settings.CREDENTIALS_FILE = args.credentials_file
        settings.TOKEN_FILE = args.token_file
        settings.EVENTS_OUTPUT_FILE = args.events_output
        settings.TASKS_OUTPUT_FILE = args.tasks_output
        settings.PLANNING_OUTPUT_FILE = args.planning_output
        settings.SORT_EVENTS_BY_START = args.sort_events

        # Create the exporter using the factory
        exporter = GoogleCalendarExporterFactory.create_exporter(
            config=settings,
            include_claude_filter=args.filter_events,
            claude_api_key=args.claude_api_key if args.claude_api_key else None,
            claude_model=args.claude_model,
            confidence_threshold=args.confidence_threshold,
            batch_size=args.batch_size,
            max_concurrent_batches=args.max_concurrent_batches,
        )

        # Run the export process
        events_json, tasks_json, planning_json, filtered_events = exporter.export_data()

        if events_json and tasks_json and planning_json:
            logger.info("Export completed successfully!")
            exit_code = 0
        else:
            logger.error("Export failed. Check logs for details.")
            exit_code = 1

        # Report on filtering results if applicable
        if args.filter_events and filtered_events:
            filtered_count = len(filtered_events.get("filtered_events", []))
            total_count = filtered_events.get("metadata", {}).get("total_events_processed", 0)
            removed_count = total_count - filtered_count
            logger.info(f"Event filtering complete: {filtered_count} events retained out of {total_count} processed.")
            logger.info(f"Removed {removed_count} events that didn't meet filtering criteria.")
            logger.info(f"Filtered events saved to: {args.filtered_output}")
            
            # Write filtered events JSON data to file
            filtered_dir = os.path.dirname(args.filtered_output)
            if filtered_dir and not os.path.exists(filtered_dir):
                os.makedirs(filtered_dir, exist_ok=True)
            
            with open(args.filtered_output, "w") as f:
                json.dump(filtered_events, f, indent=2)
                logger.info(f"Successfully saved filtered events to {args.filtered_output}")
        elif args.filter_events:
            logger.warning("Filtering was enabled but no filtered events data was returned.")

        sys.exit(exit_code)

    except Exception:
        logger.exception("An unhandled error occurred during export")
        sys.exit(1)


if __name__ == "__main__":
    main()
