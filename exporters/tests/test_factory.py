"""Tests for the factory."""

import pytest
from todoist_data_exporter.application.exporters import (
    CsvExporter,
    JsonExporter,
    MarkdownExporter,
)
from todoist_data_exporter.application.factory import ExporterFactory


def test_exporter_factory_json() -> None:
    """Test that the exporter factory creates a JSON exporter."""
    exporter = ExporterFactory.create("json")
    assert isinstance(exporter, JsonExporter)


def test_exporter_factory_markdown() -> None:
    """Test that the exporter factory creates a Markdown exporter."""
    exporter = ExporterFactory.create("markdown")
    assert isinstance(exporter, MarkdownExporter)


def test_exporter_factory_md() -> None:
    """Test that the exporter factory creates a Markdown exporter for 'md'."""
    exporter = ExporterFactory.create("md")
    assert isinstance(exporter, MarkdownExporter)


def test_exporter_factory_csv() -> None:
    """Test that the exporter factory creates a CSV exporter."""
    exporter = ExporterFactory.create("csv")
    assert isinstance(exporter, CsvExporter)


def test_exporter_factory_case_insensitive() -> None:
    """Test that the exporter factory is case-insensitive."""
    exporter = ExporterFactory.create("JSON")
    assert isinstance(exporter, JsonExporter)


def test_exporter_factory_unsupported_format() -> None:
    """Test that the exporter factory raises an error for unsupported formats."""
    with pytest.raises(ValueError, match="Unsupported format: xml"):
        ExporterFactory.create("xml")
