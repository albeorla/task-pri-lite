"""Project model for Todoist projects."""

from typing import Any

from pydantic import Field

from todoist_data_exporter.models.base import TodoistEntity
from todoist_data_exporter.models.section import Section
from todoist_data_exporter.models.task import Task


class Project(TodoistEntity):
    """Represents a Todoist project."""

    name: str = Field(..., description="Project name")
    color: str | None = Field(None, description="The color of the project icon")
    parent_id: str | None = Field(
        None, description="ID of parent project (null for top-level projects)"
    )
    order: int | None = Field(None, description="Project position under the same parent")
    comment_count: int | None = Field(None, description="Number of project comments")
    is_shared: bool | None = Field(None, description="Whether the project is shared")
    is_favorite: bool | None = Field(None, description="Whether the project is a favorite")
    is_inbox_project: bool | None = Field(None, description="Whether this is the Inbox project")
    is_team_inbox: bool | None = Field(None, description="Whether this is the team inbox project")
    view_style: str | None = Field(None, description="Project view style (list, board, etc.)")
    url: str | None = Field(None, description="URL to access this project")

    # Composite pattern: child elements
    sections: list["Section"] = Field(
        default_factory=list, description="Sections within this project"
    )
    tasks: list["Task"] = Field(
        default_factory=list, description="Top-level tasks directly under this project"
    )
    child_projects: list["Project"] = Field(default_factory=list, description="Child projects")

    @classmethod
    def from_dict(cls, data: dict[str, Any], include_children: bool = True) -> "Project":
        """Create a project from a dictionary.

        Args:
            data: Dictionary containing project data
            include_children: Whether to include child sections and tasks

        Returns:
            A Project instance
        """
        # Create a copy of the data to avoid modifying the original
        project_data = data.copy()

        # Extract child elements if present and if include_children is True
        sections_data = project_data.pop("sections", []) if include_children else []
        tasks_data = project_data.pop("tasks", []) if include_children else []
        child_projects_data = project_data.pop("child_projects", []) if include_children else []

        # Create the project instance
        project = cls(**project_data)

        # Add child elements if include_children is True
        if include_children:
            from todoist_data_exporter.models.section import Section
            from todoist_data_exporter.models.task import Task

            project.sections = [Section.from_dict(section) for section in sections_data]
            project.tasks = [Task.from_dict(task) for task in tasks_data]
            project.child_projects = [
                Project.from_dict(child_project) for child_project in child_projects_data
            ]

        return project
