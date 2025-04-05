"""Planning formatter for Google Calendar planning data."""

import json
import logging
from datetime import date, datetime

from google_calendar_exporter.models.planning import PlanningCalendar

logger = logging.getLogger(__name__)


class PlanningJsonEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime and date objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


class PlanningJsonFormatter:
    """Formats planning calendar data into JSON."""

    def format(self, data: list[PlanningCalendar]) -> str:
        """Formats the structured planning data into a JSON string."""
        logger.info("Formatting planning calendar data to JSON...")
        try:
            # Convert to JSON using Pydantic's model_dump method
            formatted_data = [calendar.model_dump(exclude_none=True) for calendar in data]

            # Use indent for readability and custom encoder for datetime objects
            json_output = json.dumps(
                formatted_data, indent=2, ensure_ascii=False, cls=PlanningJsonEncoder
            )
            logger.info("Planning calendar data successfully formatted to JSON.")
            return json_output
        except Exception as e:
            logger.error(f"Error serializing planning calendar data to JSON: {e}")
            raise

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the formatted string data to a file."""
        logger.info(f"Saving planning calendar JSON data to file: {file_path}")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(formatted_data)
            logger.info(f"Successfully saved planning calendar export to {file_path}")
        except OSError as e:
            logger.error(f"Failed to write planning calendar JSON to file {file_path}: {e}")
            raise
