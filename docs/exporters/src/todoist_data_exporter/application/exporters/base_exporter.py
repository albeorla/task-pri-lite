"""Base exporter for Todoist data."""

import os

from todoist_data_exporter.domain.interfaces.repository import TodoistData


class BaseExporter:
    """Base class for all exporters."""

    def export(self, data: TodoistData, output_path: str) -> None:
        """Export data to a file.

        Args:
            data: The data to export
            output_path: Path to save the exported data
        """
        # Ensure the output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Call the implementation-specific export method
        self._export_implementation(data, output_path)

    def _export_implementation(self, data: TodoistData, output_path: str) -> None:
        """Implementation-specific export logic.

        Args:
            data: The data to export
            output_path: Path to save the exported data
        """
        raise NotImplementedError("Subclasses must implement this method")
