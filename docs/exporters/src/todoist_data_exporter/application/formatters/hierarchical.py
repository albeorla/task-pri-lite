"""Hierarchical formatter for Todoist data."""

from typing import Any

from todoist_data_exporter.domain.interfaces.repository import TodoistData


class HierarchicalFormatter:
    """Formats Todoist data in a hierarchical structure."""

    def format(self, data: TodoistData) -> TodoistData:
        """Format data in a hierarchical structure.

        Args:
            data: The data to format

        Returns:
            Hierarchically formatted data
        """
        # Create a copy of the data to avoid modifying the original
        formatted_data = {"projects": [], "labels": data.get("labels", [])}

        # Preserve metadata if it exists
        if "metadata" in data:
            formatted_data["metadata"] = data["metadata"]

        # Get all projects
        projects = data.get("projects", [])

        # Build project hierarchy
        top_level_projects = []
        project_map = {}

        # First, create a map of all projects by ID
        for project in projects:
            project_map[project["id"]] = project.copy()
            project_map[project["id"]]["child_projects"] = []

        # Then, build the hierarchy
        for _, project in project_map.items():
            if project.get("parent_id"):
                # This is a child project
                parent_id = project["parent_id"]
                if parent_id in project_map:
                    project_map[parent_id]["child_projects"].append(project)
            else:
                # This is a top-level project
                top_level_projects.append(project)

        # Sort projects by order if available
        top_level_projects.sort(key=lambda p: p.get("order", 0))
        for project in project_map.values():
            project["child_projects"].sort(key=lambda p: p.get("order", 0))

        # Add tasks and sections to projects
        for project_id, project in project_map.items():
            # Add sections
            project["sections"] = self._get_sections_for_project(data, project_id)

            # Add top-level tasks (not in any section)
            project["tasks"] = self._get_tasks_for_project(data, project_id, None)

        # Set the top-level projects as the result
        formatted_data["projects"] = top_level_projects

        return formatted_data

    def _get_sections_for_project(self, data: TodoistData, project_id: str) -> list[dict[str, Any]]:
        """Get sections for a project.

        Args:
            data: The data to extract sections from
            project_id: The project ID

        Returns:
            List of sections for the project
        """
        sections = []

        # Check if sections are in the top-level data
        if "sections" in data:
            for section in data["sections"]:
                if section.get("project_id") == project_id:
                    section_copy = section.copy()
                    section_copy["tasks"] = self._get_tasks_for_project(
                        data, project_id, section["id"]
                    )
                    sections.append(section_copy)

        # Check if sections are already in the project
        for project in data.get("projects", []):
            if project["id"] == project_id and "sections" in project:
                for section in project["sections"]:
                    section_copy = section.copy()
                    # If tasks are not already in the section, get them
                    if "tasks" not in section_copy:
                        section_copy["tasks"] = self._get_tasks_for_project(
                            data, project_id, section["id"]
                        )
                    sections.append(section_copy)

        # Sort sections by order if available
        sections.sort(key=lambda s: s.get("order", 0))

        return sections

    def _get_tasks_for_project(
        self, data: TodoistData, project_id: str, section_id: str | None
    ) -> list[dict[str, Any]]:
        """Get tasks for a project and section.

        Args:
            data: The data to extract tasks from
            project_id: The project ID
            section_id: The section ID (None for top-level tasks)

        Returns:
            List of tasks for the project and section
        """
        tasks = []

        # Check if tasks are in the top-level data
        if "tasks" in data:
            for task in data["tasks"]:
                if (
                    task.get("project_id") == project_id
                    and task.get("section_id") == section_id
                    and not task.get("parent_id")
                ):  # Only top-level tasks
                    task_copy = task.copy()
                    task_copy["sub_tasks"] = self._get_sub_tasks(data, task["id"])
                    task_copy["comments"] = self._get_comments_for_task(data, task["id"])
                    tasks.append(task_copy)

        # Check if tasks are already in the project
        for project in data.get("projects", []):
            if project["id"] == project_id:
                # For top-level tasks (not in a section)
                if section_id is None and "tasks" in project:
                    for task in project["tasks"]:
                        if not task.get("section_id") and not task.get("parent_id"):
                            task_copy = task.copy()
                            # If sub_tasks are not already in the task, get them
                            if "sub_tasks" not in task_copy:
                                task_copy["sub_tasks"] = self._get_sub_tasks(data, task["id"])
                            # If comments are not already in the task, get them
                            if "comments" not in task_copy:
                                task_copy["comments"] = self._get_comments_for_task(
                                    data, task["id"]
                                )
                            tasks.append(task_copy)

                # For tasks in a section
                if section_id is not None and "sections" in project:
                    for section in project["sections"]:
                        if section["id"] == section_id and "tasks" in section:
                            for task in section["tasks"]:
                                if not task.get("parent_id"):  # Only top-level tasks
                                    task_copy = task.copy()
                                    # If sub_tasks are not already in the task, get them
                                    if "sub_tasks" not in task_copy:
                                        task_copy["sub_tasks"] = self._get_sub_tasks(
                                            data, task["id"]
                                        )
                                    # If comments are not already in the task, get them
                                    if "comments" not in task_copy:
                                        task_copy["comments"] = self._get_comments_for_task(
                                            data, task["id"]
                                        )
                                    tasks.append(task_copy)

        # Sort tasks by order if available
        tasks.sort(key=lambda t: t.get("order", 0))

        return tasks

    def _get_sub_tasks(self, data: TodoistData, parent_id: str) -> list[dict[str, Any]]:
        """Get sub-tasks for a task.

        Args:
            data: The data to extract sub-tasks from
            parent_id: The parent task ID

        Returns:
            List of sub-tasks for the task
        """
        sub_tasks = []

        # Check if tasks are in the top-level data
        if "tasks" in data:
            for task in data["tasks"]:
                if task.get("parent_id") == parent_id:
                    task_copy = task.copy()
                    task_copy["sub_tasks"] = self._get_sub_tasks(data, task["id"])
                    task_copy["comments"] = self._get_comments_for_task(data, task["id"])
                    sub_tasks.append(task_copy)

        # Check if sub-tasks are already in the parent task
        # First, find the parent task
        parent_task = None

        # Check in top-level tasks
        if "tasks" in data:
            for task in data["tasks"]:
                if task["id"] == parent_id:
                    parent_task = task
                    break

        # If not found, check in projects
        if parent_task is None:
            for project in data.get("projects", []):
                # Check in project tasks
                if "tasks" in project:
                    for task in project["tasks"]:
                        if task["id"] == parent_id:
                            parent_task = task
                            break
                        # Check in task sub-tasks
                        if "sub_tasks" in task:
                            parent_task = self._find_task_in_sub_tasks(task["sub_tasks"], parent_id)
                            if parent_task:
                                break

                # Check in section tasks
                if parent_task is None and "sections" in project:
                    for section in project["sections"]:
                        if "tasks" in section:
                            for task in section["tasks"]:
                                if task["id"] == parent_id:
                                    parent_task = task
                                    break
                                # Check in task sub-tasks
                                if "sub_tasks" in task:
                                    parent_task = self._find_task_in_sub_tasks(
                                        task["sub_tasks"], parent_id
                                    )
                                    if parent_task:
                                        break

        # If parent task is found and has sub-tasks, add them
        if parent_task and "sub_tasks" in parent_task:
            for task in parent_task["sub_tasks"]:
                task_copy = task.copy()
                # If sub_tasks are not already in the task, get them
                if "sub_tasks" not in task_copy:
                    task_copy["sub_tasks"] = self._get_sub_tasks(data, task["id"])
                # If comments are not already in the task, get them
                if "comments" not in task_copy:
                    task_copy["comments"] = self._get_comments_for_task(data, task["id"])
                sub_tasks.append(task_copy)

        # Sort sub-tasks by order if available
        sub_tasks.sort(key=lambda t: t.get("order", 0))

        return sub_tasks

    def _find_task_in_sub_tasks(
        self, sub_tasks: list[dict[str, Any]], task_id: str
    ) -> dict[str, Any] | None:
        """Find a task in a list of sub-tasks recursively.

        Args:
            sub_tasks: The list of sub-tasks to search in
            task_id: The task ID to find

        Returns:
            The task if found, None otherwise
        """
        for task in sub_tasks:
            if task["id"] == task_id:
                return task
            if "sub_tasks" in task:
                found_task = self._find_task_in_sub_tasks(task["sub_tasks"], task_id)
                if found_task:
                    return found_task
        return None

    def _get_comments_for_task(self, data: TodoistData, task_id: str) -> list[dict[str, Any]]:
        """Get comments for a task.

        Args:
            data: The data to extract comments from
            task_id: The task ID

        Returns:
            List of comments for the task
        """
        comments = []

        # Check if comments are in the top-level data
        if "comments" in data:
            for comment in data["comments"]:
                if comment.get("task_id") == task_id:
                    comments.append(comment.copy())

        # Check if comments are already in the task
        # First, find the task
        task = None

        # Check in top-level tasks
        if "tasks" in data:
            for t in data["tasks"]:
                if t["id"] == task_id:
                    task = t
                    break

        # If not found, check in projects
        if task is None:
            for project in data.get("projects", []):
                # Check in project tasks
                if "tasks" in project:
                    for t in project["tasks"]:
                        if t["id"] == task_id:
                            task = t
                            break
                        # Check in task sub-tasks
                        if "sub_tasks" in t:
                            task = self._find_task_in_sub_tasks(t["sub_tasks"], task_id)
                            if task:
                                break

                # Check in section tasks
                if task is None and "sections" in project:
                    for section in project["sections"]:
                        if "tasks" in section:
                            for t in section["tasks"]:
                                if t["id"] == task_id:
                                    task = t
                                    break
                                # Check in task sub-tasks
                                if "sub_tasks" in t:
                                    task = self._find_task_in_sub_tasks(t["sub_tasks"], task_id)
                                    if task:
                                        break

        # If task is found and has comments, add them
        if task and "comments" in task:
            for comment in task["comments"]:
                comments.append(comment.copy())

        # Sort comments by posted_at if available
        comments.sort(key=lambda c: c.get("posted_at", ""))

        return comments
