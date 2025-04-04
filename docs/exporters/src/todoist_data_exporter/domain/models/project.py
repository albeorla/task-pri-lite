"""Project model for Todoist projects."""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from todoist_data_exporter.domain.models.section import Section
    from todoist_data_exporter.domain.models.task import Task


@dataclass
class Project:
    """Represents a Todoist project."""

    id: str
    name: str
    color: str | None = None
    parent_id: str | None = None
    order: int | None = None
    comment_count: int | None = None
    is_shared: bool | None = None
    is_favorite: bool | None = None
    is_inbox_project: bool | None = None
    is_team_inbox: bool | None = None
    view_style: str | None = None
    url: str | None = None

    # Composite pattern: child elements
    sections: list["Section"] = field(default_factory=list)
    tasks: list["Task"] = field(default_factory=list)
    child_projects: list["Project"] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert project to dictionary.

        Returns:
            Dictionary representation of the project
        """
        # Explicitly type the result dictionary
        result: dict[str, Any] = {
            "id": self.id,
            "name": self.name,
        }

        # Add optional fields if they have values
        if self.color is not None:
            result["color"] = self.color
        if self.parent_id is not None:
            result["parent_id"] = self.parent_id
        if self.order is not None:
            result["order"] = self.order
        if self.comment_count is not None:
            result["comment_count"] = self.comment_count
        if self.is_shared is not None:
            result["is_shared"] = self.is_shared
        if self.is_favorite is not None:
            result["is_favorite"] = self.is_favorite
        if self.is_inbox_project is not None:
            result["is_inbox_project"] = self.is_inbox_project
        if self.is_team_inbox is not None:
            result["is_team_inbox"] = self.is_team_inbox
        if self.view_style is not None:
            result["view_style"] = self.view_style
        if self.url is not None:
            result["url"] = self.url

        # Add child elements
        if self.sections:
            result["sections"] = [section.to_dict() for section in self.sections]
        if self.tasks:
            result["tasks"] = [task.to_dict() for task in self.tasks]
        if self.child_projects:
            result["child_projects"] = [project.to_dict() for project in self.child_projects]

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Project":
        """Create a project from a dictionary.

        Args:
            data: Dictionary containing project data

        Returns:
            A Project instance
        """
        # Create a copy of the data to avoid modifying the original
        project_data = data.copy()

        # Extract child elements if present
        sections_data = project_data.pop("sections", [])
        tasks_data = project_data.pop("tasks", [])
        child_projects_data = project_data.pop("child_projects", [])

        # Create the project instance
        project = cls(**project_data)

        # Add child elements
        from todoist_data_exporter.domain.models.section import Section
        from todoist_data_exporter.domain.models.task import Task

        project.sections = [Section.from_dict(section) for section in sections_data]
        project.tasks = [Task.from_dict(task) for task in tasks_data]
        project.child_projects = [
            Project.from_dict(child_project) for child_project in child_projects_data
        ]

        return project
