"""Tests for the domain models."""

from todoist_data_exporter.domain.models import Project, Section, Task

# Constants
EXPECTED_SUBTASK_COUNT = 2


def test_task_creation() -> None:
    """Test that a task can be created."""
    task = Task(id="1", content="Test Task", project_id="p1")
    assert task.id == "1"
    assert task.content == "Test Task"
    assert task.is_completed is False
    assert task.description == ""
    assert task.due is None
    assert task.priority == 1
    assert task.sub_tasks == []


def test_task_with_subtasks() -> None:
    """Test that a task can have subtasks."""
    subtask1 = Task(id="2", content="Subtask 1", project_id="p1")
    subtask2 = Task(id="3", content="Subtask 2", project_id="p1")

    task = Task(id="1", content="Parent Task", project_id="p1", sub_tasks=[subtask1, subtask2])

    assert len(task.sub_tasks) == EXPECTED_SUBTASK_COUNT
    assert task.sub_tasks[0].id == "2"
    assert task.sub_tasks[1].id == "3"


def test_section_creation() -> None:
    """Test that a section can be created."""
    section = Section(id="1", name="Test Section", project_id="p1")
    assert section.id == "1"
    assert section.name == "Test Section"
    assert section.project_id == "p1"
    assert section.tasks == []


def test_section_with_tasks() -> None:
    """Test that a section can have tasks."""
    task1 = Task(id="1", content="Task 1", project_id="p1")
    task2 = Task(id="2", content="Task 2", project_id="p1")

    section = Section(id="1", name="Test Section", project_id="p1", tasks=[task1, task2])

    assert len(section.tasks) == EXPECTED_SUBTASK_COUNT
    assert section.tasks[0].id == "1"
    assert section.tasks[1].id == "2"


def test_project_creation() -> None:
    """Test that a project can be created."""
    project = Project(id="1", name="Test Project")
    assert project.id == "1"
    assert project.name == "Test Project"
    assert project.sections == []
    assert project.tasks == []


def test_project_with_sections_and_tasks() -> None:
    """Test that a project can have sections and tasks."""
    task1 = Task(id="1", content="Task 1", project_id="p1")
    task2 = Task(id="2", content="Task 2", project_id="p1")

    section = Section(id="1", name="Test Section", project_id="p1", tasks=[task1])

    project = Project(id="1", name="Test Project", sections=[section], tasks=[task2])

    assert len(project.sections) == 1
    assert project.sections[0].id == "1"
    assert len(project.sections[0].tasks) == 1
    assert project.sections[0].tasks[0].id == "1"
    assert len(project.tasks) == 1
    assert project.tasks[0].id == "2"
