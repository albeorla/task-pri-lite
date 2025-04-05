"""Schema validation for Todoist data exports."""

import os
import json
from pathlib import Path
import logging
from typing import Any, Dict, Optional, Union

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


def validate_todoist_data(data: Dict[str, Any]) -> Optional[str]:
    """
    Validate Todoist data against the schema.
    
    Args:
        data: The data to validate
        
    Returns:
        None if validation succeeds, error message string if validation fails
    """
    try:
        schema = load_schema("todoist_denormalized_schema")
        validate(instance=data, schema=schema)
        logger.info("Todoist data validated successfully against schema")
        return None
    except ValidationError as e:
        error_msg = f"Todoist data validation failed: {str(e)}"
        logger.error(error_msg)
        return error_msg
    except Exception as e:
        error_msg = f"Schema validation error: {str(e)}"
        logger.error(error_msg)
        return error_msg


class SchemaValidationExporterWrapper:
    """Wrapper for exporters that adds schema validation."""
    
    def __init__(self, wrapped_exporter: Any):
        """
        Initialize the wrapper.
        
        Args:
            wrapped_exporter: The exporter to wrap
        """
        self.wrapped_exporter = wrapped_exporter
    
    def export(self, data: Dict[str, Any], output_path: str) -> None:
        """
        Export data with schema validation.
        
        Args:
            data: The data to export
            output_path: Path to save the exported data
            
        Raises:
            ValueError: If data fails schema validation
        """
        # Validate the data
        validation_error = validate_todoist_data(data)
        if validation_error:
            raise ValueError(f"Data failed schema validation: {validation_error}")
        
        # If validation passes, perform the export
        self.wrapped_exporter.export(data, output_path) 