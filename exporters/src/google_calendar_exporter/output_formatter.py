"""Output formatter for the Google Calendar exporter."""

import dataclasses  # Import dataclasses for converting models
import json
import logging
from typing import Any  # Import Any for type hints

from .protocols import ExportResult, Formatter  # Import protocol and type alias

logger = logging.getLogger(__name__)


class EnhancedJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle dataclasses."""

    def default(self, o: Any) -> Any:
        if dataclasses.is_dataclass(o):
            # Convert dataclass to dict, handling nested dataclasses
            # Exclude None values for cleaner output (optional)
            return {
                k: v
                for k, v in dataclasses.asdict(o).items()
                if v is not None or k == "exceptions"  # Keep empty exceptions list
            }
        return super().default(o)


class JsonOutputFormatter(Formatter):  # Inherit from protocol
    """Formats the processed data into JSON."""

    def format(self, data: ExportResult) -> str:
        """Converts the data dictionary (CalendarName -> List[ProcessedEvent]) to a JSON string."""
        logger.info("Formatting data to JSON...")
        try:
            # Use the enhanced encoder to handle dataclasses
            json_output = json.dumps(data, indent=2, ensure_ascii=False, cls=EnhancedJSONEncoder)
            logger.info("Data successfully formatted to JSON.")
            return json_output
        except TypeError as e:
            logger.error(f"Error serializing data to JSON: {e}")
            raise

    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """Saves the JSON string to a file."""
        logger.info(f"Saving JSON data to file: {file_path}")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(formatted_data)
            logger.info(f"Successfully saved export to {file_path}")
        except OSError as e:
            logger.error(f"Failed to write JSON to file {file_path}: {e}")
            raise
