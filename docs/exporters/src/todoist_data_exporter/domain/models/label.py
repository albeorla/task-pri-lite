"""Label model for Todoist labels."""

from dataclasses import dataclass
from typing import Any


@dataclass
class Label:
    """Represents a Todoist label."""

    id: str
    name: str
    color: str | None = None
    order: int | None = None
    is_favorite: bool | None = None
    is_shared: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert label to dictionary.

        Returns:
            Dictionary representation of the label
        """
        result: dict[str, Any] = {
            "id": self.id,
            "name": self.name,
        }

        # Add optional fields if they have values
        if self.color is not None:
            result["color"] = self.color
        if self.order is not None:
            result["order"] = self.order
        if self.is_favorite is not None:
            result["is_favorite"] = self.is_favorite
        if self.is_shared is not None:
            result["is_shared"] = self.is_shared

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Label":
        """Create a label from a dictionary.

        Args:
            data: Dictionary containing label data

        Returns:
            A Label instance
        """
        return cls(**data)
