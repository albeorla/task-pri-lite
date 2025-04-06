"""Models for filtered calendar events."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Optional

from ..models.event import Event


@dataclass
class EventClassification:
    """Classification details for an event processed by the AI filter."""
    
    keep_event: bool
    goal_alignment: List[str]
    focus_area_alignment: List[str]
    eisenhower_category: str
    confidence_score: float
    reasoning: str


@dataclass
class FilteredEvent:
    """Represents a calendar event that has been filtered and classified by AI."""
    
    id: str
    summary: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_all_day: bool = False
    status: str = "confirmed"
    calendar_name: str = ""
    source: str = "calendar_events"
    classification: Optional[EventClassification] = None
    needs_review: bool = False
    review_reason: Optional[str] = None
    
    @classmethod
    def from_event(cls, event: Event, calendar_name: str) -> "FilteredEvent":
        """Create a FilteredEvent from an Event object."""
        # Extract date strings from event.start and event.end
        start_date = None
        if event.start:
            start_date = event.start.date if event.start.date else (
                event.start.dateTime.split('T')[0] if event.start.dateTime else None
            )
            
        end_date = None
        if event.end:
            end_date = event.end.date if event.end.date else (
                event.end.dateTime.split('T')[0] if event.end.dateTime else None
            )
            
        return cls(
            id=event.id,
            summary=event.summary,
            description=event.description,
            start_date=start_date,
            end_date=end_date,
            is_all_day=event.all_day,
            status=event.status,
            calendar_name=calendar_name,
        )


@dataclass
class FilteredEventsOutput:
    """The complete output structure for filtered events."""
    
    filtered_events: List[FilteredEvent] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize default metadata if not provided."""
        if not self.metadata:
            self.metadata = {
                "total_events_processed": 0,
                "events_retained": 0,
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