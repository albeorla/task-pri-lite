"""Application services for the Planning Data exporter."""

# We will patch these where they are defined/imported
from todoist_data_exporter.application.exporters.csv_exporter import CsvExporter
from todoist_data_exporter.application.exporters.exporter import Exporter
from todoist_data_exporter.application.exporters.json_exporter import JsonExporter
from todoist_data_exporter.application.exporters.markdown_exporter import MarkdownExporter
from todoist_data_exporter.application.exporters.schema_validator import SchemaValidationExporterWrapper
from todoist_data_exporter.application.formatters.flat import FlatFormatter
from todoist_data_exporter.application.formatters.hierarchical import HierarchicalFormatter
from todoist_data_exporter.domain.interfaces.repository import (
    TodoistData as PlanningData,
)
from todoist_data_exporter.domain.interfaces.repository import (
    TodoistRepository,
)


class TodoistDataService:
    """Service for retrieving and formatting Planning data."""

    def __init__(self, repository: TodoistRepository) -> None:
        """Initialize the service.

        Args:
            repository: Planning repository
        """
        self.repository = repository
        self.hierarchical_formatter = HierarchicalFormatter()
        self.flat_formatter = FlatFormatter()

    def get_hierarchical_data(self) -> PlanningData:
        """Get hierarchical Planning data.

        Returns:
            Hierarchical Planning data structure
        """
        data = self.repository.get_all_data()
        return self.hierarchical_formatter.format(data)

    def get_flat_data(self) -> PlanningData:
        """Get flat Planning data.

        Returns:
            Flat Planning data structure
        """
        data = self.repository.get_all_data()
        return self.flat_formatter.format(data)


class TodoistExportService:
    """Service for exporting Planning data."""

    def __init__(self, validate_schema: bool = True) -> None:
        """Initialize the service.

        Args:
            validate_schema: Whether to validate data against the schema before exporting
        """
        self.validate_schema = validate_schema
        
        # Create the base exporters
        json_exporter = JsonExporter()
        markdown_exporter = MarkdownExporter()
        csv_exporter = CsvExporter()
        
        # If schema validation is enabled, wrap the exporters
        if validate_schema:
            json_exporter = SchemaValidationExporterWrapper(json_exporter)
            # Note: We only validate JSON exports since they must conform to our schema
            # Markdown and CSV are transformed formats and don't need to match the schema
        
        self.exporters: dict[str, Exporter] = {
            "json": json_exporter,
            "markdown": markdown_exporter,
            "csv": csv_exporter,
        }

    def export_data(self, data: PlanningData, output_path: str, format_type: str) -> None:
        """Export Planning data to a file.

        Args:
            data: Planning data structure
            output_path: Path to save the exported data
            format_type: Export format type (json, markdown, csv)

        Raises:
            ValueError: If the format type is not supported or if schema validation fails
        """
        if format_type not in self.exporters:
            raise ValueError(f"Unsupported format type: {format_type}")

        exporter = self.exporters[format_type]
        exporter.export(data=data, output_path=output_path)
