"""Comment model for Todoist comments."""

from datetime import datetime
from typing import Any

from pydantic import Field

from todoist_data_exporter.models.base import TodoistEntity


class Comment(TodoistEntity):
    """Represents a Todoist comment on a task or project."""

    task_id: str | None = Field(
        None, description="Comment's task ID (null if the comment belongs to a project)"
    )
    project_id: str | None = Field(
        None, description="Comment's project ID (null if the comment belongs to a task)"
    )
    posted_at: datetime = Field(..., description="Date and time when comment was added")
    content: str = Field(..., description="Comment content")
    attachment: dict[str, Any] | None = Field(None, description="Attachment file")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Comment":
        """Create a comment from a dictionary.

        Args:
            data: Dictionary containing comment data

        Returns:
            A Comment instance
        """
        return cls(**data)
