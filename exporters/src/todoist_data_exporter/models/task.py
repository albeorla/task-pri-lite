"""Task model for Todoist tasks."""

from datetime import datetime
from typing import Any

from pydantic import Field

from todoist_data_exporter.models.base import TodoistEntity


class Comment(TodoistEntity):
    """Represents a Todoist comment on a task."""

    task_id: str = Field(..., description="Comment's task ID")
    content: str = Field(..., description="Comment content")
    posted_at: datetime = Field(..., description="Date and time when comment was added")
    attachment: dict[str, Any] | None = Field(None, description="Attachment file")


class Task(TodoistEntity):
    """Represents a Todoist task."""

    project_id: str = Field(..., description="Task's project ID")
    section_id: str | None = Field(None, description="ID of section task belongs to")
    content: str = Field(..., description="Task content")
    description: str | None = Field("", description="A description for the task")
    is_completed: bool | None = Field(False, description="Flag to mark completed tasks")
    labels: list[str] = Field(default_factory=list, description="Array of label IDs")
    parent_id: str | None = Field(None, description="ID of parent task (null for top-level tasks)")
    order: int | None = Field(None, description="Task position among siblings")
    priority: int | None = Field(1, description="Task priority from 1 (normal) to 4 (urgent)")
    due: dict[str, Any] | None = Field(None, description="Task due date/time")
    url: str | None = Field(None, description="URL to access this task")
    comment_count: int | None = Field(0, description="Number of task comments")
    created_at: datetime | None = Field(None, description="Date and time when task was created")

    # Composite pattern: child elements
    sub_tasks: list["Task"] = Field(
        default_factory=list, description="Child tasks (sub-tasks) of this task"
    )
    comments: list[Comment] = Field(default_factory=list, description="Comments on this task")

    @classmethod
    def from_dict(cls, data: dict[str, Any], include_children: bool = True) -> "Task":
        """Create a task from a dictionary.

        Args:
            data: Dictionary containing task data
            include_children: Whether to include child tasks and comments

        Returns:
            A Task instance
        """
        # Create a copy of the data to avoid modifying the original
        task_data = data.copy()

        # Extract child elements if present and if include_children is True
        sub_tasks_data = task_data.pop("sub_tasks", []) if include_children else []
        comments_data = task_data.pop("comments", []) if include_children else []

        # Create the task instance
        task = cls(**task_data)

        # Add child elements if include_children is True
        if include_children:
            task.sub_tasks = [Task.from_dict(sub_task) for sub_task in sub_tasks_data]
            task.comments = [Comment.from_dict(comment) for comment in comments_data]  # type: ignore

        return task
