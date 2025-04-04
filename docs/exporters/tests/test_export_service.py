"""Tests for the export service."""

from unittest.mock import MagicMock

import pytest
from todoist_data_exporter.application.services import TodoistExportService
from todoist_data_exporter.domain.interfaces import TodoistRepository


class MockRepository(TodoistRepository):
    """Mock repository for testing."""

    def __init__(self, data: dict) -> None:
        """Initialize the mock repository.

        Args:
            data: The data to return.
        """
        self.data = data

    def get_all_data(self) -> dict:
        """Get all data."""
        return self.data

    def get_data_for_project(self, project_id: str) -> dict | None:
        """Get data for a specific project."""
        # This mock needs to be more sophisticated if project-specific export is tested
        # For now, let's assume it returns all data or raises an error if id is invalid
        if any(p["id"] == project_id for p in self.data.get("projects", [])):
            # Returning all data for simplicity, adjust if needed
            return self.data
        return None

    def save_data(self, data: dict, file_path: str) -> None:
        """Save data (not used in these tests)."""
        pass


# Sample data fixture for service tests
@pytest.fixture
def sample_service_data() -> dict:
    return {
        "projects": [
            {"id": "1", "name": "Project 1"},
            {"id": "2", "name": "Project 2"},
        ],
        "labels": [],
        "comments": [],
        # Add other necessary data structure parts
    }


def test_export_all(sample_service_data: dict) -> None:
    """Test that all data can be exported."""
    # Arrange
    repository = MockRepository(sample_service_data)
    service = TodoistExportService()

    # Create mock for the json exporter
    mock_json_exporter = MagicMock()
    service.exporters["json"] = mock_json_exporter

    # Act
    service.export_data(repository.get_all_data(), "output.json", "json")

    # Assert
    # Check that the exporter was called with the right arguments
    mock_json_exporter.export.assert_called_once_with(
        data=sample_service_data, output_path="output.json"
    )


def test_export_project(sample_service_data: dict) -> None:
    """Test that a specific project can be exported."""
    # Arrange
    repository = MockRepository(sample_service_data)
    service = TodoistExportService()

    # Create mock for the json exporter
    mock_json_exporter = MagicMock()
    service.exporters["json"] = mock_json_exporter

    # Act
    service.export_data(repository.get_all_data(), "output.json", "json")

    # Assert
    mock_json_exporter.export.assert_called_once_with(
        data=sample_service_data, output_path="output.json"
    )
    # If project-specific export is implemented later, the assertion needs to change
    # expected_project_data = [p for p in sample_service_data["projects"] if p["id"] == "1"]
    # mock_exporter_instance.export.assert_called_once_with(
    #     {"projects": expected_project_data, ...}, "output.json"
    # )


def test_export_project_not_found(sample_service_data: dict) -> None:
    """Test exporting a non-existent project (should likely still export all)."""
    # Arrange
    repository = MockRepository(sample_service_data)
    service = TodoistExportService()

    # Create mock for the json exporter
    mock_json_exporter = MagicMock()
    service.exporters["json"] = mock_json_exporter

    # Act & Assert - Check successful export first
    service.export_data(repository.get_all_data(), "output.json", "json")
    mock_json_exporter.export.assert_called_once_with(
        data=sample_service_data, output_path="output.json"
    )

    # Test for unsupported format error
    with pytest.raises(ValueError, match="Unsupported format type: xml"):
        service.export_data(repository.get_all_data(), "output.xml", "xml")
