"""Task model for Todoist tasks."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any, cast

if TYPE_CHECKING:
    from todoist_data_exporter.domain.models.comment import Comment


@dataclass
class Task:
    """Represents a Todoist task."""

    id: str
    content: str
    project_id: str
    section_id: str | None = None
    description: str = ""
    is_completed: bool = False
    labels: list[str] = field(default_factory=list)
    parent_id: str | None = None
    order: int | None = None
    priority: int = 1
    due: dict[str, Any] | None = None
    url: str | None = None
    comment_count: int = 0
    created_at: datetime | None = None

    # Composite pattern: child elements
    sub_tasks: list["Task"] = field(default_factory=list)
    comments: list["Comment"] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert task to dictionary.

        Returns:
            Dictionary representation of the task
        """
        # Explicitly type the result dictionary
        result: dict[str, Any] = {
            "id": self.id,
            "content": self.content,
            "project_id": self.project_id,
        }

        # Add optional fields if they have values
        if self.section_id is not None:
            result["section_id"] = self.section_id
        if self.description:
            result["description"] = self.description
        # Ensure boolean is handled correctly, not assigned to string type hint implicitly
        result["is_completed"] = self.is_completed
        if self.labels:
            result["labels"] = self.labels
        if self.parent_id is not None:
            result["parent_id"] = self.parent_id
        if self.order is not None:
            result["order"] = self.order
        # Ensure integer is handled correctly
        result["priority"] = self.priority
        if self.due is not None:
            result["due"] = self.due
        if self.url is not None:
            result["url"] = self.url
        # Ensure integer is handled correctly
        result["comment_count"] = self.comment_count
        if self.created_at is not None:
            result["created_at"] = self.created_at.isoformat()

        # Add child elements
        if self.sub_tasks:
            result["sub_tasks"] = [task.to_dict() for task in self.sub_tasks]
        if self.comments:
            result["comments"] = [comment.to_dict() for comment in self.comments]

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Task":
        """Create a task from a dictionary.

        Args:
            data: Dictionary containing task data

        Returns:
            A Task instance
        """
        # Create a copy of the data to avoid modifying the original
        task_data = data.copy()

        # Extract child elements if present
        sub_tasks_data = task_data.pop("sub_tasks", [])
        comments_data = task_data.pop("comments", [])

        # Handle datetime conversion
        if "created_at" in task_data and isinstance(task_data["created_at"], str):
            task_data["created_at"] = datetime.fromisoformat(
                task_data["created_at"].replace("Z", "+00:00")
            )

        # Create the task instance
        task = cls(**task_data)

        # Add child elements
        task.sub_tasks = [Task.from_dict(sub_task) for sub_task in sub_tasks_data]

        # Explicitly import and annotate type to help mypy
        from todoist_data_exporter.domain.models.comment import Comment

        task.comments = [  # type: ignore[misc]
            cast(Comment, Comment.from_dict(comment_data)) for comment_data in comments_data
        ]

        return task
