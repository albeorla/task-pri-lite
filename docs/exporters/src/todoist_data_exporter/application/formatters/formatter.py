"""Formatter protocol for Todoist data."""

from typing import Protocol, runtime_checkable

from todoist_data_exporter.domain.interfaces.repository import TodoistData


@runtime_checkable
class Formatter(Protocol):
    """Protocol for data formatters."""

    def format(self, data: TodoistData) -> TodoistData:
        """Format data.

        Args:
            data: The data to format

        Returns:
            Formatted data
        """
        ...
