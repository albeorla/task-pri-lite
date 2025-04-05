# Task Priority Lite - User Guide

## Overview

Task Priority Lite integrates data from Todoist and Google Calendar to provide a unified task management system. The application follows a two-step process:

1. Python exporters fetch data from Todoist and Google Calendar
2. The TypeScript core application processes and displays the data

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Todoist account and API token
- Google Calendar account and OAuth credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/task-pri-lite.git
   cd task-pri-lite
   ```

2. **Set up Python environment:**
   ```bash
   cd exporters
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -e .
   ```

3. **Set up Node.js environment:**
   ```bash
   cd ..  # Back to project root
   npm install
   ```

## Configuration

### Todoist Setup

1. Get a Todoist API token:
   - Log in to your Todoist account at https://todoist.com/
   - Go to Settings > Integrations > API token
   - Copy your API token

2. Configure the exporter:
   - Create a copy of `.env.example` in the `exporters` directory and name it `.env`
   - Add your Todoist API token:
     ```
     TODOIST_API_TOKEN=your_api_token_here
     ```

### Google Calendar Setup

1. Create OAuth 2.0 credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Go to "Credentials" and create OAuth 2.0 Client ID credentials
   - Download the credentials JSON file

2. Configure the exporter:
   - Rename the downloaded credentials file to `credentials.json`
   - Move the file to the `exporters` directory
   - Update your `.env` file in the `exporters` directory:
     ```
     GOOGLE_CREDENTIALS_FILE=credentials.json
     ```

## Running the Exporters

### Todoist Exporter

```bash
cd exporters
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Export all Todoist data
python -m todoist_data_exporter.cli export --format json --structure hierarchical --output ../output/todoist_export.json

# Export a specific project
python -m todoist_data_exporter.cli export --project-id YOUR_PROJECT_ID --output ../output/todoist_export.json
```

### Google Calendar Exporter

```bash
cd exporters
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Export Google Calendar data
python -m google_calendar_exporter.main

# First-time usage will open a browser for OAuth authentication
```

The Google Calendar exporter will create three files in the `output` directory:
- `calendar_events.json`: Calendar events
- `calendar_tasks.json`: Calendar events formatted as tasks
- `calendar_planning.json`: Planning data

## Running the Core Application

After running the exporters, you can run the core application:

```bash
# From the project root
npm run build
npm start
```

This will:

1. Load data from the exported JSON files
2. Process the tasks based on GTD principles
3. Display next actions and other important information

## Troubleshooting

### Authentication Issues

- **Todoist**: Verify your API token is correct and has not expired
- **Google Calendar**: 
  - If authentication fails, delete the `token.json` file in the `exporters` directory and try again
  - Ensure your OAuth credentials have the correct redirect URIs
  - Make sure the Google Calendar API is enabled for your project

### Data Export Issues

- Check that the output directory exists
- Verify API connectivity by checking your network connection
- Look for error messages in the logs (console output)

### Schema Validation Errors

- If you see schema validation errors, it means the data structure has changed
- Update the schema in `exporters/schemas/` to match the new data structure

## Customization

### Output Directory

You can change the output directory by setting the `OUTPUT_DIR` environment variable:

```bash
export OUTPUT_DIR=/path/to/output  # On Windows: set OUTPUT_DIR=C:\path\to\output
```

### Modifying Task Processing

To modify how tasks are processed, edit the TypeScript files in the `src/application` directory. 