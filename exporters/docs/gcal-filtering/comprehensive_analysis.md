# Comprehensive Analysis: Filtering and Consolidating Calendar Events Based on Life Goals

## Executive Summary

This document presents a comprehensive analysis and implementation approach for filtering and consolidating calendar events from multiple JSON files based on specific criteria derived from the "Life Goals: A Balanced Perspective" document. The goal is to create a coherent, single JSON file containing only the relevant items that align with the user's core life goals, current focus areas, and prioritization framework.

The analysis includes:
1. Extraction of key filtering criteria from the document
2. Analysis of the structure of the input JSON files
3. Design of a conceptual implementation using LangChain with Claude's API
4. Specification of the output JSON structure

## 1. Document Analysis: "Life Goals: A Balanced Perspective"

The document outlines a comprehensive framework for life goals and task prioritization, structured around:

### 1.1 Core Goal Areas

The document categorizes life goals into three main groups based on Maslow's Hierarchy of Needs:

#### Foundational Pillars (Maslow's Physiological & Safety Needs)
- **Physical Health**: Maintaining a healthy body capable of supporting life activities
- **Mental Health**: Cultivating emotional stability, resilience, and psychological well-being
- **Financial Stability**: Ensuring sufficient resources and security to meet needs and reduce financial stress

#### Core Connections (Maslow's Love & Belonging Needs)
- **Healthy Marriage**: Building and maintaining a mutually supportive, fulfilling partnership
- **Social Connection**: Cultivating meaningful relationships with friends, family, and community

#### Growth & Aspirations (Maslow's Esteem & Self-Actualization Needs)
- **Career Progression**: Seeking growth, achievement, competence, and satisfaction in professional life
- **Home Ownership**: Achieving the goal of owning a home, representing stability, security, and accomplishment
- **Children**: Potentially raising a family, representing purpose, nurturing, and long-term fulfillment

### 1.2 Current Focus Areas (as of April 6, 2025)

The document identifies specific areas requiring primary attention:
1. **Financial Stability** (primary focus)
2. **Career Progression/Job Search** (parallel key priority)
3. **Physical Health** (active area requiring attention)
4. **Healthy Marriage** (crucial contextually)
5. **Mental Health** (essential for navigating priorities)

### 1.3 Eisenhower Matrix for Task Prioritization

The document uses the Eisenhower Matrix to categorize tasks:

1. **Urgent & Important (Do First)**
   - Immediate financial actions
   - Time-sensitive personal/health tasks
   - Immediate Career/Income tasks

2. **Important & Not Urgent (Schedule)**
   - Foundational planning
   - Long-term health/well-being
   - Relationship-focused actions
   - Tasks with future due dates

3. **Urgent & Not Important (Delegate/Minimize/Automate)**
   - Tasks that feel urgent but don't align with core goals
   - Administrative tasks that could be streamlined

4. **Not Urgent & Not Important (Delete/Defer)**
   - Items in "backlog" project
   - Vague or outdated tasks

### 1.4 Guiding Principles

The document emphasizes several principles for a balanced approach:
- **Interdependence**: Goals are linked; success or struggle in one area impacts others
- **Foundational Importance**: Core health and financial stability enable other aspirations
- **Holistic View**: Balance over time, avoiding pursuit of growth goals at the expense of foundational needs
- **Dynamic Prioritization**: Focus shifts based on current circumstances, challenges, and opportunities

## 2. JSON Files Structure Analysis

### 2.1 calendar_planning.json

This file contains calendar events in a nested structure:

```json
[
  {
    "calendar_id": "en.usa#holiday@group.v.calendar.google.com",
    "description": "Holidays and Observances in United States",
    "time_zone": "America/New_York",
    "color_id": "8",
    "background_color": "#008f00",
    "foreground_color": "#000000",
    "access_role": "reader",
    "is_primary": false,
    "selected": true,
    "items": [
      {
        "item_id": "20200101_q8ue475rr4p7opsd4c0lr7g5pg",
        "type": "event",
        "content": "New Year's Day",
        "description": "Public holiday",
        "status": "confirmed",
        "start_date": "2020-01-01",
        "end_date": "2020-01-02",
        "timezone": "America/New_York",
        "is_all_day": true,
        "is_recurring": false,
        "source_link": "https://www.google.com/calendar/event?eid=...",
        "attendees": [],
        "organizer_email": "en.usa#holiday@group.v.calendar.google.com",
        "is_organizer": true,
        "reminders": []
      },
      // Additional events...
    ]
  },
  // Additional calendars...
]
```

