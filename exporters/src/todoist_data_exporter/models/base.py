"""Base model for all Todoist entities."""

from abc import ABC
from typing import Any

from pydantic import BaseModel, Field


class TodoistEntity(BaseModel, ABC):
    """Base class for all Todoist entities."""

    id: str = Field(..., description="Unique identifier for the entity")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TodoistEntity":
        """Create an entity from a dictionary.

        Args:
            data: Dictionary containing entity data

        Returns:
            An instance of the entity
        """
        return cls(**data)
