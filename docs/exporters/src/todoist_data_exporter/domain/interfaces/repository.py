"""Repository interfaces for the Planning Data exporter."""

from typing import Protocol, TypeAlias, runtime_checkable

# Type aliases for domain entities
ProjectData: TypeAlias = dict
SectionData: TypeAlias = dict
TaskData: TypeAlias = dict
LabelData: TypeAlias = dict
CommentData: TypeAlias = dict
TodoistData: TypeAlias = dict  # The complete Planning data structure
PlanningData: TypeAlias = dict  # Alias for TodoistData for backward compatibility


@runtime_checkable
class ProjectRepository(Protocol):
    """Protocol for project repository."""

    def get_all_projects(self) -> list[ProjectData]:
        """Get all projects.

        Returns:
            List of project data dictionaries
        """
        ...

    def get_project_by_id(self, project_id: str) -> ProjectData | None:
        """Get a project by ID.

        Args:
            project_id: The project ID

        Returns:
            Project data dictionary or None if not found
        """
        ...


@runtime_checkable
class TaskRepository(Protocol):
    """Protocol for task repository."""

    def get_all_tasks(self) -> list[TaskData]:
        """Get all tasks.

        Returns:
            List of task data dictionaries
        """
        ...

    def get_tasks_by_project_id(self, project_id: str) -> list[TaskData]:
        """Get tasks by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of task data dictionaries
        """
        ...

    def get_tasks_by_section_id(self, section_id: str) -> list[TaskData]:
        """Get tasks by section ID.

        Args:
            section_id: The section ID

        Returns:
            List of task data dictionaries
        """
        ...

    def get_task_by_id(self, task_id: str) -> TaskData | None:
        """Get a task by ID.

        Args:
            task_id: The task ID

        Returns:
            Task data dictionary or None if not found
        """
        ...


@runtime_checkable
class SectionRepository(Protocol):
    """Protocol for section repository."""

    def get_all_sections(self) -> list[SectionData]:
        """Get all sections.

        Returns:
            List of section data dictionaries
        """
        ...

    def get_sections_by_project_id(self, project_id: str) -> list[SectionData]:
        """Get sections by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of section data dictionaries
        """
        ...

    def get_section_by_id(self, section_id: str) -> SectionData | None:
        """Get a section by ID.

        Args:
            section_id: The section ID

        Returns:
            Section data dictionary or None if not found
        """
        ...


@runtime_checkable
class LabelRepository(Protocol):
    """Protocol for label repository."""

    def get_all_labels(self) -> list[LabelData]:
        """Get all labels.

        Returns:
            List of label data dictionaries
        """
        ...

    def get_label_by_id(self, label_id: str) -> LabelData | None:
        """Get a label by ID.

        Args:
            label_id: The label ID

        Returns:
            Label data dictionary or None if not found
        """
        ...


@runtime_checkable
class CommentRepository(Protocol):
    """Protocol for comment repository."""

    def get_comments_by_task_id(self, task_id: str) -> list[CommentData]:
        """Get comments by task ID.

        Args:
            task_id: The task ID

        Returns:
            List of comment data dictionaries
        """
        ...

    def get_comments_by_project_id(self, project_id: str) -> list[CommentData]:
        """Get comments by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of comment data dictionaries
        """
        ...


@runtime_checkable
class TodoistRepository(Protocol):
    """Protocol for Planning repository that combines all repositories."""

    def get_all_data(self) -> TodoistData:
        """Get all Planning data.

        Returns:
            Complete Planning data structure
        """
        ...

    def save_data(self, data: TodoistData, file_path: str) -> None:
        """Save Planning data to a file.

        Args:
            data: Complete Planning data structure
            file_path: Path to save the data to
        """
        ...
