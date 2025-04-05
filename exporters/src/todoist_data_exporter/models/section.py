"""Section model for Todoist sections."""

from typing import TYPE_CHECKING, Any

from pydantic import Field

from todoist_data_exporter.models.base import TodoistEntity

if TYPE_CHECKING:
    from todoist_data_exporter.models.task import Task


class Section(TodoistEntity):
    """Represents a Todoist section within a project."""

    project_id: str = Field(..., description="ID of the project section belongs to")
    order: int | None = Field(
        None, description="Section position among other sections from the same project"
    )
    name: str = Field(..., description="Section name")

    # Composite pattern: child elements
    tasks: list["Task"] = Field(default_factory=list, description="Tasks within this section")

    @classmethod
    def from_dict(cls, data: dict[str, Any], include_children: bool = True) -> "Section":
        """Create a section from a dictionary.

        Args:
            data: Dictionary containing section data
            include_children: Whether to include child tasks

        Returns:
            A Section instance
        """
        # Create a copy of the data to avoid modifying the original
        section_data = data.copy()

        # Extract child elements if present and if include_children is True
        tasks_data = section_data.pop("tasks", []) if include_children else []

        # Create the section instance
        section = cls(**section_data)

        # Add child elements if include_children is True
        if include_children:
            from todoist_data_exporter.models.task import Task

            section.tasks = [Task.from_dict(task) for task in tasks_data]

        return section
