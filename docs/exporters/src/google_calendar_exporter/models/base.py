"""Base model for all Google Calendar entities."""

from abc import ABC
from typing import Any

from pydantic import BaseModel, Field


class CalendarEntity(BaseModel, ABC):
    """Base class for all Google Calendar entities."""

    id: str = Field(..., description="Unique identifier for the entity")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CalendarEntity":
        """Create an entity from a dictionary.

        Args:
            data: Dictionary containing entity data

        Returns:
            An instance of the entity
        """
        return cls(**data)