Key attributes at the calendar level:
- `calendar_id`: Unique identifier for the calendar
- `description`: Description of the calendar
- `time_zone`: Time zone of the calendar
- `color_id`, `background_color`, `foreground_color`: Visual styling information
- `access_role`: User's access level to the calendar
- `is_primary`: Whether this is the primary calendar
- `selected`: Whether the calendar is selected for display
- `items`: Array of calendar events

Key attributes at the event level:
- `item_id`: Unique identifier for the event
- `type`: Type of item (event)
- `content`: Title or summary of the event
- `description`: Detailed description of the event
- `status`: Event status (confirmed, cancelled, etc.)
- `start_date`, `end_date`: Start and end dates of the event
- `timezone`: Time zone of the event
- `is_all_day`: Whether the event is an all-day event
- `is_recurring`: Whether the event recurs
- `source_link`: Link to the original event
- `attendees`: List of event attendees
- `organizer_email`: Email of the event organizer
- `is_organizer`: Whether the user is the organizer
- `reminders`: List of event reminders

### 2.2 calendar_events.json

This file contains events organized by calendar name:

```json
{
  "Holidays in United States": [
    {
      "id": "20200101_q8ue475rr4p7opsd4c0lr7g5pg",
      "summary": "New Year's Day",
      "description": "Public holiday",
      "location": "",
      "status": "confirmed",
      "start": {
        "date": "2020-01-01"
      },
      "end": {
        "date": "2020-01-02"
      },
      "all_day": true,
      "created": "2024-06-03T10:13:45+00:00",
      "updated": "2024-06-03T10:13:45.214000+00:00"
    },
    // Additional events...
  ],
  // Additional calendars...
}
```

Key attributes:
- Calendar name as the top-level key
- Event attributes:
  - `id`: Unique identifier for the event
  - `summary`: Title or summary of the event
  - `description`: Detailed description of the event
  - `location`: Location of the event
  - `status`: Event status (confirmed, cancelled, etc.)
  - `start`, `end`: Start and end dates/times of the event
  - `all_day`: Whether the event is an all-day event
  - `created`, `updated`: Creation and update timestamps

## 3. Filtering Criteria

Based on the document analysis, we've extracted the following filtering criteria:

### 3.1 Primary Filtering Criteria

1. **Goal Alignment**: 
   - Keep events that align with the core goal areas:
     - Foundational Pillars: Physical Health, Mental Health, Financial Stability
     - Core Connections: Healthy Marriage, Social Connection
     - Growth & Aspirations: Career Progression, Home Ownership, Children

2. **Current Focus Areas Alignment**:
   - Prioritize events that align with current focus areas:
     - Financial Stability (primary focus)
     - Career Progression/Job Search (parallel key priority)
     - Physical Health (active area requiring attention)
     - Healthy Marriage (crucial contextually)
     - Mental Health (essential for navigating priorities)

3. **Eisenhower Matrix Classification**:
   - Prioritize events based on urgency and importance:
     - Urgent & Important (Do First)
     - Important & Not Urgent (Schedule)
     - Urgent & Not Important (Delegate/Minimize/Automate)
     - Not Urgent & Not Important (Delete/Defer)

4. **Time Relevance**:
   - Keep events that are current or upcoming
   - Filter out past events unless they have recurring significance

### 3.2 Secondary Filtering Criteria

1. **Event Type Relevance**:
   - Keep personal appointments, meetings, and tasks
   - Keep health-related appointments
   - Keep financial and career-related events
   - Keep relationship-building events
   - Consider filtering out generic holidays unless they impact planning

2. **Status-based Filtering**:
   - Keep events with "confirmed" status
   - Filter out events with "cancelled" status

### 3.3 Edge Cases to Consider

1. **Multi-category Events**: 
   - Events that span multiple goal categories
   - Solution: Tag with multiple categories and prioritize based on primary focus area

2. **Recurring Events**: 
   - Events that repeat but may have varying importance
   - Solution: Evaluate each instance based on proximity to current date and alignment with current focus areas

3. **Long-duration Events**: 
   - Events that span multiple days or weeks
   - Solution: Evaluate based on start date proximity and overall goal alignment

4. **Vague Event Descriptions**: 
   - Events with unclear descriptions that make categorization difficult
   - Solution: Implement confidence scoring and flag for manual review if below threshold

5. **Changing Priorities**: 
   - Focus areas may shift over time
   - Solution: Include timestamp of filtering and allow for reprocessing when priorities change

