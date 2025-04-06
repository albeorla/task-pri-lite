# Calendar Event Filtering: Summary of Findings and Implementation Approach

## Overview

This document summarizes our approach to filtering and consolidating calendar events from multiple JSON files based on the "Life Goals: A Balanced Perspective" document. We've designed a conceptual implementation using LangChain with Claude's API to process each event and determine whether it should be kept or filtered out based on alignment with life goals and priorities.

## Key Filtering Criteria

Based on our analysis of the "Life Goals" document, we've identified these key filtering criteria:

### 1. Goal Alignment
Events should align with one or more of the core goal areas:
- **Foundational Pillars**: Physical Health, Mental Health, Financial Stability
- **Core Connections**: Healthy Marriage, Social Connection
- **Growth & Aspirations**: Career Progression, Home Ownership, Children

### 2. Current Focus Areas (as of April 6, 2025)
Priority is given to events that align with:
- Financial Stability (primary focus)
- Career Progression/Job Search (parallel key priority)
- Physical Health (active area requiring attention)
- Healthy Marriage (crucial contextually)
- Mental Health (essential for navigating priorities)

### 3. Eisenhower Matrix Classification
Events are categorized based on urgency and importance:
- **Urgent & Important (Do First)**: Immediate attention, significant contribution to focus areas
- **Important & Not Urgent (Schedule)**: Crucial for long-term goals, not requiring immediate action
- **Urgent & Not Important (Delegate/Minimize)**: Demanding attention but not contributing significantly to core goals
- **Not Urgent & Not Important (Delete/Defer)**: Distractions or low-value activities

### 4. Time Relevance
- Current and upcoming events are prioritized
- Past events are filtered out unless they have recurring significance

## Implementation Approach Using LangChain and Claude's API

Our implementation uses LangChain to interact with Claude's API for processing and classifying calendar events:

### 1. Data Preparation
- Load both JSON files (calendar_planning.json and calendar_events.json)
- Normalize event data from different structures into a consistent format

### 2. Event Processing Pipeline
For each calendar event:
1. Extract key information (title, description, dates, etc.)
2. Send to Claude with a detailed prompt containing:
   - Life goals framework
   - Current focus areas
   - Eisenhower Matrix categories
   - The event data
3. Claude analyzes the event and returns:
   - Whether to keep the event
   - Goal alignment categories
   - Focus area alignment
   - Eisenhower Matrix classification
   - Confidence score
   - Reasoning for the classification
4. Events with high confidence scores (≥0.7) and positive keep decisions are retained

### 3. Post-Processing
- Combine retained events from both sources
- Deduplicate events that appear in both files
- Sort by date and Eisenhower category priority
- Structure according to output JSON schema

### 4. Edge Case Handling
- Events with unclear classifications are flagged for manual review
- Multi-category events are tagged with all relevant categories
- Recurring events are evaluated based on proximity to current date

## Output JSON Structure

The filtered events are consolidated into a single JSON file with this structure:

```json
{
  "filtered_events": [
    {
      "id": "unique_event_id",
      "summary": "Event title/summary",
      "description": "Event description",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "is_all_day": true|false,
      "status": "confirmed|cancelled|etc",
      "calendar_name": "Calendar name",
      "source": "calendar_planning|calendar_events",
      "classification": {
        "goal_alignment": ["Foundational Pillars", "Core Connections", "Growth & Aspirations"],
        "focus_area_alignment": ["Financial Stability", "Career Progression", "Physical Health", "Healthy Marriage", "Mental Health"],
        "eisenhower_category": "Urgent & Important|Important & Not Urgent|Urgent & Not Important|Not Urgent & Not Important",
        "confidence_score": 0.95,
        "reasoning": "Explanation for classification"
      }
    }
  ],
  "metadata": {
    "total_events_processed": 250,
    "events_retained": 120,
    "filtering_date": "2025-04-06T22:24:00.000Z",
    "filtering_criteria": {
      "current_focus_areas": ["Financial Stability", "Career Progression", "Physical Health", "Healthy Marriage", "Mental Health"],
      "confidence_threshold": 0.7
    }
  }
}
```

## Key Benefits of This Approach

1. **Goal-Aligned Calendar**: Events are filtered based on alignment with life goals and current priorities
2. **Prioritized View**: Events are sorted by urgency, importance, and date
3. **Transparency**: Each event includes detailed classification information and reasoning
4. **Consolidated Data**: Events from multiple sources are combined into a single, coherent structure
5. **Adaptability**: The approach can be adjusted as priorities change over time

## Technical Implementation

The implementation is provided as a Python script using LangChain and Claude's API. Key components include:

1. **Pydantic Model** for structured event classification
2. **Prompt Template** providing Claude with context and instructions
3. **Processing Functions** for each JSON file
4. **Post-processing Functions** for deduplication and sorting
5. **Main Orchestration Function** tying everything together

This implementation provides a conceptual framework that can be adapted and extended based on specific requirements and constraints.
