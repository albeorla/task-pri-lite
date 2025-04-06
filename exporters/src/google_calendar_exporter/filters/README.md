# Google Calendar Event Filtering

This module provides AI-powered filtering capabilities for Google Calendar events, integrating Claude AI to prioritize events based on personal goals and focus areas.

## Features

- **AI-Powered Filtering**: Uses Claude AI to analyze event relevance to your goals
- **Goal Alignment**: Categorizes events based on your life goals framework
- **Eisenhower Matrix Classification**: Assigns priority levels (Urgent & Important, Important & Not Urgent, etc.)
- **Confidence Scoring**: Each classification includes a confidence score
- **Deduplication**: Automatically handles duplicate events across calendars

## Usage

### Command Line

The filtering capability can be enabled via the command line interface:

```bash
python -m google_calendar_exporter.main --filter-events --claude-api-key=YOUR_API_KEY
```

Additional parameters:

```bash
--claude-model=claude-3.7-sonnet  # Model to use
--confidence-threshold=0.7             # Minimum confidence to keep an event (0.0-1.0)
--filtered-output=filtered_events.json  # Output file for filtered events
```

### Environment Variables

You can also configure the filter using environment variables:

```bash
export ANTHROPIC_API_KEY="your_api_key_here"
export CLAUDE_MODEL="claude-3.7-sonnet"
export CLAUDE_CONFIDENCE_THRESHOLD="0.7"
export FILTERED_EVENTS_OUTPUT_FILE="filtered_events.json"
```

### Programmatic Usage

```python
from google_calendar_exporter.factories.exporter_factory import GoogleCalendarExporterFactory
from google_calendar_exporter.config import Config

# Create configuration
config = Config(
    CREDENTIALS_PATH="credentials.json",
    TOKEN_PATH="token.json",
    EVENTS_OUTPUT_FILE="calendar_events.json",
    TASKS_OUTPUT_FILE="calendar_tasks.json",
    PLANNING_OUTPUT_FILE="calendar_planning.json",
    FILTERED_EVENTS_OUTPUT_FILE="filtered_events.json",
)

# Create exporter with filter enabled
exporter = GoogleCalendarExporterFactory.create_exporter(
    config=config,
    include_claude_filter=True,
    claude_api_key="your_api_key_here",
    claude_model="claude-3.7-sonnet",
    confidence_threshold=0.7,
)

# Run export
events_json, tasks_json, planning_json, filtered_events = exporter.export_data()
```

## Output Format

The filtered events are stored in a JSON file with the following structure:

```json
{
  "filtered_events": [
    {
      "id": "event_id",
      "summary": "Event Title",
      "description": "Event description",
      "start_date": "2023-05-15",
      "end_date": "2023-05-15",
      "is_all_day": false,
      "status": "confirmed",
      "calendar_name": "My Calendar",
      "classification": {
        "keep_event": true,
        "goal_alignment": ["Foundational Pillars", "Core Connections"],
        "focus_area_alignment": ["Financial Stability", "Physical Health"],
        "eisenhower_category": "Important & Not Urgent",
        "confidence_score": 0.95,
        "reasoning": "This event aligns with financial stability goals..."
      }
    }
  ],
  "metadata": {
    "total_events_processed": 50,
    "events_retained": 20,
    "filtering_date": "2023-05-16T14:30:45.123456",
    "filtering_criteria": {
      "current_focus_areas": [
        "Financial Stability",
        "Career Progression",
        "Physical Health",
        "Healthy Marriage",
        "Mental Health"
      ],
      "confidence_threshold": 0.7
    }
  }
}
``` 