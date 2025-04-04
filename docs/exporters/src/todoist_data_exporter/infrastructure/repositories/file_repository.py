"""File-based repository implementation."""

import json
import os
from typing import Any, cast


class FileRepository:
    """Repository implementation using a local file."""

    def __init__(self, file_path: str) -> None:
        """Initialize the repository.

        Args:
            file_path: Path to the JSON file containing Planning data
        """
        self.file_path = file_path
        self._data = self._load_data()

    def _load_data(self) -> dict[str, Any]:
        """Load data from the JSON file.

        Returns:
            Planning data structure
        """
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"File not found: {self.file_path}")
        try:
            with open(self.file_path, encoding="utf-8") as f:
                # Cast the result of json.load
                data = cast(dict[str, Any], json.load(f))
            return data
        except json.JSONDecodeError as e:
            raise ValueError(f"Error decoding JSON from {self.file_path}: {e}") from e
        except Exception as e:
            raise OSError(f"Error reading file {self.file_path}: {e}") from e

    def get_all_data(self) -> dict[str, Any]:
        """Get all data from the file.

        Returns:
            Complete Planning data structure
        """
        return self._load_data()

    def get_all_projects(self) -> list[dict[str, Any]]:
        """Get all projects from the data.

        Returns:
            List of project data dictionaries
        """
        data = self._load_data()
        # Cast the list
        return cast(list[dict[str, Any]], data.get("projects", []))

    def get_project_by_id(self, project_id: str) -> dict[str, Any] | None:
        """Get a project by ID.

        Args:
            project_id: The project ID

        Returns:
            Project data dictionary or None if not found
        """
        projects = self.get_all_projects()
        for project in projects:
            if project.get("id") == project_id:
                # Ensure the returned dict matches type hint
                return cast(dict[str, Any], project)
        return None

    def get_all_tasks(self) -> list[dict[str, Any]]:
        """Get all tasks from the data.

        Returns:
            List of task data dictionaries
        """
        data = self._load_data()
        # Cast the list
        tasks = cast(list[dict[str, Any]], data.get("tasks", []))

        # If tasks are nested, we need a more robust extraction
        # For now, assuming tasks are top-level or handled elsewhere
        return tasks

    def get_tasks_by_project_id(self, project_id: str) -> list[dict[str, Any]]:
        """Get tasks by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of task data dictionaries
        """
        # This implementation needs refinement if tasks are nested
        all_tasks = self.get_all_tasks()
        # Cast the list comprehension result
        return cast(
            list[dict[str, Any]], [t for t in all_tasks if t.get("project_id") == project_id]
        )

    def get_tasks_by_section_id(self, section_id: str) -> list[dict[str, Any]]:
        """Get tasks by section ID.

        Args:
            section_id: The section ID

        Returns:
            List of task data dictionaries
        """
        # This implementation needs refinement if tasks are nested
        all_tasks = self.get_all_tasks()
        # Cast the list comprehension result
        return cast(
            list[dict[str, Any]], [t for t in all_tasks if t.get("section_id") == section_id]
        )

    def get_task_by_id(self, task_id: str) -> dict[str, Any] | None:
        """Get a task by ID.

        Args:
            task_id: The task ID

        Returns:
            Task data dictionary or None if not found
        """
        # This implementation needs refinement if tasks are nested
        all_tasks = self.get_all_tasks()
        for task in all_tasks:
            if task.get("id") == task_id:
                # Ensure the returned dict matches type hint
                return cast(dict[str, Any], task)
        return None

    def get_all_sections(self) -> list[dict[str, Any]]:
        """Get all sections from the data.

        Returns:
            List of section data dictionaries
        """
        data = self._load_data()
        # Cast the list
        return cast(list[dict[str, Any]], data.get("sections", []))

    def get_sections_by_project_id(self, project_id: str) -> list[dict[str, Any]]:
        """Get sections by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of section data dictionaries
        """
        all_sections = self.get_all_sections()
        # Cast the list comprehension result
        return cast(
            list[dict[str, Any]], [s for s in all_sections if s.get("project_id") == project_id]
        )

    def get_section_by_id(self, section_id: str) -> dict[str, Any] | None:
        """Get a section by ID.

        Args:
            section_id: The section ID

        Returns:
            Section data dictionary or None if not found
        """
        all_sections = self.get_all_sections()
        for section in all_sections:
            if section.get("id") == section_id:
                # Ensure the returned dict matches type hint
                return cast(dict[str, Any], section)
        return None

    def get_all_labels(self) -> list[dict[str, Any]]:
        """Get all labels from the data.

        Returns:
            List of label data dictionaries
        """
        data = self._load_data()
        # Cast the list
        return cast(list[dict[str, Any]], data.get("labels", []))

    def get_label_by_id(self, label_id: str) -> dict[str, Any] | None:
        """Get a label by ID.

        Args:
            label_id: The label ID

        Returns:
            Label data dictionary or None if not found
        """
        labels = self.get_all_labels()
        for label in labels:
            if label.get("id") == label_id:
                # Ensure the returned dict matches type hint
                return cast(dict[str, Any], label)
        return None

    def get_all_comments(self) -> list[dict[str, Any]]:
        """Get all comments from the data.

        Returns:
            List of comment data dictionaries
        """
        data = self._load_data()
        # Cast the list
        return cast(list[dict[str, Any]], data.get("comments", []))

    def get_comments_by_task_id(self, task_id: str) -> list[dict[str, Any]]:
        """Get comments by task ID.

        Args:
            task_id: The task ID

        Returns:
            List of comment data dictionaries
        """
        all_comments = self.get_all_comments()
        # Cast the list comprehension result
        return cast(list[dict[str, Any]], [c for c in all_comments if c.get("task_id") == task_id])

    def get_comments_by_project_id(self, project_id: str) -> list[dict[str, Any]]:
        """Get comments by project ID.

        Args:
            project_id: The project ID

        Returns:
            List of comment data dictionaries
        """
        all_comments = self.get_all_comments()
        # Cast the list comprehension result
        return cast(
            list[dict[str, Any]], [c for c in all_comments if c.get("project_id") == project_id]
        )

    def get_comment_by_id(self, comment_id: str) -> dict[str, Any] | None:
        """Get a comment by ID.

        Args:
            comment_id: The comment ID

        Returns:
            Comment data dictionary or None if not found
        """
        all_comments = self.get_all_comments()
        for comment in all_comments:
            if comment.get("id") == comment_id:
                # Ensure the returned dict matches type hint
                return cast(dict[str, Any], comment)
        return None

    def save_data(self, data: dict[str, Any], file_path: str) -> None:
        """Save data to a JSON file.

        Args:
            data: Complete Planning data structure
            file_path: Path to save the data to
        """
        # Ensure the directory exists
        output_dir = os.path.dirname(file_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            raise OSError(f"Error writing file {file_path}: {e}") from e
