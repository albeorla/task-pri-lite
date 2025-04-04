"""Task formatter for Google Calendar tasks."""

import json
import logging

from google_calendar_exporter.formatters.event_formatter import DateTimeEncoder
from google_calendar_exporter.protocols import TaskFormatter, TaskResult

logger = logging.getLogger(__name__)


class TaskJsonFormatter(TaskFormatter):
    """Formats task data into JSON."""

    def format(self, data: TaskResult) -> str:
        """Formats the structured task data into a JSON string."""
        logger.info("Formatting task data to JSON...")
        try:
            # Convert to JSON using Pydantic's model_dump method
            formatted_data = [task.model_dump(exclude_none=True) for task in data]

            # Use indent for readability and custom encoder for datetime objects
            json_output = json.dumps(
                formatted_data, indent=2, ensure_ascii=False, cls=DateTimeEncoder
            )
            logger.info("Task data successfully formatted to JSON.")
            return json_output
        except Exception as e:
            logger.error(f"Error serializing task data to JSON: {e}")
            raise

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the formatted string data to a file."""
        logger.info(f"Saving task JSON data to file: {file_path}")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(formatted_data)
            logger.info(f"Successfully saved task export to {file_path}")
        except OSError as e:
            logger.error(f"Failed to write task JSON to file {file_path}: {e}")
            raise
