"""Planning repository implementation."""

import json
import os

from todoist_data_exporter.domain.interfaces.repository import (
    CommentData,
    LabelData,
    ProjectData,
    SectionData,
    TaskData,
)
from todoist_data_exporter.domain.interfaces.repository import (
    TodoistData as PlanningData,
)
from todoist_data_exporter.infrastructure.api.planning_client import PlanningClient


class PlanningApiRepository:
    """Repository implementation using the Planning API."""

    def __init__(self, api_client: PlanningClient) -> None:
        """Initialize the repository.

        Args:
            api_client: Planning API client
        """
        self.api_client = api_client

    def get_all_data(self) -> PlanningData:
        """Get all Planning data.

        Returns:
            Complete Planning data structure
        """
        return self.api_client.get_all_data()

    def get_all_projects(self) -> list[ProjectData]:
        """Get all projects.

        Returns:
            List of project data dictionaries
        """
        return self.api_client.get_projects()

    def get_project_by_id(self, project_id: str) -> ProjectData | None:
        """Get a project by ID.

        Args:
            project_id: The project ID

        Returns:
            Project data dictionary or None if not found
        """
        projects = self.api_client.get_projects()
        for project in projects:
            if project["id"] == project_id:
                return project
        return None

    def get_all_sections(self) -> list[SectionData]:
        """Get all sections.

        Returns:
            List of section data dictionaries
        """
        return self.api_client.get_sections()

    def get_sections_by_project_id(self, project_id: str) -> list[SectionData]:
        """Get sections by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of section data dictionaries
        """
        return self.api_client.get_sections(project_id=project_id)

    def get_section_by_id(self, section_id: str) -> SectionData | None:
        """Get a section by ID.

        Args:
            section_id: The section ID

        Returns:
            Section data dictionary or None if not found
        """
        sections = self.api_client.get_sections()
        for section in sections:
            if section["id"] == section_id:
                return section
        return None

    def get_all_tasks(self) -> list[TaskData]:
        """Get all tasks.

        Returns:
            List of task data dictionaries
        """
        return self.api_client.get_tasks()

    def get_tasks_by_project_id(self, project_id: str) -> list[TaskData]:
        """Get tasks by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of task data dictionaries
        """
        return self.api_client.get_tasks(project_id=project_id)

    def get_tasks_by_section_id(self, section_id: str) -> list[TaskData]:
        """Get tasks by section ID.

        Args:
            section_id: The section ID

        Returns:
            List of task data dictionaries
        """
        return self.api_client.get_tasks(section_id=section_id)

    def get_task_by_id(self, task_id: str) -> TaskData | None:
        """Get a task by ID.

        Args:
            task_id: The task ID

        Returns:
            Task data dictionary or None if not found
        """
        tasks = self.api_client.get_tasks()
        for task in tasks:
            if task["id"] == task_id:
                return task
        return None

    def get_all_labels(self) -> list[LabelData]:
        """Get all labels.

        Returns:
            List of label data dictionaries
        """
        return self.api_client.get_labels()

    def get_label_by_id(self, label_id: str) -> LabelData | None:
        """Get a label by ID.

        Args:
            label_id: The label ID

        Returns:
            Label data dictionary or None if not found
        """
        labels = self.api_client.get_labels()
        for label in labels:
            if label["id"] == label_id:
                return label
        return None

    def get_comments_by_task_id(self, task_id: str) -> list[CommentData]:
        """Get comments by task ID.

        Args:
            task_id: The task ID

        Returns:
            List of comment data dictionaries
        """
        return self.api_client.get_comments(task_id=task_id)

    def get_comments_by_project_id(self, project_id: str) -> list[CommentData]:
        """Get comments by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of comment data dictionaries
        """
        return self.api_client.get_comments(project_id=project_id)

    def save_data(self, data: PlanningData, file_path: str) -> None:
        """Save Planning data to a file.

        Args:
            data: Complete Planning data structure
            file_path: Path to save the data to
        """
        # Ensure the output directory exists
        output_dir = os.path.dirname(file_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