## 4. LangChain and Claude API Implementation

The implementation uses LangChain to interact with Claude's API for processing and classifying calendar events. The key components include:

### 4.1 Data Model

We define a Pydantic model for event classification:

```python
class EventClassification(BaseModel):
    keep_event: bool = Field(description="Whether to keep this event in the filtered output")
    goal_alignment: List[str] = Field(description="List of goal categories this event aligns with")
    focus_area_alignment: List[str] = Field(description="List of current focus areas this event aligns with")
    eisenhower_category: str = Field(description="Eisenhower Matrix category")
    confidence_score: float = Field(description="Confidence score for this classification (0.0 to 1.0)")
    reasoning: str = Field(description="Explanation for why this event was classified this way")
```

### 4.2 Prompt Template

We create a detailed prompt template that provides Claude with:
- The life goals framework
- Current focus areas
- Eisenhower Matrix categories
- The event to classify
- Output format instructions

### 4.3 Processing Pipeline

The implementation follows these steps:

1. **Data Loading and Normalization**:
   - Load both JSON files
   - Normalize event data from different structures into a consistent format

2. **Event Processing**:
   - Process each event through Claude API using LangChain
   - Extract key information from each event
   - Send to Claude with the filtering criteria prompt
   - Receive classification and confidence score
   - Make keep/filter decision based on classification

3. **Post-processing**:
   - Combine retained events from both sources
   - Deduplicate events that appear in both files
   - Sort by date and priority
   - Structure according to output JSON schema

4. **Validation and Edge Case Handling**:
   - Implement validation checks for the processed data
   - Flag edge cases for review
   - Handle special cases like recurring events appropriately

### 4.4 Key Functions

The implementation includes several key functions:

- `normalize_event()`: Normalizes event data from different JSON structures
- `process_calendar_planning()`: Processes events from calendar_planning.json
- `process_calendar_events()`: Processes events from calendar_events.json
- `deduplicate_events()`: Removes duplicate events based on event ID
- `sort_events()`: Sorts events by date and Eisenhower category
- `main()`: Orchestrates the entire process

## 5. Output JSON Structure

The filtered calendar events are consolidated into a single, coherent JSON file with the following structure:

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

### 5.1 Key Components

1. **Filtered Events Array**: Contains all events that passed the filtering criteria, with:
   - Basic event information (id, summary, description, dates, etc.)
   - Classification information (goal alignment, focus area alignment, Eisenhower category, etc.)
   - Optional fields for events needing manual review

2. **Metadata Object**: Contains information about the filtering process:
   - Total events processed and retained
   - Filtering date and criteria

### 5.2 Key Design Decisions

1. **Normalized Structure**: Events from both source files are normalized into a consistent structure
2. **Source Tracking**: The `source` field indicates which original file the event came from
3. **Classification Data**: Each event includes detailed classification information
4. **Metadata**: The metadata section provides context about the filtering process
5. **Sorting**: Events are sorted by date and Eisenhower category
6. **Deduplication**: Events that appear in both source files are deduplicated
7. **Manual Review Flagging**: Events that couldn't be automatically classified with high confidence are flagged

## 6. Implementation Considerations

### 6.1 Technical Requirements

- Python environment with LangChain and Anthropic API access
- Pydantic for data validation and parsing
- JSON processing capabilities

### 6.2 Performance Considerations

- Claude API calls can be time-consuming and costly for large datasets
- Consider batch processing for large calendars
- Implement caching for similar events to reduce API calls

### 6.3 Potential Enhancements

1. **Incremental Processing**: Only process new or changed events since the last run
2. **User Feedback Loop**: Allow users to correct classifications and use that data for improvement
3. **Calendar Integration**: Direct integration with calendar APIs for real-time filtering
4. **Visualization Layer**: Add a UI to visualize filtered events by category
5. **Periodic Reprocessing**: Automatically reprocess events when focus areas change

## 7. Conclusion

This comprehensive analysis provides a detailed approach to filtering and consolidating calendar events based on life goals and priorities. The implementation using LangChain with Claude's API offers a sophisticated solution that:

1. Aligns calendar events with core life goals
2. Prioritizes events based on current focus areas
3. Classifies events according to the Eisenhower Matrix
4. Consolidates events from multiple sources into a coherent structure
5. Provides transparency through detailed classification information

The resulting filtered calendar will help the user focus on events that truly matter to their current priorities and long-term goals, reducing noise and enhancing productivity.
