"""
Schema validation utilities for JSON data.

This module provides functions to validate JSON data against JSON Schema definitions.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional, Union

from jsonschema import validate, ValidationError

# Base path for schema files
SCHEMA_DIR = Path(__file__).parent.parent.parent / "schemas"


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


def validate_data(data: Union[Dict[str, Any], list], schema_name: str) -> Optional[str]:
    """
    Validate data against a JSON schema.
    
    Args:
        data: The data to validate (dict or list)
        schema_name: Name of the schema file (with or without .json extension)
        
    Returns:
        None if validation succeeds, error message string if validation fails
        
    Raises:
        FileNotFoundError: If the schema file doesn't exist
        json.JSONDecodeError: If the schema file contains invalid JSON
    """
    try:
        schema = load_schema(schema_name)
        validate(instance=data, schema=schema)
        return None
    except ValidationError as e:
        return str(e)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return f"Schema error: {str(e)}"


def validate_file(file_path: Union[str, Path], schema_name: str) -> Optional[str]:
    """
    Validate a JSON file against a JSON schema.
    
    Args:
        file_path: Path to the JSON file to validate
        schema_name: Name of the schema file (with or without .json extension)
        
    Returns:
        None if validation succeeds, error message string if validation fails
        
    Raises:
        FileNotFoundError: If the file or schema doesn't exist
        json.JSONDecodeError: If the file or schema contains invalid JSON
    """
    try:
        file_path = Path(file_path)
        if not file_path.exists():
            return f"File not found: {file_path}"
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return validate_data(data, schema_name)
    except json.JSONDecodeError as e:
        return f"Invalid JSON in file {file_path}: {str(e)}" 