"""Schema validation for Google Calendar data exports."""

import os
import json
from pathlib import Path
import logging
from typing import Any, Dict, Optional, Union, List

from jsonschema import validate, ValidationError

# Get a logger
logger = logging.getLogger(__name__)

# Base path for schema files
SCHEMA_DIR = Path(__file__).parent.parent.parent.parent.parent / "schemas"


def load_schema(schema_name: str) -> Dict[str, Any]:
    """
    Load a JSON schema file from the schemas directory.
    
    Args:
        schema_name: Name of the schema file (with or without .json extension)
        
    Returns:
        Dict containing the schema definition
        
    Raises:
        FileNotFoundError: If the schema file doesn't exist
        json.JSONDecodeError: If the schema file contains invalid JSON
    """
    if not schema_name.endswith(".json"):
        schema_name = f"{schema_name}.json"
    
    schema_path = SCHEMA_DIR / schema_name
    
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    
    with open(schema_path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_calendar_events(data: Dict[str, Any]) -> Optional[str]:
    """
    Validate Calendar events data against the schema.
    
    Args:
        data: The data to validate
        
    Returns:
        None if validation succeeds, error message string if validation fails
    """
    try:
        # Wrap the data in a structure that matches our calendar_schema.json
        # The schema expects a structure with "events" property
        wrapped_data = {"events": data}
        
        schema = load_schema("calendar_schema")
        validate(instance=wrapped_data, schema=schema)
        logger.info("Calendar events data validated successfully against schema")
        return None
    except ValidationError as e:
        error_msg = f"Calendar events data validation failed: {str(e)}"
        logger.error(error_msg)
        return error_msg
    except Exception as e:
        error_msg = f"Schema validation error: {str(e)}"
        logger.error(error_msg)
        return error_msg


def validate_calendar_tasks(data: List[Dict[str, Any]]) -> Optional[str]:
    """
    Validate Calendar tasks data against the schema.
    
    Args:
        data: The data to validate
        
    Returns:
        None if validation succeeds, error message string if validation fails
    """
    try:
        # Wrap the data in a structure that matches our calendar_schema.json
        # The schema expects a structure with "tasks" property
        wrapped_data = {"tasks": data}
        
        schema = load_schema("calendar_schema")
        validate(instance=wrapped_data, schema=schema)
        logger.info("Calendar tasks data validated successfully against schema")
        return None
    except ValidationError as e:
        error_msg = f"Calendar tasks data validation failed: {str(e)}"
        logger.error(error_msg)
        return error_msg
    except Exception as e:
        error_msg = f"Schema validation error: {str(e)}"
        logger.error(error_msg)
        return error_msg


class SchemaValidationFormatterWrapper:
    """Wrapper for formatters that adds schema validation."""
    
    def __init__(self, wrapped_formatter: Any, validator_func: Any):
        """
        Initialize the wrapper.
        
        Args:
            wrapped_formatter: The formatter to wrap
            validator_func: The validation function to use
        """
        self.wrapped_formatter = wrapped_formatter
        self.validator_func = validator_func
    
    def format(self, data: Any) -> str:
        """
        Format data with schema validation.
        
        Args:
            data: The data to format
            
        Returns:
            Formatted string data
            
        Raises:
            ValueError: If data fails schema validation
        """
        # Format the data first
        formatted_str = self.wrapped_formatter.format(data)
        
        # Parse the formatted string back to JSON for validation
        try:
            parsed_data = json.loads(formatted_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Formatter produced invalid JSON: {e}")
            
        # Validate the data
        validation_error = self.validator_func(parsed_data)
        if validation_error:
            raise ValueError(f"Data failed schema validation: {validation_error}")
        
        return formatted_str
    
    def save_to_file(self, formatted_data: str, file_path: str) -> None:
        """
        Save formatted data to file, passing through to wrapped formatter.
        
        Args:
            formatted_data: The formatted data string
            file_path: Path to save the formatted data
        """
        self.wrapped_formatter.save_to_file(formatted_data, file_path) 