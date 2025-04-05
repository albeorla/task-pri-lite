"""Service interfaces for the Planning Data exporter."""

from typing import Protocol, runtime_checkable

from todoist_data_exporter.domain.interfaces.repository import (
    TodoistData as PlanningData,
)


@runtime_checkable
class DataService(Protocol):
    """Protocol for data service."""

    def get_hierarchical_data(self) -> PlanningData:
        """Get hierarchical Planning data.

        Returns:
            Hierarchical Planning data structure
        """
        ...

    def get_flat_data(self) -> PlanningData:
        """Get flat Planning data.

        Returns:
            Flat Planning data structure
        """
        ...


@runtime_checkable
class ExportService(Protocol):
    """Protocol for export service."""

    def export_data(self, data: PlanningData, output_path: str, format_type: str) -> None:
        """Export Planning data to a file.

        Args:
            data: Planning data structure
            output_path: Path to save the exported data
            format_type: Export format type (json, markdown, csv)
        """
        ...
