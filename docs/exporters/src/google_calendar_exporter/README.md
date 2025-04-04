# Google Calendar Exporter

This module provides functionality to export Google Calendar data to JSON format.

## Setup

1. Create a project in the Google Cloud Console
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Desktop application)
4. Download the credentials.json file and place it in the project root

## Configuration

You can configure the exporter using environment variables:

- `CREDENTIALS_FILE`: Path to the credentials.json file (default: "credentials.json")
- `TOKEN_FILE`: Path to save the token (default: "token.json")
- `OUTPUT_FILE`: Path to save the exported data (default: "google_calendar_export.json")

## Usage

```bash
# Install the package
poetry install

# Run the exporter
poetry run gcal-export
```

The first time you run the exporter, it will open a browser window to authenticate with Google. After authentication, the token will be saved for future use.

## Output Format

The exporter creates a JSON file with the following structure:

```json
{
  "Calendar Name 1": [
    {
      "id": "event_id",
      "title": "Event Title",
      "description": "Event Description",
      "location": "Event Location",
      "status": "confirmed",
      "start": "2023-01-01T10:00:00Z",
      "end": "2023-01-01T11:00:00Z",
      "all_day": false,
      "timeZone": "America/Los_Angeles",
      "created": "2023-01-01T00:00:00Z",
      "updated": "2023-01-01T00:00:00Z",
      "recurrence": ["RRULE:FREQ=WEEKLY;UNTIL=20230201T000000Z"],
      "exceptions": [
        {
          "instance_id": "exception_id",
          "originalStartTime": {"dateTime": "2023-01-08T10:00:00Z"},
          "start": "2023-01-08T11:00:00Z",
          "end": "2023-01-08T12:00:00Z",
          "status": "confirmed",
          "title_override": "Modified Title"
        }
      ]
    }
  ],
  "Calendar Name 2": [
    // Events for Calendar 2
  ]
}
```
