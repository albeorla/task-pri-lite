# Output JSON Structure

The filtered calendar events will be consolidated into a single, coherent JSON file with the following structure:

```json
{
  "filtered_events": [
    {
      "id": "unique_event_id",
      "summary": "Event title/summary",
      "description": "Detailed event description",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "is_all_day": true|false,
      "status": "confirmed|cancelled|etc",
      "calendar_name": "Calendar this event belongs to",
      "source": "calendar_planning|calendar_events",
      "classification": {
        "goal_alignment": [
          "Foundational Pillars",
          "Core Connections",
          "Growth & Aspirations"
        ],
        "focus_area_alignment": [
          "Financial Stability",
          "Career Progression",
          "Physical Health",
          "Healthy Marriage",
          "Mental Health"
        ],
        "eisenhower_category": "Urgent & Important|Important & Not Urgent|Urgent & Not Important|Not Urgent & Not Important",
        "confidence_score": 0.95,
        "reasoning": "Explanation for why this event was classified this way"
      }
    },
    // Additional events...
  ],
  "metadata": {
    "total_events_processed": 250,
    "events_retained": 120,
    "filtering_date": "2025-04-06T22:24:00.000Z",
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

## Key Components of the Output Structure

### 1. Filtered Events Array

This is the main array containing all events that passed the filtering criteria. Each event object contains:

- **Basic Event Information**:
  - `id`: Unique identifier for the event
  - `summary`: Title or summary of the event
  - `description`: Detailed description of the event
  - `start_date`: Start date in YYYY-MM-DD format
  - `end_date`: End date in YYYY-MM-DD format
  - `is_all_day`: Boolean indicating if the event is an all-day event
  - `status`: Event status (confirmed, cancelled, etc.)
  - `calendar_name`: Name of the calendar this event belongs to
  - `source`: Source file where this event was found (calendar_planning or calendar_events)

- **Classification Information**:
  - `goal_alignment`: Array of goal categories this event aligns with
  - `focus_area_alignment`: Array of current focus areas this event aligns with
  - `eisenhower_category`: Eisenhower Matrix category for this event
  - `confidence_score`: Confidence score for the classification (0.0 to 1.0)
  - `reasoning`: Explanation for why this event was classified this way

- **Optional Fields** (present only in certain cases):
  - `needs_review`: Boolean flag indicating if this event needs manual review
  - `review_reason`: Reason why this event needs manual review

### 2. Metadata Object

This object contains information about the filtering process:

- `total_events_processed`: Total number of events processed from both input files
- `events_retained`: Number of events that passed the filtering criteria
- `filtering_date`: ISO timestamp when the filtering was performed
- `filtering_criteria`: Object containing the criteria used for filtering:
  - `current_focus_areas`: Array of focus areas used for filtering
  - `confidence_threshold`: Minimum confidence score required to retain an event

## Key Design Decisions

1. **Normalized Structure**: Events from both source files are normalized into a consistent structure, making it easier to work with the combined data.

2. **Source Tracking**: The `source` field indicates which original file the event came from, maintaining provenance information.

3. **Classification Data**: Each event includes detailed classification information, providing transparency about why it was included in the filtered results.

4. **Metadata**: The metadata section provides context about the filtering process, making it easier to understand how and when the filtering was performed.

5. **Sorting**: Events are sorted by date and Eisenhower category, prioritizing urgent and important events that are coming up soon.

6. **Deduplication**: Events that appear in both source files are deduplicated based on their ID, keeping the version with the higher confidence score.

7. **Manual Review Flagging**: Events that couldn't be automatically classified with high confidence are flagged for manual review, ensuring no important events are missed.

## Usage Considerations

- The output JSON structure is designed to be easily consumed by downstream applications or visualization tools.
- The classification data can be used to further filter or categorize events based on specific needs.
- The confidence score provides a measure of reliability for the classification, allowing for threshold-based filtering.
- The reasoning field provides transparency and can be used to improve the classification process over time.
