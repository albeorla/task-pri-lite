"""CSV exporter for Todoist data."""

import csv
import os
from typing import Any

from todoist_data_exporter.application.exporters.base_exporter import BaseExporter
from todoist_data_exporter.domain.interfaces.repository import TodoistData


class CsvExporter(BaseExporter):
    """Exports Todoist data to CSV format."""

    def _export_implementation(self, data: TodoistData, output_path: str) -> None:
        """Export data to CSV files.

        Args:
            data: The data to export
            output_path: Base path to save the exported data
                (will be used as a prefix for multiple CSV files)
        """
        # Ensure the output directory exists for all CSV files
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Export projects
        if data.get("projects"):
            self._export_projects(data["projects"], f"{output_path}_projects.csv")

        # Export tasks
        tasks = self._extract_all_tasks(data)
        if tasks:
            self._export_tasks(tasks, f"{output_path}_tasks.csv")

        # Export labels
        if data.get("labels"):
            self._export_labels(data["labels"], f"{output_path}_labels.csv")

    def _export_projects(self, projects: list[dict[str, Any]], output_path: str) -> None:
        """Export projects to a CSV file.

        Args:
            projects: The projects to export
            output_path: Path to save the exported data
        """
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["id", "name", "parent_id", "color", "is_shared", "is_favorite"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            # Write all projects (including child projects)
            all_projects = []
            for project in projects:
                all_projects.append(project)
                if "child_projects" in project:
                    all_projects.extend(self._flatten_projects(project["child_projects"]))

            for project in all_projects:
                writer.writerow(
                    {
                        "id": project["id"],
                        "name": project["name"],
                        "parent_id": project.get("parent_id", ""),
                        "color": project.get("color", ""),
                        "is_shared": str(project.get("is_shared", False)).lower(),
                        "is_favorite": str(project.get("is_favorite", False)).lower(),
                    }
                )

    def _export_tasks(self, tasks: list[dict[str, Any]], output_path: str) -> None:
        """Export tasks to a CSV file.

        Args:
            tasks: The tasks to export
            output_path: Path to save the exported data
        """
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = [
                "id",
                "content",
                "project_id",
                "section_id",
                "parent_id",
                "is_completed",
                "priority",
                "due_date",
                "labels",
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for task in tasks:
                # Extract due date if present
                due_date = ""
                if task.get("due"):
                    due = task["due"]
                    if due.get("datetime"):
                        due_date = due["datetime"]
                    elif due.get("date"):
                        due_date = due["date"]

                # Join labels if present
                labels = '"' + ",".join(task.get("labels", [])) + '"'

                writer.writerow(
                    {
                        "id": task["id"],
                        "content": task["content"],
                        "project_id": task.get("project_id", ""),
                        "section_id": task.get("section_id", ""),
                        "parent_id": task.get("parent_id", ""),
                        "is_completed": str(task.get("is_completed", False)).lower(),
                        "priority": task.get("priority", 1),
                        "due_date": due_date,
                        "labels": labels,
                    }
                )

    def _export_labels(self, labels: list[dict[str, Any]], output_path: str) -> None:
        """Export labels to a CSV file.

        Args:
            labels: The labels to export
            output_path: Path to save the exported data
        """
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["id", "name", "color", "is_favorite"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for label in labels:
                writer.writerow(
                    {
                        "id": label["id"],
                        "name": label["name"],
                        "color": label.get("color", ""),
                        "is_favorite": str(label.get("is_favorite", False)).lower(),
                    }
                )

    def _flatten_projects(self, projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Flatten a hierarchical list of projects.

        Args:
            projects: The projects to flatten

        Returns:
            A flat list of projects
        """
        result = []
        for project in projects:
            result.append(project)
            if project.get("child_projects"):
                result.extend(self._flatten_projects(project["child_projects"]))
        return result

    def _extract_all_tasks(self, data: TodoistData) -> list[dict[str, Any]]:
        """Extract all tasks from the data, ensuring section_id is present for section tasks."""
        tasks = []
        projects_data = data.get("projects", [])

        for project in projects_data:
            # Process top-level tasks in the project
            project_tasks = project.get("tasks", [])
            for task in project_tasks:
                # Ensure project_id is set for top-level tasks
                task["project_id"] = project["id"]
                tasks.append(task)
                tasks.extend(self._extract_sub_tasks(task))

            # Process tasks within sections
            sections_data = project.get("sections", [])
            for section in sections_data:
                section_tasks = section.get("tasks", [])
                for task in section_tasks:
                    # Ensure project_id and section_id are set for section tasks
                    task["project_id"] = project["id"]
                    task["section_id"] = section["id"]
                    tasks.append(task)
                    tasks.extend(self._extract_sub_tasks(task))

            # Recursively process child projects
            child_projects = project.get("child_projects", [])
            for child_project in child_projects:
                # Pass parent project ID if needed, or assume structure is flat here
                tasks.extend(self._extract_tasks_from_project(child_project))

        return tasks

    def _extract_tasks_from_project(self, project: dict[str, Any]) -> list[dict[str, Any]]:
        """Extract all tasks from a project, ensuring section_id is present."""
        tasks = []
        project_id = project["id"]

        # Process top-level tasks
        project_tasks = project.get("tasks", [])
        for task in project_tasks:
            task["project_id"] = project_id  # Ensure project_id
            tasks.append(task)
            tasks.extend(self._extract_sub_tasks(task))

        # Process tasks within sections
        sections_data = project.get("sections", [])
        for section in sections_data:
            section_id = section["id"]
            section_tasks = section.get("tasks", [])
            for task in section_tasks:
                task["project_id"] = project_id  # Ensure project_id
                task["section_id"] = section_id  # Ensure section_id
                tasks.append(task)
                tasks.extend(self._extract_sub_tasks(task))

        # Recursively process child projects
        child_projects = project.get("child_projects", [])
        for child_project in child_projects:
            tasks.extend(self._extract_tasks_from_project(child_project))

        return tasks

    def _extract_sub_tasks(self, task: dict[str, Any]) -> list[dict[str, Any]]:
        """Extract all sub-tasks recursively, ensuring parent context is kept if needed."""
        sub_tasks = []
        parent_id = task["id"]
        project_id = task.get("project_id")  # Inherit project/section if needed
        section_id = task.get("section_id")

        for sub_task_data in task.get("sub_tasks", []):
            # Ensure parent context is added to sub-task dict if not present
            sub_task_data["parent_id"] = parent_id
            if project_id and "project_id" not in sub_task_data:
                sub_task_data["project_id"] = project_id
            if section_id and "section_id" not in sub_task_data:
                sub_task_data["section_id"] = section_id

            sub_tasks.append(sub_task_data)
            sub_tasks.extend(self._extract_sub_tasks(sub_task_data))  # Recurse

        return sub_tasks
