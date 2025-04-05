"""Tests for the formatters."""

from typing import Any

from todoist_data_exporter.application.formatters.flat import FlatFormatter
from todoist_data_exporter.application.formatters.hierarchical import HierarchicalFormatter

# Constants
EXPECTED_ITEM_COUNT = 2


def test_hierarchical_formatter(sample_todoist_data: dict[str, Any]) -> None:
    """Test the hierarchical formatter."""
    formatter = HierarchicalFormatter()

    # Format the data
    formatted_data = formatter.format(sample_todoist_data)

    # Check that the data is formatted correctly
    assert "projects" in formatted_data
    assert "labels" in formatted_data

    # Check projects
    projects = formatted_data["projects"]
    assert len(projects) == 1
    project = projects[0]
    assert project["id"] == "1"
    assert project["name"] == "Project 1"

    # Check sections
    assert "sections" in project
    sections = project["sections"]
    assert len(sections) == 1
    section = sections[0]
    assert section["id"] == "1"
    assert section["name"] == "Section 1"

    # Check tasks in section
    assert "tasks" in section
    section_tasks = section["tasks"]
    assert len(section_tasks) == 1
    section_task = section_tasks[0]
    assert section_task["id"] == "1"
    assert section_task["content"] == "Task 1"

    # Check top-level tasks
    assert "tasks" in project
    project_tasks = project["tasks"]
    assert len(project_tasks) == 1
    project_task = project_tasks[0]
    assert project_task["id"] == "2"
    assert project_task["content"] == "Task 2"


def test_flat_formatter(sample_todoist_data: dict[str, Any]) -> None:
    """Test the flat formatter."""
    formatter = FlatFormatter()

    # Format the data
    formatted_data = formatter.format(sample_todoist_data)

    # Check that the data is formatted correctly
    assert "projects" in formatted_data
    assert "sections" in formatted_data
    assert "tasks" in formatted_data
    assert "labels" in formatted_data

    # Check projects
    projects = formatted_data["projects"]
    assert len(projects) == 1
    project = projects[0]
    assert project["id"] == "1"
    assert project["name"] == "Project 1"
    assert "sections" not in project
    assert "tasks" not in project

    # Check sections
    sections = formatted_data["sections"]
    assert len(sections) == 1
    section = sections[0]
    assert section["id"] == "1"
    assert section["name"] == "Section 1"
    assert "tasks" not in section

    # Check tasks
    tasks = formatted_data["tasks"]
    assert len(tasks) == EXPECTED_ITEM_COUNT

    # Find tasks by ID
    task1 = next((t for t in tasks if t["id"] == "1"), None)
    task2 = next((t for t in tasks if t["id"] == "2"), None)

    assert task1 is not None
    assert task1["content"] == "Task 1"
    assert task1["project_id"] == "1"
    assert task1["section_id"] == "1"

    assert task2 is not None
    assert task2["content"] == "Task 2"
    assert task2["project_id"] == "1"
    assert task2["section_id"] is None

    # Check labels
    labels = formatted_data["labels"]
    assert len(labels) == EXPECTED_ITEM_COUNT
