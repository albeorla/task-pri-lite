```python
# LangChain with Claude API Implementation for Calendar Event Filtering

from langchain.llms import Anthropic
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime

# Define output schema for Claude's responses
class EventClassification(BaseModel):
    keep_event: bool = Field(description="Whether to keep this event in the filtered output")
    goal_alignment: List[str] = Field(description="List of goal categories this event aligns with (Foundational Pillars, Core Connections, Growth & Aspirations)")
    focus_area_alignment: List[str] = Field(description="List of current focus areas this event aligns with (Financial Stability, Career Progression, Physical Health, Healthy Marriage, Mental Health)")
    eisenhower_category: str = Field(description="Eisenhower Matrix category (Urgent & Important, Important & Not Urgent, Urgent & Not Important, Not Urgent & Not Important)")
    confidence_score: float = Field(description="Confidence score for this classification (0.0 to 1.0)")
    reasoning: str = Field(description="Explanation for why this event was classified this way")

# Initialize the output parser
parser = PydanticOutputParser(pydantic_object=EventClassification)

# Initialize Claude API client
def initialize_claude():
    """Initialize the Claude API client using LangChain."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "your_api_key_here")
    llm = Anthropic(
        model="claude-3.7-sonnet",  # Using Claude's most capable model
        anthropic_api_key=api_key,
        temperature=0.1  # Low temperature for more consistent, deterministic outputs
    )
    return llm

# Create the filtering prompt template
filtering_prompt_template = """
You are an AI assistant helping to filter calendar events based on life goals and priorities.

# Life Goals Framework
The user has defined their life goals in these categories:

## Foundational Pillars (Maslow's Physiological & Safety Needs):
- Physical Health: Maintaining a healthy body capable of supporting life activities.
- Mental Health: Cultivating emotional stability, resilience, and psychological well-being.
- Financial Stability: Ensuring sufficient resources and security to meet needs and reduce financial stress.

## Core Connections (Maslow's Love & Belonging Needs):
- Healthy Marriage: Building and maintaining a mutually supportive, fulfilling partnership.
- Social Connection: Cultivating meaningful relationships with friends, family, and community.

## Growth & Aspirations (Maslow's Esteem & Self-Actualization Needs):
- Career Progression: Seeking growth, achievement, competence, and satisfaction in professional life.
- Home Ownership: Achieving the goal of owning a home, representing stability, security, and accomplishment.
- Children: Potentially raising a family, representing purpose, nurturing, and long-term fulfillment.

# Current Focus Areas (as of April 6, 2025):
1. Financial Stability (primary focus)
2. Career Progression/Job Search (parallel key priority)
3. Physical Health (active area requiring attention)
4. Healthy Marriage (crucial contextually)
5. Mental Health (essential for navigating priorities)

# Eisenhower Matrix Categories:
1. Urgent & Important (Do First): Tasks needing immediate attention that contribute significantly to focus areas
2. Important & Not Urgent (Schedule): Tasks crucial for long-term goals but don't require immediate action
3. Urgent & Not Important (Delegate/Minimize): Tasks demanding attention but not contributing significantly to core goals
4. Not Urgent & Not Important (Delete/Defer): Tasks that are distractions or low value

# Calendar Event to Classify:
{event_json}

Based on the above information, classify this calendar event according to the following schema:
{format_instructions}

Think step by step about how this event relates to the user's life goals, current focus areas, and where it falls in the Eisenhower Matrix.
"""

# Create the prompt with parser instructions
prompt = PromptTemplate(
    template=filtering_prompt_template,
    input_variables=["event_json"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

def normalize_event(event, source_file):
    """Normalize event data from different JSON structures into a consistent format."""
    if source_file == "calendar_planning.json":
        return {
            "id": event.get("item_id", ""),
            "summary": event.get("content", ""),
            "description": event.get("description", ""),
            "start_date": event.get("start_date", ""),
            "end_date": event.get("end_date", ""),
            "is_all_day": event.get("is_all_day", False),
            "status": event.get("status", ""),
            "calendar_name": event.get("calendar_name", ""),  # Added from parent object
            "source": "calendar_planning"
        }
    else:  # calendar_events.json
        return {
            "id": event.get("id", ""),
            "summary": event.get("summary", ""),
            "description": event.get("description", ""),
            "start_date": event.get("start", {}).get("date", ""),
            "end_date": event.get("end", {}).get("date", ""),
            "is_all_day": event.get("all_day", False),
            "status": event.get("status", ""),
            "calendar_name": event.get("calendar_name", ""),  # Added from parent object
            "source": "calendar_events"
        }

def process_calendar_planning(file_path, llm_chain):
    """Process the calendar_planning.json file."""
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    filtered_events = []
    
    for calendar in data:
        calendar_name = calendar.get("description", "Unknown Calendar")
        
        for item in calendar.get("items", []):
            # Add calendar name to the item
            item["calendar_name"] = calendar_name
            
            # Normalize the event
            normalized_event = normalize_event(item, "calendar_planning.json")
            
            # Skip processing if event is in the past
            event_date = normalized_event.get("start_date", "")
            if event_date and event_date < datetime.now().strftime("%Y-%m-%d"):
                continue
                
            # Process with Claude
            try:
                result = llm_chain.run(event_json=json.dumps(normalized_event, indent=2))
                classification = parser.parse(result)
                
                # Only keep events that pass the filter
                if classification.keep_event and classification.confidence_score >= 0.7:
                    # Add classification data to the event
                    normalized_event["classification"] = {
                        "goal_alignment": classification.goal_alignment,
                        "focus_area_alignment": classification.focus_area_alignment,
                        "eisenhower_category": classification.eisenhower_category,
                        "confidence_score": classification.confidence_score,
                        "reasoning": classification.reasoning
                    }
                    filtered_events.append(normalized_event)
            except Exception as e:
                print(f"Error processing event {normalized_event['id']}: {e}")
                # Add to filtered events with a flag for manual review
                normalized_event["needs_review"] = True
                normalized_event["review_reason"] = str(e)
                filtered_events.append(normalized_event)
    
    return filtered_events

def process_calendar_events(file_path, llm_chain):
    """Process the calendar_events.json file."""
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    filtered_events = []
    
    for calendar_name, events in data.items():
        for event in events:
            # Add calendar name to the event
            event["calendar_name"] = calendar_name
            
            # Normalize the event
            normalized_event = normalize_event(event, "calendar_events.json")
            
            # Skip processing if event is in the past
            event_date = normalized_event.get("start_date", "")
            if event_date and event_date < datetime.now().strftime("%Y-%m-%d"):
                continue
                
            # Process with Claude
            try:
                result = llm_chain.run(event_json=json.dumps(normalized_event, indent=2))
                classification = parser.parse(result)
                
                # Only keep events that pass the filter
                if classification.keep_event and classification.confidence_score >= 0.7:
                    # Add classification data to the event
                    normalized_event["classification"] = {
                        "goal_alignment": classification.goal_alignment,
                        "focus_area_alignment": classification.focus_area_alignment,
                        "eisenhower_category": classification.eisenhower_category,
                        "confidence_score": classification.confidence_score,
                        "reasoning": classification.reasoning
                    }
                    filtered_events.append(normalized_event)
            except Exception as e:
                print(f"Error processing event {normalized_event['id']}: {e}")
                # Add to filtered events with a flag for manual review
                normalized_event["needs_review"] = True
                normalized_event["review_reason"] = str(e)
                filtered_events.append(normalized_event)
    
    return filtered_events

def deduplicate_events(events):
    """Remove duplicate events based on event ID."""
    unique_events = {}
    for event in events:
        event_id = event["id"]
        
        # If we haven't seen this ID before, add it
        if event_id not in unique_events:
            unique_events[event_id] = event
        else:
            # If we have seen it, keep the one with higher confidence score
            existing_confidence = unique_events[event_id].get("classification", {}).get("confidence_score", 0)
            new_confidence = event.get("classification", {}).get("confidence_score", 0)
            
            if new_confidence > existing_confidence:
                unique_events[event_id] = event
    
    return list(unique_events.values())

def sort_events(events):
    """Sort events by date and Eisenhower category."""
    # Define priority order for Eisenhower categories
    priority_order = {
        "Urgent & Important": 0,
        "Important & Not Urgent": 1,
        "Urgent & Not Important": 2,
        "Not Urgent & Not Important": 3
    }
    
    # Sort by date first, then by Eisenhower category
    return sorted(
        events,
        key=lambda x: (
            x.get("start_date", "9999-12-31"),  # Default to far future if no date
            priority_order.get(
                x.get("classification", {}).get("eisenhower_category", "Not Urgent & Not Important"),
                3  # Default to lowest priority if no category
            )
        )
    )

def main():
    """Main function to process both JSON files and create filtered output."""
    # Initialize Claude
    llm = initialize_claude()
    
    # Create LLM chain
    llm_chain = LLMChain(llm=llm, prompt=prompt)
    
    # Process both files
    planning_events = process_calendar_planning("calendar_planning.json", llm_chain)
    calendar_events = process_calendar_events("calendar_events.json", llm_chain)
    
    # Combine events
    all_events = planning_events + calendar_events
    
    # Deduplicate events
    unique_events = deduplicate_events(all_events)
    
    # Sort events
    sorted_events = sort_events(unique_events)
    
    # Create final output structure
    output = {
        "filtered_events": sorted_events,
        "metadata": {
            "total_events_processed": len(planning_events) + len(calendar_events),
            "events_retained": len(sorted_events),
            "filtering_date": datetime.now().isoformat(),
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
    
    # Write to output file
    with open("filtered_calendar_events.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"Filtering complete. {len(sorted_events)} events retained out of {len(planning_events) + len(calendar_events)} processed.")

if __name__ == "__main__":
    main()
```
