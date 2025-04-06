"""Factory for creating Google Calendar exporters with various configurations."""

import os
from typing import Optional

from google_calendar_exporter.api_client import GoogleCalendarApiClient
from google_calendar_exporter.auth import GoogleAuthManager
from google_calendar_exporter.config import Config
from google_calendar_exporter.event_processor import EventProcessor
from google_calendar_exporter.exporter import GoogleCalendarExporter
from google_calendar_exporter.filters.claude_event_filter import ClaudeEventFilter
from google_calendar_exporter.formatters.event_formatter import EventJsonFormatter
from google_calendar_exporter.formatters.planning_formatter import PlanningJsonFormatter
from google_calendar_exporter.formatters.task_formatter import TaskJsonFormatter
from google_calendar_exporter.planning_processor import PlanningProcessor
from google_calendar_exporter.protocols import EventFilter


class GoogleCalendarExporterFactory:
    """Factory for creating Google Calendar exporters with different configurations."""
    
    @staticmethod
    def create_exporter(
        config: Config, 
        include_claude_filter: bool = False,
        claude_api_key: Optional[str] = None,
        claude_model: str = "claude-3.7-sonnet",
        confidence_threshold: float = 0.7,
        batch_size: int = 10,
        max_concurrent_batches: int = 3,
    ) -> GoogleCalendarExporter:
        """Create a GoogleCalendarExporter with the specified configuration.
        
        Args:
            config: Configuration object for the exporter
            include_claude_filter: Whether to include the Claude AI filter
            claude_api_key: API key for Claude (falls back to ANTHROPIC_API_KEY env var)
            claude_model: Claude model to use for filtering
            confidence_threshold: Confidence threshold for the filter
            batch_size: Number of events to process in a single Claude API call
            max_concurrent_batches: Maximum number of batches to process concurrently
            
        Returns:
            Configured GoogleCalendarExporter instance
        """
        # Create the core components
        auth_manager = GoogleAuthManager(config)
        credentials = auth_manager.get_credentials()
        api_client = GoogleCalendarApiClient(credentials, config)
        event_processor = EventProcessor()
        event_formatter = EventJsonFormatter()
        task_formatter = TaskJsonFormatter()
        planning_processor = PlanningProcessor()
        planning_formatter = PlanningJsonFormatter()
        
        # Create the Claude filter if requested
        event_filter: Optional[EventFilter] = None
        if include_claude_filter:
            api_key = claude_api_key or os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("Claude API key is required. Provide claude_api_key or set ANTHROPIC_API_KEY environment variable.")
                
            # Add the filtered events output file path to config if not present
            if not hasattr(config, "FILTERED_EVENTS_OUTPUT_FILE"):
                setattr(config, "FILTERED_EVENTS_OUTPUT_FILE", "filtered_calendar_events.json")
                
            # Create the filter
            event_filter = ClaudeEventFilter(
                api_key=api_key,
                model=claude_model,
                confidence_threshold=confidence_threshold,
                batch_size=batch_size,
                max_concurrent_batches=max_concurrent_batches,
                config=config  # Pass config to enable progressive saves and output path resolution
            )
        
        # Create and return the exporter
        return GoogleCalendarExporter(
            config=config,
            auth_manager=auth_manager,
            api_client=api_client,
            event_processor=event_processor,
            event_formatter=event_formatter,
            task_formatter=task_formatter,
            planning_processor=planning_processor,
            planning_formatter=planning_formatter,
            event_filter=event_filter
        ) 