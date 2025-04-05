"""Factory classes for application components."""

from todoist_data_exporter.application.exporters import (
    CsvExporter,
    Exporter,
    JsonExporter,
    MarkdownExporter,
)


class ExporterFactory:
    """Factory for creating exporters."""

    @staticmethod
    def create(format_type: str) -> Exporter:
        """Create an exporter for the given format type.

        Args:
            format_type: The format type of the exporter to create

        Returns:
            An exporter for the given format type

        Raises:
            ValueError: If the format type is not supported
        """
        format_type = format_type.lower()
        if format_type == "json":
            return JsonExporter()
        elif format_type in ["markdown", "md"]:
            return MarkdownExporter()
        elif format_type == "csv":
            return CsvExporter()
        else:
            raise ValueError(f"Unsupported format: {format_type}")
