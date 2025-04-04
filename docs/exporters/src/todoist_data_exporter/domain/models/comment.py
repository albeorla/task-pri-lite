"""Comment model for Todoist comments."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class Comment:
    """Represents a Todoist comment on a task or project."""

    id: str
    content: str
    posted_at: datetime
    task_id: str | None = None
    project_id: str | None = None
    attachment: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert comment to dictionary.

        Returns:
            Dictionary representation of the comment
        """
        # Explicitly type the result dictionary
        result: dict[str, Any] = {
            "id": self.id,
            "content": self.content,
            "posted_at": self.posted_at.isoformat(),
        }

        # Add optional fields if they have values
        if self.task_id is not None:
            result["task_id"] = self.task_id
        if self.project_id is not None:
            result["project_id"] = self.project_id
        if self.attachment is not None:
            result["attachment"] = self.attachment

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Comment":
        """Create a comment from a dictionary.

        Args:
            data: Dictionary containing comment data

        Returns:
            A Comment instance
        """
        # Create a copy of the data to avoid modifying the original
        comment_data = data.copy()

        # Handle datetime conversion
        if "posted_at" in comment_data and isinstance(comment_data["posted_at"], str):
            comment_data["posted_at"] = datetime.fromisoformat(
                comment_data["posted_at"].replace("Z", "+00:00")
            )

        # Create the comment instance
        return cls(**comment_data)
