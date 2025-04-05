"""Flat formatter for Todoist data."""

from typing import Any

from todoist_data_exporter.domain.interfaces.repository import TodoistData


class FlatFormatter:
    """Formats Todoist data in a flat structure."""

    def format(self, data: TodoistData) -> TodoistData:
        """Format data in a flat structure.

        Args:
            data: The data to format

        Returns:
            Flat formatted data
        """
        # Create a copy of the data to avoid modifying the original
        formatted_data = {
            "projects": [],
            "sections": [],
            "tasks": [],
            "comments": [],
            "labels": data.get("labels", []),
        }

        # Preserve metadata if it exists
        if "metadata" in data:
            formatted_data["metadata"] = data["metadata"]

        # Extract all projects (including child projects)
        projects = data.get("projects", [])
        all_projects = []
        for project in projects:
            all_projects.append(project.copy())
            if "child_projects" in project:
                all_projects.extend(self._flatten_projects(project["child_projects"]))

        # Remove child_projects from all projects
        for project in all_projects:
            if "child_projects" in project:
                del project["child_projects"]
            if "sections" in project:
                del project["sections"]
            if "tasks" in project:
                del project["tasks"]

        # Sort projects by order if available
        all_projects.sort(key=lambda p: p.get("order", 0))

        # Extract all sections
        sections = data.get("sections", [])
        all_sections = []
        for section in sections:
            section_copy = section.copy()
            if "tasks" in section_copy:
                del section_copy["tasks"]
            all_sections.append(section_copy)

        # Sort sections by order if available
        all_sections.sort(key=lambda s: s.get("order", 0))

        # Extract all tasks (including sub-tasks)
        tasks = data.get("tasks", [])
        all_tasks = []
        for task in tasks:
            task_copy = task.copy()
            if "sub_tasks" in task_copy:
                del task_copy["sub_tasks"]
            if "comments" in task_copy:
                del task_copy["comments"]
            all_tasks.append(task_copy)

        # Sort tasks by order if available
        all_tasks.sort(key=lambda t: t.get("order", 0))

        # Extract all comments
        comments = data.get("comments", [])
        all_comments = [comment.copy() for comment in comments]

        # Sort comments by posted_at if available
        all_comments.sort(key=lambda c: c.get("posted_at", ""))

        # Set the result
        formatted_data["projects"] = all_projects
        formatted_data["sections"] = all_sections
        formatted_data["tasks"] = all_tasks
        formatted_data["comments"] = all_comments

        return formatted_data

    def _flatten_projects(self, projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Flatten a hierarchical list of projects.

        Args:
            projects: The projects to flatten

        Returns:
            A flat list of projects
        """
        result = []
        for project in projects:
            project_copy = project.copy()
            if "child_projects" in project:
                result.extend(self._flatten_projects(project["child_projects"]))
                del project_copy["child_projects"]
            if "sections" in project_copy:
                del project_copy["sections"]
            if "tasks" in project_copy:
                del project_copy["tasks"]
            result.append(project_copy)
        return result
