"""Exporter interface for the Todoist data exporter."""

import abc
from typing import Any


class Exporter(abc.ABC):
    """Interface for exporters."""

    @abc.abstractmethod
    def export(self, data: dict[str, Any], output_path: str) -> None:
        """Export data to a file.

        Args:
            data: The data to export
            output_path: The path to write the exported data to
        """
        pass
