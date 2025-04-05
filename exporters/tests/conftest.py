"""Pytest configuration file for shared fixtures."""

from typing import Any

import pytest


@pytest.fixture
def example_fixture() -> str:
    """Provides an example resource for tests."""
    return "example_data"


@pytest.fixture
def sample_todoist_data() -> dict[str, Any]:
    """Sample Todoist data for testing."""
    return {
        "projects": [{"id": "1", "name": "Project 1", "color": "red"}],
        "sections": [{"id": "1", "name": "Section 1", "project_id": "1"}],
        "tasks": [
            {
                "id": "1",
                "content": "Task 1",
                "project_id": "1",
                "section_id": "1",
                "is_completed": False,
                "labels": ["label1", "label2"],
            },
            {
                "id": "2",
                "content": "Task 2",
                "project_id": "1",
                "section_id": None,
                "is_completed": True,
                "labels": [],
            },
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
