# Planning Data Exporter

A command-line tool to export planning data in various formats with hierarchical structure.

## Features

- **Hierarchical Export**: Export planning data with proper hierarchical relationships between projects, sections, tasks, and sub-tasks.
- **Multiple Formats**: Export to JSON, Markdown, or CSV formats.
- **Flexible Structure**: Choose between hierarchical or flat data structure.
- **Backup**: Create complete backups of your planning data.
- **Local Files**: Work with local JSON files instead of the API if needed.
- **Clean Architecture**: Implemented using SOLID principles, protocols, and interfaces.

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Poetry (dependency management)
- Make (optional, for using the Makefile)
- Todoist API token (for Todoist exporter)
- Google Calendar API credentials (for Google Calendar exporter)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/albeorla/planning-data-exporter.git
   cd planning-data-exporter
   ```

2. Install dependencies:
   ```bash
   make install
   # or directly: poetry install --with dev
   ```

3. Activate the virtual environment (optional):
   ```bash
   # If you want to activate the virtual environment directly
   poetry shell

   # Or you can run commands directly using poetry run
   poetry run python --version
   ```

## Development Workflow (Using Makefile)

```bash
# Install dependencies (including dev dependencies)
make install

# Activate the virtual environment within your current shell
make shell

# Format code using Ruff
make format

# Lint code using Ruff
make lint

# Run static type checking using MyPy
make mypy

# Run tests using Pytest
make test

# Run tests with coverage report
make test-cov

# Run all checks (format, lint, mypy, test)
make check

# Clean build artifacts and cache files
make clean

# Clean everything including the virtual environment
make clean-venv

# Build the package (wheel and sdist)
make build
```

## Usage

### Google Calendar Setup

To use the Google Calendar exporter, you need to set up API credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials.json file and place it in the `bin` directory as `google-client-secret.json`

### Export Planning Data

```bash
# Export data from all sources
planning-export export

# Export data from Todoist only
planning-export todoist

# Export data from Google Calendar only
planning-export gcal

# Legacy Todoist export commands
todoist-export export --api-token YOUR_API_TOKEN --output planning_data.json
todoist-export export --api-token YOUR_API_TOKEN --output planning_data.md --format markdown
todoist-export export --api-token YOUR_API_TOKEN --output planning_data --format csv
todoist-export export --api-token YOUR_API_TOKEN --output planning_data.json --structure flat
todoist-export export --input-file backup.json --output planning_data.md --format markdown
```

### Backup Planning Data

```bash
# Create a complete backup of your planning data
todoist-export backup --api-token YOUR_API_TOKEN --output backup.json
```

### Output Files

The exporters generate the following output files:

- Todoist: `./output/todoist_export.json`
- Google Calendar Events: `./output/calendar_events.json`
- Google Calendar Tasks: `./output/calendar_tasks.json`

### Environment Variables

You can configure the exporters using environment variables:

#### Todoist

- `TODOIST_API_TOKEN`: Your Todoist API token

#### Google Calendar

- `GOOGLE_CREDENTIALS_FILE`: Path to the credentials.json file (default: "bin/google-client-secret.json")
- `GOOGLE_TOKEN_FILE`: Path to save the token (default: "bin/google-token.json")
- `GOOGLE_EVENTS_OUTPUT_FILE`: Path to save the events output (default: "output/calendar_events.json")
- `GOOGLE_TASKS_OUTPUT_FILE`: Path to save the tasks output (default: "output/calendar_tasks.json")

## Architecture

This project follows clean architecture principles with a focus on SOLID design:

- **Domain Layer**: Contains the core business logic and interfaces
- **Application Layer**: Implements use cases using the domain interfaces
- **Infrastructure Layer**: Provides concrete implementations of the interfaces

Key design patterns used:
- **Protocol/Interface Segregation**: Using protocols to define clear interfaces
- **Dependency Inversion**: Depending on abstractions, not concrete implementations
- **Strategy Pattern**: For different export formats and formatting strategies
- **Repository Pattern**: For abstracting data access

## License

MIT License
