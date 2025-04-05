"""Section model for Todoist sections."""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from todoist_data_exporter.domain.models.task import Task


@dataclass
class Section:
    """Represents a Todoist section within a project."""

    id: str
    project_id: str
    name: str
    order: int | None = None

    # Composite pattern: child elements
    tasks: list["Task"] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert section to dictionary.

        Returns:
            Dictionary representation of the section
        """
        # Explicitly type the result dictionary
        result: dict[str, Any] = {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
        }

        # Add optional fields if they have values
        if self.order is not None:
            result["order"] = self.order

        # Add child elements
        if self.tasks:
            result["tasks"] = [task.to_dict() for task in self.tasks]

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Section":
        """Create a section from a dictionary.

        Args:
            data: Dictionary containing section data

        Returns:
            A Section instance
        """
        # Create a copy of the data to avoid modifying the original
        section_data = data.copy()

        # Extract child elements if present
        tasks_data = section_data.pop("tasks", [])

        # Create the section instance
        section = cls(**section_data)

        # Add child elements
        from todoist_data_exporter.domain.models.task import Task

        section.tasks = [Task.from_dict(task) for task in tasks_data]

        return section
