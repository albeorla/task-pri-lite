"""JSON exporter for Todoist data."""

import datetime
import json
from typing import Any

from todoist_data_exporter.application.exporters.base_exporter import BaseExporter

# Import the TodoistData type for type hints
from todoist_data_exporter.domain.interfaces.repository import TodoistData


class JsonExporter(BaseExporter):
    """Exports Todoist data to JSON format."""

    def _export_implementation(self, data: TodoistData, output_path: str) -> None:
        """Export data to a JSON file.

        Args:
            data: The data to export
            output_path: Path to save the exported data
        """
        # Check if data already has metadata
        if "metadata" in data:
            # Use existing metadata
            data_with_metadata = data
        else:
            # Add metadata to the data
            data_with_metadata = self._add_metadata(data)

        # Export the data with metadata
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data_with_metadata, f, indent=2, ensure_ascii=False)

    def _add_metadata(self, data: TodoistData) -> TodoistData:
        """Add metadata to the data.

        Args:
            data: The data to add metadata to

        Returns:
            Data with metadata added
        """
        # Calculate metadata
        metadata = {
            "export_date": datetime.datetime.now().isoformat(),
            "counts": self._calculate_counts(data),
            "statistics": self._calculate_statistics(data),
        }

        # Create a new dictionary with metadata at the top
        result = {"metadata": metadata}

        # Add the rest of the data
        for key, value in data.items():
            result[key] = value

        return result

    def _calculate_counts(self, data: TodoistData) -> dict[str, int]:
        """Calculate counts of various entities in the data.

        Args:
            data: The data to calculate counts for

        Returns:
            Dictionary of counts
        """
        # Initialize counts
        counts = {
            "projects": 0,
            "sections": 0,
            "tasks": 0,
            "sub_tasks": 0,
            "comments": 0,
            "labels": 0,
        }

        # Count projects (including child projects)
        projects = data.get("projects", [])
        counts["projects"] = self._count_projects(projects)

        # Count sections
        if "sections" in data and isinstance(data["sections"], list):
            # Flat structure
            counts["sections"] = len(data["sections"])
        else:
            # Hierarchical structure
            for project in projects:
                if "sections" in project and isinstance(project["sections"], list):
                    counts["sections"] += len(project["sections"])

        # Get all tasks (including sub-tasks)
        all_tasks = self._get_all_tasks_hierarchical(data)

        # Count main tasks (not sub-tasks)
        main_tasks = [task for task in all_tasks if not task.get("parent_id")]
        sub_tasks = [task for task in all_tasks if task.get("parent_id")]

        counts["tasks"] = len(main_tasks)
        counts["sub_tasks"] = len(sub_tasks)

        # Count comments
        comment_count = 0
        if "comments" in data and isinstance(data["comments"], list):
            # Flat structure
            comment_count = len(data["comments"])
        else:
            # Count comments in all tasks
            for task in all_tasks:
                if "comments" in task and isinstance(task["comments"], list):
                    comment_count += len(task["comments"])

        counts["comments"] = comment_count

        # Count labels
        counts["labels"] = len(data.get("labels", []))

        return counts

    def _count_all_sub_tasks(self, tasks: list[dict[str, Any]]) -> int:
        """Count all sub-tasks recursively.

        Args:
            tasks: List of tasks

        Returns:
            Total number of sub-tasks
        """
        count = len(tasks)

        for task in tasks:
            if "sub_tasks" in task:
                count += self._count_all_sub_tasks(task["sub_tasks"])

        return count

    def _count_all_comments(self, tasks: list[dict[str, Any]]) -> int:
        """Count all comments in tasks recursively.

        Args:
            tasks: List of tasks

        Returns:
            Total number of comments
        """
        count = 0

        for task in tasks:
            if "comments" in task:
                count += len(task["comments"])
            if "sub_tasks" in task:
                count += self._count_all_comments(task["sub_tasks"])

        return count

    def _count_projects(self, projects: list[dict[str, Any]]) -> int:
        """Count the total number of projects including child projects.

        Args:
            projects: List of projects

        Returns:
            Total number of projects
        """
        count = len(projects)

        for project in projects:
            if "child_projects" in project:
                count += self._count_projects(project["child_projects"])

        return count

    def _count_tasks(self, tasks: list[dict[str, Any]]) -> dict[str, int]:
        """Count the total number of tasks and sub-tasks.

        Args:
            tasks: List of tasks

        Returns:
            Dictionary with task and sub-task counts
        """
        result = {"tasks": len(tasks), "sub_tasks": 0}

        for task in tasks:
            if "sub_tasks" in task:
                sub_task_counts = self._count_tasks(task["sub_tasks"])
                result["sub_tasks"] += sub_task_counts["tasks"]
                result["sub_tasks"] += sub_task_counts["sub_tasks"]

        return result

    def _calculate_statistics(self, data: TodoistData) -> dict[str, Any]:
        """Calculate various statistics about the data.

        Args:
            data: The data to calculate statistics for

        Returns:
            Dictionary of statistics
        """
        stats = {
            "completed_tasks": 0,
            "incomplete_tasks": 0,
            "completion_rate": 0.0,
            "tasks_with_due_dates": 0,
            "tasks_with_labels": 0,
            "tasks_with_comments": 0,
            "average_labels_per_task": 0.0,
            "average_comments_per_task": 0.0,
        }

        # Get all tasks (including sub-tasks)
        all_tasks = self._get_all_tasks_hierarchical(data)
        total_tasks = len(all_tasks)

        if total_tasks > 0:
            # Count completed and incomplete tasks
            for task in all_tasks:
                if task.get("is_completed", False):
                    stats["completed_tasks"] += 1
                else:
                    stats["incomplete_tasks"] += 1

                # Count tasks with due dates
                if task.get("due"):
                    stats["tasks_with_due_dates"] += 1

                # Count tasks with labels
                if task.get("labels"):
                    stats["tasks_with_labels"] += 1
                    stats["average_labels_per_task"] += len(task["labels"])

                # Count tasks with comments
                if task.get("comments"):
                    stats["tasks_with_comments"] += 1
                    stats["average_comments_per_task"] += len(task["comments"])

            # Calculate completion rate
            stats["completion_rate"] = round(stats["completed_tasks"] / total_tasks * 100, 2)

            # Calculate averages
            stats["average_labels_per_task"] = round(
                stats["average_labels_per_task"] / total_tasks, 2
            )
            stats["average_comments_per_task"] = round(
                stats["average_comments_per_task"] / total_tasks, 2
            )

        return stats

    def _get_all_tasks_hierarchical(self, data: TodoistData) -> list[dict[str, Any]]:
        """Get all tasks from hierarchical data.

        Args:
            data: The hierarchical data to extract tasks from

        Returns:
            List of all tasks
        """
        all_tasks = []

        # Get projects
        projects = data.get("projects", [])

        # Process each project
        for project in projects:
            # Add tasks directly under the project
            if "tasks" in project:
                all_tasks.extend(project["tasks"])
                # Add sub-tasks
                for task in project["tasks"]:
                    if "sub_tasks" in task:
                        all_tasks.extend(self._get_all_sub_tasks_recursive(task["sub_tasks"]))

            # Add tasks in sections
            if "sections" in project:
                for section in project["sections"]:
                    if "tasks" in section:
                        all_tasks.extend(section["tasks"])
                        # Add sub-tasks
                        for task in section["tasks"]:
                            if "sub_tasks" in task:
                                all_tasks.extend(
                                    self._get_all_sub_tasks_recursive(task["sub_tasks"])
                                )

        return all_tasks

    def _get_all_sub_tasks_recursive(self, tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Get all sub-tasks recursively.

        Args:
            tasks: List of tasks

        Returns:
            List of all sub-tasks
        """
        all_sub_tasks = []

        for task in tasks:
            all_sub_tasks.append(task)
            if "sub_tasks" in task:
                all_sub_tasks.extend(self._get_all_sub_tasks_recursive(task["sub_tasks"]))

        return all_sub_tasks

    def _get_all_tasks(self, data: TodoistData) -> list[dict[str, Any]]:
        """Get all tasks including sub-tasks.

        Args:
            data: The data to extract tasks from

        Returns:
            List of all tasks
        """
        all_tasks = []

        # Add top-level tasks
        tasks = data.get("tasks", [])
        all_tasks.extend(tasks)

        # Add sub-tasks recursively
        for task in tasks:
            if "sub_tasks" in task:
                all_tasks.extend(self._get_all_sub_tasks(task["sub_tasks"]))

        return all_tasks

    def _get_all_sub_tasks(self, tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Get all sub-tasks recursively.

        Args:
            tasks: List of tasks

        Returns:
            List of all sub-tasks
        """
        all_sub_tasks = []

        for task in tasks:
            all_sub_tasks.append(task)
            if "sub_tasks" in task:
                all_sub_tasks.extend(self._get_all_sub_tasks(task["sub_tasks"]))

        return all_sub_tasks
