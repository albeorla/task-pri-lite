"""Example unit tests."""

from todoist_data_exporter import __version__


def test_version() -> None:
    """Test version is set correctly."""
    assert __version__ == "0.1.0"


def test_always_passes() -> None:
    """An example test that always passes."""
    assert True


def test_with_fixture(example_fixture: str) -> None:
    """Test using the example fixture."""
    assert example_fixture == "example_data"
