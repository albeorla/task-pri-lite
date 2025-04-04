"""Base model for all Todoist entities."""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class TodoistEntity(Protocol):
    """Protocol for Todoist entities."""

    id: str

    def to_dict(self) -> dict[str, Any]:
        """Convert entity to dictionary.

        Returns:
            Dictionary representation of the entity
        """
        ...
