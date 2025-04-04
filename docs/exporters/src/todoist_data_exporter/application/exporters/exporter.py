"""Exporter protocol for Todoist data."""

from typing import Protocol, runtime_checkable

from todoist_data_exporter.domain.interfaces.repository import TodoistData


@runtime_checkable
class Exporter(Protocol):
    """Protocol for data exporters."""

    def export(self, data: TodoistData, output_path: str) -> None:
        """Export data to a file.

        Args:
            data: The data to export
            output_path: Path to save the exported data
        """
        ...
