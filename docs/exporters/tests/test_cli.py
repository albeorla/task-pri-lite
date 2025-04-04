"""Tests for the CLI."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner
from todoist_data_exporter.cli import cli


@pytest.fixture
def runner() -> CliRunner:
    """Create a CLI runner for testing.

    Returns:
        A CLI runner.
    """
    return CliRunner()


def test_export_command_help(runner: CliRunner) -> None:
    """Test that the export command help works.

    Args:
        runner: The CLI runner.
    """
    result = runner.invoke(cli, ["export", "--help"])
    assert result.exit_code == 0
    assert "Export planning data to a file." in result.output
    assert "--api-token TEXT" in result.output
    assert "--format [json|markdown|csv]" in result.output


def test_backup_command_help(runner: CliRunner) -> None:
    """Test that the backup command help works.

    Args:
        runner: The CLI runner.
    """
    result = runner.invoke(cli, ["backup", "--help"])
    assert result.exit_code == 0
    assert "Backup all planning data to a JSON file." in result.output
    assert "--api-token TEXT" in result.output
    assert "Output file path" in result.output


@patch("todoist_data_exporter.cli.PlanningApiRepository")
@patch("todoist_data_exporter.cli.PlanningClient")
def test_export_with_api_token(
    mock_planning_client_class: MagicMock,
    mock_api_repository_class: MagicMock,
    runner: CliRunner,
) -> None:
    """Test that the export command works with an API token.

    Args:
        mock_planning_client_class: Mock for the Planning client class.
        mock_api_repository_class: Mock for the API repository class.
        runner: The CLI runner.
    """
    # Arrange
    mock_client_instance = MagicMock()
    mock_planning_client_class.return_value = mock_client_instance

    mock_repository_instance = MagicMock()
    mock_api_repository_class.return_value = mock_repository_instance
    mock_data_service = MagicMock()
    mock_export_service = MagicMock()

    with (
        patch("todoist_data_exporter.cli.TodoistDataService") as mock_data_service_class,
        patch("todoist_data_exporter.cli.TodoistExportService") as mock_export_service_class,
    ):
        mock_data_service_class.return_value = mock_data_service
        mock_export_service_class.return_value = mock_export_service

        mock_data = {"projects": [], "labels": []}
        mock_data_service.get_hierarchical_data.return_value = mock_data
        mock_data_service.get_flat_data.return_value = mock_data

        # Act
        result = runner.invoke(
            cli,
            [
                "export",
                "--api-token",
                "test-token",
                "--output",
                "output.json",
            ],
        )

        # Assert
        assert result.exit_code == 0, f"CLI failed: {result.output}"
        mock_planning_client_class.assert_called_once_with(api_token="test-token")
        mock_api_repository_class.assert_called_once_with(api_client=mock_client_instance)
        mock_data_service_class.assert_called_once_with(mock_repository_instance)
        mock_data_service.get_hierarchical_data.assert_called_once()
        mock_export_service_class.assert_called_once_with()
        mock_export_service.export_data.assert_called_once_with(mock_data, "output.json", "json")


@patch("todoist_data_exporter.cli.FileRepository")
def test_export_with_input_file(
    mock_file_repository_class: MagicMock,
    runner: CliRunner,
    tmp_path: Path,
) -> None:
    """Test that the export command works with an input file.

    Args:
        mock_file_repository_class: Mock for the file repository class.
        runner: The CLI runner.
        tmp_path: Temporary directory for the test.
    """
    # Arrange
    mock_repository_instance = MagicMock()
    mock_file_repository_class.return_value = mock_repository_instance
    mock_data_service = MagicMock()
    mock_export_service = MagicMock()

    input_file = tmp_path / "input.json"
    input_file.write_text('{"projects": [], "labels": []}')

    with (
        patch("todoist_data_exporter.cli.TodoistDataService") as mock_data_service_class,
        patch("todoist_data_exporter.cli.TodoistExportService") as mock_export_service_class,
    ):
        mock_data_service_class.return_value = mock_data_service
        mock_export_service_class.return_value = mock_export_service

        mock_data = {"projects": [], "labels": []}
        mock_data_service.get_hierarchical_data.return_value = mock_data
        mock_data_service.get_flat_data.return_value = mock_data

        # Act
        result = runner.invoke(
            cli,
            [
                "export",
                "--input-file",
                str(input_file),
                "--output",
                "output.json",
            ],
        )

        # Assert
        assert result.exit_code == 0, f"CLI failed: {result.output}"
        mock_file_repository_class.assert_called_once_with(str(input_file))
        mock_data_service_class.assert_called_once_with(mock_repository_instance)
        mock_data_service.get_hierarchical_data.assert_called_once()
        mock_export_service_class.assert_called_once_with()
        mock_export_service.export_data.assert_called_once_with(mock_data, "output.json", "json")


@patch("todoist_data_exporter.cli.PlanningApiRepository")
@patch("todoist_data_exporter.cli.PlanningClient")
@patch("todoist_data_exporter.cli.TodoistDataService")
@patch("todoist_data_exporter.cli.TodoistExportService")
def test_export_with_project_id(
    mock_export_service_class: MagicMock,
    mock_data_service_class: MagicMock,
    mock_planning_client_class: MagicMock,
    mock_api_repository_class: MagicMock,
    runner: CliRunner,
) -> None:
    """Test that the export command works with a project ID.

    Args:
        mock_export_service_class: Mock for the export service class.
        mock_data_service_class: Mock for the data service class.
        mock_api_repository_class: Mock for the API repository class.
        runner: The CLI runner.
    """
    # Arrange
    mock_client_instance = MagicMock()
    mock_planning_client_class.return_value = mock_client_instance

    mock_repository_instance = MagicMock()
    mock_api_repository_class.return_value = mock_repository_instance
    mock_data_service = MagicMock()
    mock_export_service = MagicMock()

    mock_data_service_class.return_value = mock_data_service
    mock_export_service_class.return_value = mock_export_service

    mock_data = {"projects": [{"id": "123", "name": "Test Proj"}, {"id": "456"}], "labels": []}
    mock_data_service.get_hierarchical_data.return_value = mock_data
    mock_data_service.get_flat_data.return_value = mock_data

    # Act
    result = runner.invoke(
        cli,
        [
            "export",
            "--api-token",
            "test-token",
            "--output",
            "output.json",
            "--project-id",
            "123",
        ],
    )

    # Assert
    assert result.exit_code == 0, f"CLI failed: {result.output}"
    mock_planning_client_class.assert_called_once_with(api_token="test-token")
    mock_api_repository_class.assert_called_once_with(api_client=mock_client_instance)
    mock_data_service_class.assert_called_once_with(mock_repository_instance)
    mock_data_service.get_hierarchical_data.assert_called_once()
    mock_export_service_class.assert_called_once_with()

    # Assert data passed to export_data is correctly filtered by the CLI
    expected_filtered_data = {"projects": [{"id": "123", "name": "Test Proj"}], "labels": []}
    mock_export_service.export_data.assert_called_once_with(
        expected_filtered_data, "output.json", "json"
    )
