"""Event formatter for Google Calendar events."""

import json
import logging
from datetime import datetime

from google_calendar_exporter.protocols import CalendarEventResult, EventFormatter

logger = logging.getLogger(__name__)


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class EventJsonFormatter(EventFormatter):
    """Formats calendar events data into JSON."""

    def format(self, data: CalendarEventResult) -> str:
        """Formats the structured event data into a JSON string."""
        logger.info("Formatting calendar events data to JSON...")
        try:
            # Convert to JSON using Pydantic's json() method
            formatted_data = {}
            for calendar_name, events in data.items():
                formatted_data[calendar_name] = [
                    event.model_dump(exclude_none=True) for event in events
                ]

            # Use indent for readability and custom encoder for datetime objects
            json_output = json.dumps(
                formatted_data, indent=2, ensure_ascii=False, cls=DateTimeEncoder
            )
            logger.info("Calendar events data successfully formatted to JSON.")
            return json_output
        except Exception as e:
            logger.error(f"Error serializing calendar events data to JSON: {e}")
            raise

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the formatted string data to a file."""
        logger.info(f"Saving calendar events JSON data to file: {file_path}")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(formatted_data)
            logger.info(f"Successfully saved calendar events export to {file_path}")
        except OSError as e:
            logger.error(f"Failed to write calendar events JSON to file {file_path}: {e}")
            raise
