"""Markdown exporter for Todoist data."""

from typing import Any, TextIO

from todoist_data_exporter.application.exporters.base_exporter import BaseExporter
from todoist_data_exporter.domain.interfaces.repository import TodoistData


class MarkdownExporter(BaseExporter):
    """Exports Todoist data to Markdown format."""

    def _export_implementation(self, data: TodoistData, output_path: str) -> None:
        """Export data to a Markdown file.

        Args:
            data: The data to export
            output_path: Path to save the exported data
        """
        with open(output_path, "w", encoding="utf-8") as f:
            self._write_markdown(data, f)

    def _write_markdown(self, data: TodoistData, file: TextIO) -> None:
        """Write Todoist data as Markdown to a file.

        Args:
            data: The data to write
            file: The file to write to
        """
        # Write title
        file.write("# Todoist Export\n\n")

        # Write projects
        if data.get("projects"):
            file.write("## Projects\n\n")
            for project in data["projects"]:
                self._write_project(project, file, level=0)

        # Write labels
        if data.get("labels"):
            file.write("\n## Labels\n\n")
            for label in data["labels"]:
                file.write(f"- {label['name']}")
                if label.get("color"):
                    file.write(f" (Color: {label['color']})")
                file.write("\n")

    def _write_project(self, project: dict[str, Any], file: TextIO, level: int) -> None:
        """Write a project as Markdown to a file.

        Args:
            project: The project to write
            file: The file to write to
            level: The indentation level
        """
        # Write project header
        header_level = level + 3  # Start with ### for top-level projects
        header = "#" * min(header_level, 6)  # Maximum header level is 6
        file.write(f"{header} {project['name']}\n\n")

        # Write project details
        if project.get("is_shared"):
            file.write("*Shared project*\n\n")
        if project.get("is_favorite"):
            file.write("*Favorite project*\n\n")

        # Write sections
        if project.get("sections"):
            for section in project["sections"]:
                file.write(f"**{section['name']}**\n\n")
                if section.get("tasks"):
                    self._write_tasks(section["tasks"], file, level=0)
                file.write("\n")

        # Write top-level tasks
        if project.get("tasks"):
            self._write_tasks(project["tasks"], file, level=0)

        # Write child projects
        if project.get("child_projects"):
            for child_project in project["child_projects"]:
                self._write_project(child_project, file, level=level + 1)

    def _write_tasks(self, tasks: list[dict[str, Any]], file: TextIO, level: int) -> None:
        """Write tasks as Markdown to a file.

        Args:
            tasks: The tasks to write
            file: The file to write to
            level: The indentation level
        """
        for task in tasks:
            # Write task
            indent = "  " * level
            checkbox = "- [x] " if task.get("is_completed", False) else "- [ ] "
            file.write(f"{indent}{checkbox}{task['content']}\n")

            # Write task description
            if task.get("description"):
                description_lines = task["description"].split("\n")
                for line in description_lines:
                    file.write(f"{indent}  {line}\n")
                file.write("\n")

            # Write task due date
            if task.get("due"):
                due = task["due"]
                if due.get("datetime"):
                    file.write(f"{indent}  Due: {due['datetime']}\n")
                elif due.get("date"):
                    file.write(f"{indent}  Due: {due['date']}\n")

            # Write task labels
            if task.get("labels"):
                labels_str = ", ".join(task["labels"])
                file.write(f"{indent}  Labels: {labels_str}\n")

            # Write task comments
            if task.get("comments"):
                file.write(f"{indent}  Comments:\n")
                for comment in task["comments"]:
                    file.write(f"{indent}    - {comment['content']}\n")

            # Write sub-tasks
            if task.get("sub_tasks"):
                self._write_tasks(task["sub_tasks"], file, level=level + 1)
