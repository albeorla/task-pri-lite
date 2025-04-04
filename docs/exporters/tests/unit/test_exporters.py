"""Tests for the exporters."""

import json
import os
import tempfile
from typing import Any

import pytest
from todoist_data_exporter.application.exporters.csv_exporter import CsvExporter
from todoist_data_exporter.application.exporters.json_exporter import JsonExporter
from todoist_data_exporter.application.exporters.markdown_exporter import MarkdownExporter


@pytest.fixture
def sample_data() -> dict[str, Any]:
    """Sample Todoist data for testing."""
    return {
        "projects": [
            {
                "id": "1",
                "name": "Project 1",
                "color": "red",
                "sections": [
                    {
                        "id": "1",
                        "name": "Section 1",
                        "project_id": "1",
                        "tasks": [
                            {
                                "id": "1",
                                "content": "Task 1",
                                "project_id": "1",
                                "section_id": "1",
                                "is_completed": False,
                                "labels": ["label1", "label2"],
                            }
                        ],
                    }
                ],
                "tasks": [
                    {
                        "id": "2",
                        "content": "Task 2",
                        "project_id": "1",
                        "section_id": None,
                        "is_completed": True,
                        "labels": [],
                    }
                ],
            }
        ],
        "labels": [
            {
                "id": "label1",
                "name": "Label 1",
                "color": "blue",
            },
            {
                "id": "label2",
                "name": "Label 2",
                "color": "green",
            },
        ],
    }


def test_json_exporter(sample_data: dict[str, Any]) -> None:
    """Test the JSON exporter."""
    exporter = JsonExporter()

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_file:
        try:
            # Export data
            exporter.export(sample_data, temp_file.name)

            # Check that the file exists
            assert os.path.exists(temp_file.name)

            # Check that the file contains the expected data
            with open(temp_file.name, encoding="utf-8") as f:
                exported_data = json.load(f)

            # Assert that metadata is present and the rest matches input
            assert "metadata" in exported_data
            assert exported_data["projects"] == sample_data["projects"]
            assert exported_data["labels"] == sample_data["labels"]
            # Add checks for other top-level keys if necessary

        finally:
            # Clean up
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)


def test_markdown_exporter(sample_data: dict[str, Any]) -> None:
    """Test the Markdown exporter."""
    exporter = MarkdownExporter()

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as temp_file:
        try:
            # Export data
            exporter.export(sample_data, temp_file.name)

            # Check that the file exists
            assert os.path.exists(temp_file.name)

            # Check that the file contains the expected data
            with open(temp_file.name, encoding="utf-8") as f:
                content = f.read()

            # Basic checks
            assert "# Todoist Export" in content
            assert "### Project 1" in content
            assert "**Section 1**" in content
            assert "- [ ] Task 1" in content
            assert "- [x] Task 2" in content
            assert "Labels: label1, label2" in content
            assert "## Labels" in content
            assert "- Label 1 (Color: blue)" in content
            assert "- Label 2 (Color: green)" in content
        finally:
            # Clean up
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)


def test_csv_exporter(sample_data: dict[str, Any]) -> None:
    """Test the CSV exporter."""
    exporter = CsvExporter()

    with tempfile.NamedTemporaryFile(suffix="_base", delete=False) as temp_file:
        try:
            # Export data
            base_path = temp_file.name
            exporter.export(sample_data, base_path)

            # Check that the files exist
            projects_file = f"{base_path}_projects.csv"
            tasks_file = f"{base_path}_tasks.csv"
            labels_file = f"{base_path}_labels.csv"

            assert os.path.exists(projects_file)
            assert os.path.exists(tasks_file)
            assert os.path.exists(labels_file)

            # Check projects file
            with open(projects_file, encoding="utf-8") as f:
                content = f.read()

            assert "id,name,parent_id,color,is_shared,is_favorite" in content
            assert "1,Project 1,,red,false,false" in content

            # Check tasks file
            with open(tasks_file, encoding="utf-8") as f:
                content = f.read()

            assert (
                "id,content,project_id,section_id,parent_id,is_completed,priority,due_date,labels"
                in content
            )
            # Read the content line by line to make assertions more flexible
            lines = content.strip().split("\n")
            header = lines[0]
            data_lines = lines[1:]

            # Check header
            assert (
                "id,content,project_id,section_id,parent_id,is_completed,priority,due_date,labels"
                == header
            )

            # Check that each task is present (order may vary)
            task1_found = False
            task2_found = False

            for line in data_lines:
                if line.startswith("1,Task 1,1,1,,false,1,,") and "label1,label2" in line:
                    task1_found = True
                elif line.startswith("2,Task 2,1,,,true,1,,"):
                    task2_found = True

            assert task1_found, "Task 1 with labels not found in CSV output"
            assert task2_found, "Task 2 not found in CSV output"

            # Check labels file
            with open(labels_file, encoding="utf-8") as f:
                content = f.read()

            assert "id,name,color,is_favorite" in content
            assert "label1,Label 1,blue,false" in content
            assert "label2,Label 2,green,false" in content
        finally:
            # Clean up
            for suffix in ["", "_projects.csv", "_tasks.csv", "_labels.csv"]:
                file_path = f"{base_path}{suffix}"
                if os.path.exists(file_path):
                    os.unlink(file_path)
