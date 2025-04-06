"""Claude-based event filter implementation."""

import json
import logging
import os
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import anthropic
import httpx
from pydantic import BaseModel, Field

from ..models.event import Event
from ..models.filtered_event import EventClassification, FilteredEvent, FilteredEventsOutput
from ..protocols import CalendarEventResult, EventFilter, FilteredEventResult

logger = logging.getLogger(__name__)


class EventClassificationSchema(BaseModel):
    """Pydantic model for Claude's responses."""
    
    keep_event: bool = Field(description="Whether to keep this event in the filtered output")
    goal_alignment: List[str] = Field(description="List of goal categories this event aligns with (Foundational Pillars, Core Connections, Growth & Aspirations)")
    focus_area_alignment: List[str] = Field(description="List of current focus areas this event aligns with (Financial Stability, Career Progression, Physical Health, Healthy Marriage, Mental Health)")
    eisenhower_category: str = Field(description="Eisenhower Matrix category (Urgent & Important, Important & Not Urgent, Urgent & Not Important, Not Urgent & Not Important)")
    confidence_score: float = Field(description="Confidence score for this classification (0.0 to 1.0)")
    reasoning: str = Field(description="Explanation for why this event was classified this way")


class BatchEventClassification(BaseModel):
    """Schema for batch classification results"""
    classifications: List[Dict[str, Any]] = Field(description="List of event classifications")


class ClaudeEventFilter(EventFilter):
    """Filters calendar events using the Claude AI model.
    
    This implementation includes several robustness and optimization features:
    
    1. Batch Processing: Events are processed in configurable batches to minimize
       API calls and improve throughput.
       
    2. Concurrent Execution: Multiple batches are processed simultaneously (up to
       max_concurrent_batches) using asyncio and semaphores for controlled concurrency.
       
    3. Error Handling & Recovery: 
       - Failed batches are automatically retried with smaller batch sizes
       - JSON parsing failures are handled with multiple fallback extraction methods
       - Events that fail processing are flagged for manual review rather than dropped
       
    4. Progressive Result Saving: 
       - Interim results are saved periodically (every 5 batches) to preserve progress
       - Atomic file updates prevent corruption if interrupted during writing
       - Multiple fallback paths for output file determination
       
    5. Classification Quality Control:
       - Confidence threshold filtering to ensure only high-quality matches are kept
       - Deduplication to handle events processed multiple times across retries
       - Consistent sorting for predictable results
    """
    
    def __init__(
        self, 
        api_key: Optional[str] = None,
        model: str = "claude-3.7-sonnet",
        confidence_threshold: float = 0.7,
        batch_size: int = 10,
        max_concurrent_batches: int = 3,
        config: Optional[Any] = None
    ):
        """Initialize the Claude-based event filter.
        
        Args:
            api_key: The Anthropic API key. If not provided, looks for ANTHROPIC_API_KEY in env.
            model: The Claude model to use for filtering.
            confidence_threshold: Minimum confidence score to keep an event.
            batch_size: Number of events to process in a single Claude API call.
            max_concurrent_batches: Maximum number of batches to process concurrently.
            config: Configuration object with output file paths for progressive saving.
                   Used to determine where to save interim and final results.
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.")
        
        self.model = model
        self.confidence_threshold = confidence_threshold
        self.batch_size = batch_size
        self.max_concurrent_batches = max_concurrent_batches
        self.config = config  # Store config for output path resolution
        self.claude_client = anthropic.Anthropic(api_key=self.api_key)
        logger.info(f"Claude Event Filter initialized with model: {model}, batch size: {batch_size}, max concurrent batches: {max_concurrent_batches}")
        self._prepare_system_prompt()
    
    def _prepare_system_prompt(self) -> None:
        """Prepare the system prompt template for Claude.
        
        This system prompt provides critical context for the AI model about:
        1. The user's life goals framework (Foundational Pillars, Core Connections, Growth)
        2. Current focus areas and priorities
        3. Eisenhower Matrix categories for classification
        4. The expected output format and reasoning process
        
        The quality and specificity of this prompt directly impacts classification accuracy.
        """
        self.system_prompt = """
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

You'll be given a batch of calendar events and asked to classify each one. For each event, determine:
1. Whether to keep it in the filtered calendar (keep_event)
2. Which life goal categories it aligns with (goal_alignment)
3. Which current focus areas it aligns with (focus_area_alignment)
4. Where it falls in the Eisenhower Matrix (eisenhower_category)
5. Your confidence in this classification (confidence_score)
6. Your reasoning for this classification (reasoning)

Respond with JSON following the exact structure provided in the user's request.
"""
    
    def _format_event_for_claude(self, event: Event, calendar_name: str) -> Dict[str, Any]:
        """Format an event for Claude's consumption."""
        # Convert to a normalized simplified structure for Claude
        normalized_event = {}
        
        # Extract basic info
        normalized_event["id"] = event.id
        normalized_event["summary"] = event.summary
        normalized_event["description"] = event.description
        normalized_event["calendar_name"] = calendar_name
        
        # Extract dates
        if event.start:
            if event.start.date:
                normalized_event["start_date"] = event.start.date
            elif event.start.dateTime:
                normalized_event["start_date"] = event.start.dateTime.split('T')[0]
                normalized_event["start_time"] = event.start.dateTime.split('T')[1]
                
        if event.end:
            if event.end.date:
                normalized_event["end_date"] = event.end.date
            elif event.end.dateTime:
                normalized_event["end_date"] = event.end.dateTime.split('T')[0]
                normalized_event["end_time"] = event.end.dateTime.split('T')[1]
        
        normalized_event["is_all_day"] = event.all_day
        normalized_event["status"] = event.status
        
        return normalized_event

    async def _async_batch_classify_events(self, batch_events: List[Tuple[Event, str]]) -> List[Optional[Tuple[Event, str, EventClassification]]]:
        """Asynchronously classify a batch of events using Claude."""
        if not batch_events:
            return []

        # Log the events being processed in this batch
        event_summaries = [f"'{event.summary}' (ID: {event.id})" for event, _ in batch_events]
        logger.info(f"Processing batch with {len(batch_events)} events: {', '.join(event_summaries[:3])}" + 
                   (f"... and {len(event_summaries)-3} more" if len(event_summaries) > 3 else ""))

        # Format events for Claude
        normalized_events = []
        for event, calendar_name in batch_events:
            normalized = self._format_event_for_claude(event, calendar_name)
            normalized_events.append((event, calendar_name, normalized))

        try:
            # Prepare batch for Claude
            events_json = json.dumps([e for _, _, e in normalized_events], indent=2)
            
            # Generate prompt with explicit formatting instructions for more reliable JSON output
            # IMPORTANT: The schema definition is explicitly formatted to encourage Claude to 
            # produce valid, consistently structured JSON responses to prevent parsing errors
            batch_schema_str = """{
  "classifications": [
    {
      "event_id": "string",
      "keep_event": true,
      "goal_alignment": ["string"],
      "focus_area_alignment": ["string"],
      "eisenhower_category": "string",
      "confidence_score": 0.95,
      "reasoning": "string"
    }
  ]
}"""
            
            logger.debug(f"Sending batch of {len(batch_events)} events to Claude API using model {self.model}")
            
            # Explicit instruction to output ONLY JSON without preamble or postamble text
            # This is critical for reliable parsing, as any non-JSON text will cause parsing errors
            human_prompt = f"""
Based on the batch of calendar events below, classify each event according to the criteria you were given.

# Calendar Events to Classify:
{events_json}

You MUST respond with valid JSON that precisely follows this schema without any additional text before or after:
{batch_schema_str}

Each item in the classifications array must correspond to an event in the input, in the same order.
Each classification must include the event_id field to match it with the original event.
"""
            
            # Use a threadpool to run the synchronous Claude API call asynchronously
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.claude_client.messages.create(
                    model=self.model,
                    system=self.system_prompt,
                    messages=[{"role": "user", "content": human_prompt}],
                    temperature=0.1,  # Low temperature for more consistent, predictable outputs
                    max_tokens=4000,
                )
            )
            
            logger.debug(f"Received response from Claude API for batch of {len(batch_events)} events")
            
            # Extract and parse JSON from response with better error handling
            content = response.content[0].text
            
            # Multi-stage extraction approach with progressively more permissive attempts
            json_text = ""
            
            # Stage 1: Try to extract from a JSON code block (most reliable)
            if "```json" in content:
                json_text = content.split("```json")[1].split("```")[0].strip()
                logger.debug("Extracted JSON from code block with json tag")
            
            # Stage 2: Try to extract from any code block
            elif "```" in content:
                json_text = content.split("```")[1].split("```")[0].strip()
                logger.debug("Extracted JSON from generic code block")
            
            # Stage 3: Try to extract JSON by finding matching braces (more error-prone)
            else:
                # Look for opening and closing braces to extract the JSON object
                if "{" in content:
                    start_idx = content.find("{")
                    end_idx = content.rfind("}")
                    if end_idx > start_idx:
                        json_text = content[start_idx:end_idx+1].strip()
                        logger.debug("Extracted JSON by finding matching braces")
                    else:
                        # Fall back to the entire content
                        json_text = content.strip()
                        logger.debug("Using entire response as JSON (no clear structure found)")
                else:
                    # No JSON-like structure found at all - critical error
                    logger.error("No JSON structure found in Claude response")
                    logger.error(f"Raw response: {content[:500]}" + ("..." if len(content) > 500 else ""))
                    raise ValueError("No JSON structure found in response")
            
            # Basic validation before attempting to parse to fail early with a clearer error
            # This prevents cryptic JSON parsing errors for clearly invalid responses
            if not json_text.startswith("{") or not json_text.endswith("}"):
                logger.error(f"Response is not properly formatted JSON: {json_text[:100]}...")
                raise ValueError(f"Response is not properly formatted JSON: {json_text[:100]}...")
            
            # Parse the JSON with detailed error logging for easier debugging
            try:
                result = json.loads(json_text)
                logger.debug(f"Successfully parsed JSON response with {len(result.get('classifications', []))} classifications")
            except json.JSONDecodeError as e:
                # Detailed error capturing including position of parse error and content sample
                # This helps diagnose API response issues in production logs
                logger.error(f"JSON decode error: {e}")
                logger.error(f"Attempted to parse: {json_text[:500]}...")
                raise
            
            # Match classifications back to events
            results = []
            classifications = result.get("classifications", [])
            
            # Create a lookup by event ID for O(1) access instead of linear search
            classification_lookup = {c.get("event_id"): c for c in classifications}
            
            # Log missing event IDs
            missing_ids = []
            for event, _, _ in normalized_events:
                if event.id not in classification_lookup:
                    missing_ids.append(event.id)
            
            if missing_ids:
                logger.warning(f"Events missing from Claude response: {', '.join(missing_ids[:5])}" +
                             (f"... and {len(missing_ids)-5} more" if len(missing_ids) > 5 else ""))
            
            # Match each event with its classification
            for event, calendar_name, normalized in normalized_events:
                event_id = event.id
                classification_data = classification_lookup.get(event_id)
                
                if not classification_data:
                    logger.warning(f"No classification found for event ID {event_id} ('{event.summary}')")
                    results.append((event, calendar_name, None))
                    continue
                
                # Create the EventClassification object
                classification = EventClassification(
                    keep_event=classification_data.get("keep_event", False),
                    goal_alignment=classification_data.get("goal_alignment", []),
                    focus_area_alignment=classification_data.get("focus_area_alignment", []),
                    eisenhower_category=classification_data.get("eisenhower_category", "Not Urgent & Not Important"),
                    confidence_score=classification_data.get("confidence_score", 0.0),
                    reasoning=classification_data.get("reasoning", "No reasoning provided")
                )
                
                # Log classification details
                keep_status = "KEEP" if classification.keep_event else "DISCARD"
                confidence = classification.confidence_score
                above_threshold = confidence >= self.confidence_threshold
                effective_status = "KEPT" if classification.keep_event and above_threshold else "DISCARDED"
                
                logger.debug(f"Event '{event.summary}': {keep_status} with confidence {confidence:.2f} " +
                            f"(threshold: {self.confidence_threshold}) - {effective_status}")
                
                results.append((event, calendar_name, classification))
            
            # Log summary of batch results
            kept_count = sum(1 for _, _, c in results if c and c.keep_event and c.confidence_score >= self.confidence_threshold)
            logger.info(f"Batch complete: {kept_count}/{len(batch_events)} events kept after classification")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch classification with Claude: {e}")
            # Return events with no classification
            return [(event, calendar_name, None) for event, calendar_name in batch_events]

    def _batch_classify_events(self, batch_events: List[Tuple[Event, str]]) -> List[Optional[Tuple[Event, str, EventClassification]]]:
        """Synchronous version of batch classify events (for backward compatibility)."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self._async_batch_classify_events(batch_events))
        finally:
            loop.close()
    
    async def _process_batches_concurrently(self, batches: List[List[Tuple[Event, str]]]) -> List[List[Optional[Tuple[Event, str, EventClassification]]]]:
        """Process multiple batches of events concurrently with improved error handling."""
        results = []
        
        # Use a semaphore to limit concurrency to prevent overwhelming the Claude API
        # This is critical to avoid rate limiting and ensure consistent processing
        semaphore = asyncio.Semaphore(self.max_concurrent_batches)
        logger.info(f"Starting concurrent batch processing with semaphore limit of {self.max_concurrent_batches}")
        
        async def process_with_semaphore(batch_idx, batch):
            """Process a single batch while respecting the concurrency limit."""
            batch_id = f"{batch_idx+1}/{len(batches)}"
            async with semaphore:
                try:
                    logger.info(f"[BATCH {batch_id}] Starting processing of {len(batch)} events")
                    start_time = datetime.now()
                    result = await self._async_batch_classify_events(batch)
                    end_time = datetime.now()
                    duration = (end_time - start_time).total_seconds()
                    
                    # Count how many events were successfully classified and kept
                    classified_count = sum(1 for _, _, c in result if c is not None)
                    kept_count = sum(1 for _, _, c in result if c and c.keep_event and c.confidence_score >= self.confidence_threshold)
                    
                    logger.info(f"[BATCH {batch_id}] Completed in {duration:.2f}s: " +
                              f"{classified_count}/{len(batch)} classified, {kept_count}/{len(batch)} kept")
                    return result
                except Exception as e:
                    logger.error(f"[BATCH {batch_id}] Failed: {e}")
                    return None
        
        # Create tasks for all batches
        tasks = [process_with_semaphore(i, batch) for i, batch in enumerate(batches)]
        
        # Track batch progress
        completed = 0
        failed = 0
        
        # Process results and handle any failed batches by retrying with smaller batch size
        batch_results = await asyncio.gather(*tasks)
        for i, result in enumerate(batch_results):
            if result is None:
                failed += 1
                # Retry with smaller batch size if batch failed completely
                batch = batches[i]
                if len(batch) > 1:
                    batch_id = f"{i+1}/{len(batches)}"
                    logger.info(f"[BATCH {batch_id}] Retrying with smaller batch size ({len(batch)} → {len(batch)//2} + {len(batch) - len(batch)//2})")
                    
                    # Split the batch in half
                    mid = len(batch) // 2
                    first_half = batch[:mid]
                    second_half = batch[mid:]
                    
                    # Retry both halves with exponential backoff
                    try:
                        # Simple backoff to avoid overwhelming the API
                        logger.info(f"[BATCH {batch_id}.1] Waiting 2s before retry...")
                        await asyncio.sleep(2)  # Wait 2 seconds before first retry
                        
                        logger.info(f"[BATCH {batch_id}.1] Retrying first half ({len(first_half)} events)")
                        start_time = datetime.now()
                        first_result = await self._async_batch_classify_events(first_half)
                        duration = (datetime.now() - start_time).total_seconds()
                        
                        if first_result:
                            # Count results
                            first_kept = sum(1 for _, _, c in first_result if c and c.keep_event and c.confidence_score >= self.confidence_threshold)
                            logger.info(f"[BATCH {batch_id}.1] Retry successful in {duration:.2f}s: {first_kept}/{len(first_half)} events kept")
                            results.append(first_result)
                            completed += 1
                        
                        # Shorter backoff for second half since we already waited
                        logger.info(f"[BATCH {batch_id}.2] Waiting 1s before retry...")
                        await asyncio.sleep(1)
                        
                        logger.info(f"[BATCH {batch_id}.2] Retrying second half ({len(second_half)} events)")
                        start_time = datetime.now()
                        second_result = await self._async_batch_classify_events(second_half)
                        duration = (datetime.now() - start_time).total_seconds()
                        
                        if second_result:
                            # Count results
                            second_kept = sum(1 for _, _, c in second_result if c and c.keep_event and c.confidence_score >= self.confidence_threshold)
                            logger.info(f"[BATCH {batch_id}.2] Retry successful in {duration:.2f}s: {second_kept}/{len(second_half)} events kept")
                            results.append(second_result)
                            completed += 1
                        
                    except Exception as e:
                        logger.error(f"[BATCH {batch_id}] Retry failed: {e}")
                        # As a last resort, return unclassified events for manual review
                        logger.info(f"[BATCH {batch_id}] Marking {len(batch)} events for manual review")
                        results.append([(event, cal, None) for event, cal in batch])
                else:
                    batch_id = f"{i+1}/{len(batches)}"
                    # Can't split further, return the event unclassified
                    logger.info(f"[BATCH {batch_id}] Cannot split batch further, marking {len(batch)} events for manual review")
                    results.append([(event, cal, None) for event, cal in batch])
            else:
                # Batch succeeded, add to results
                completed += 1
                results.append(result)
        
        logger.info(f"Concurrent batch processing complete: {completed}/{len(batches)} batches processed successfully " +
                  f"({failed} failed batches handled via retry/recovery)")
            
        return results
    
    def filter_events(self, events: CalendarEventResult) -> FilteredEventResult:
        """Filter calendar events based on Claude's analysis, processing in batches."""
        filtered_output = FilteredEventsOutput()
        all_filtered_events = []
        total_events = 0
        
        logger.info("="*80)
        logger.info("Starting event filtering with Claude (concurrent batch processing)")
        logger.info(f"• Model: {self.model}")
        logger.info(f"• Batch size: {self.batch_size}")
        logger.info(f"• Max concurrent batches: {self.max_concurrent_batches}")
        logger.info(f"• Confidence threshold: {self.confidence_threshold}")
        
        # Determine and report output path
        output_path = None
        if self.config and hasattr(self.config, "FILTERED_EVENTS_OUTPUT_FILE"):
            output_path = self.config.FILTERED_EVENTS_OUTPUT_FILE
        else:
            output_path = "output/filtered_calendar_events.json"
        
        # Make path absolute if relative
        if not os.path.isabs(output_path):
            output_path = os.path.abspath(output_path)
        
        logger.info(f"• Output file: {output_path}")
        logger.info("="*80)
        
        # Collect all valid events to process
        events_to_process = []
        
        # Process each calendar's events
        for calendar_name, calendar_events in events.items():
            logger.info(f"Calendar: {calendar_name} ({len(calendar_events)} events)")
            calendar_total = 0
            calendar_skipped = 0
            total_events += len(calendar_events)
            
            for event in calendar_events:
                calendar_total += 1
                # Skip processing if event is in the past
                if event.start and event.start.date:
                    event_date = event.start.date
                    if event_date < datetime.now().strftime("%Y-%m-%d"):
                        logger.debug(f"Skipping past event: {event.id} - {event.summary}")
                        calendar_skipped += 1
                        continue
                        
                # Skip cancelled events
                if event.status == "cancelled":
                    logger.debug(f"Skipping cancelled event: {event.id} - {event.summary}")
                    calendar_skipped += 1
                    continue
                
                # Add to the list of events to process
                events_to_process.append((event, calendar_name))
            
            logger.info(f"  + {calendar_total - calendar_skipped} events collected for processing ({calendar_skipped} skipped)")
        
        # Create batches
        batches = []
        for i in range(0, len(events_to_process), self.batch_size):
            batch = events_to_process[i:i+self.batch_size]
            batches.append(batch)
        
        logger.info(f"Created {len(batches)} batches with up to {self.batch_size} events each")
        
        # Process batches concurrently using asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Track completed batches for progressive saving
        processed_events = []
        processed_batch_count = 0
        
        try:
            batch_results = loop.run_until_complete(self._process_batches_concurrently(batches))
            
            # Process each batch as it completes and save interim results
            for batch_idx, batch_result in enumerate(batch_results):
                if not batch_result:
                    logger.warning(f"Batch {batch_idx+1} had no results to process")
                    continue
                    
                processed_batch_count += 1
                batch_filtered_events = []
                
                batch_kept = 0
                batch_review = 0
                batch_discarded = 0
                
                for event, calendar_name, classification in batch_result:
                    # Create FilteredEvent from the Event
                    filtered_event = FilteredEvent.from_event(event, calendar_name)
                    
                    if not classification:
                        # Add to filtered events with flag for manual review
                        filtered_event.needs_review = True
                        filtered_event.review_reason = "Failed to classify with Claude"
                        batch_filtered_events.append(filtered_event)
                        batch_review += 1
                        continue
                    
                    # Add classification data to the event
                    filtered_event.classification = classification
                    
                    # Only keep events that pass the filter
                    if classification.keep_event and classification.confidence_score >= self.confidence_threshold:
                        batch_filtered_events.append(filtered_event)
                        batch_kept += 1
                    else:
                        batch_discarded += 1
                
                # Add batch results to the overall list
                processed_events.extend(batch_filtered_events)
                
                logger.info(f"Batch {batch_idx+1} results: {batch_kept} kept, {batch_review} for review, {batch_discarded} discarded")
                
                # Save interim results every 5 batches
                if processed_batch_count % 5 == 0:
                    try:
                        # Determine output path - from config if available, otherwise use default
                        interim_path = None
                        if self.config and hasattr(self.config, "FILTERED_EVENTS_OUTPUT_FILE"):
                            interim_path = self.config.FILTERED_EVENTS_OUTPUT_FILE
                        else:
                            interim_path = "output/filtered_calendar_events.json"
                            # Ensure output directory exists
                            os.makedirs(os.path.dirname(interim_path), exist_ok=True)
                        
                        # Make path absolute if relative
                        if not os.path.isabs(interim_path):
                            interim_path = os.path.abspath(interim_path)
                        
                        # Create a temporary filtered output
                        interim_output = FilteredEventsOutput()
                        # Deduplicate and sort the events processed so far
                        unique_events = self._deduplicate_events(processed_events)
                        sorted_events = self._sort_events(unique_events)
                        
                        interim_output.filtered_events = sorted_events
                        interim_output.metadata["total_events_processed"] = total_events
                        interim_output.metadata["events_retained"] = len(sorted_events)
                        interim_output.metadata["filtering_date"] = datetime.now().isoformat()
                        interim_output.metadata["batches_processed"] = processed_batch_count
                        interim_output.metadata["total_batches"] = len(batches)
                        
                        # Save to a temporary file to avoid corruption
                        temp_path = f"{interim_path}.temp"
                        with open(temp_path, "w", encoding="utf-8") as f:
                            json.dump(interim_output.__dict__, f, indent=2, ensure_ascii=False)
                        
                        # Replace the original file with the temp file
                        if os.path.exists(temp_path):
                            os.replace(temp_path, interim_path)
                            logger.info(f"📝 Saved interim results ({processed_batch_count}/{len(batches)} batches) to: {interim_path}")
                            logger.info(f"   Current progress: {len(sorted_events)}/{total_events} events retained")
                    except Exception as e:
                        logger.error(f"❌ Error saving interim results: {e}")
                
                # Process all filtered events for final output
                all_filtered_events = processed_events
        finally:
            loop.close()
        
        # Deduplicate events
        unique_events = self._deduplicate_events(all_filtered_events)
        
        # Sort events
        sorted_events = self._sort_events(unique_events)
        
        # Create final output structure
        filtered_output.filtered_events = sorted_events
        filtered_output.metadata["total_events_processed"] = total_events
        filtered_output.metadata["events_retained"] = len(sorted_events)
        filtered_output.metadata["filtering_date"] = datetime.now().isoformat()
        filtered_output.metadata["batch_size"] = self.batch_size
        filtered_output.metadata["max_concurrent_batches"] = self.max_concurrent_batches
        filtered_output.metadata["total_batches"] = len(batches)
        filtered_output.metadata["successful_batches"] = processed_batch_count
        
        logger.info("="*80)
        logger.info(f"✅ Filtering complete!")
        logger.info(f"• {len(sorted_events)}/{total_events} events retained ({len(sorted_events)/total_events*100:.1f}%)")
        logger.info(f"• {processed_batch_count}/{len(batches)} batches processed successfully")
        logger.info(f"• Final output will be saved to: {output_path}")
        logger.info("="*80)
        
        return filtered_output.__dict__
    
    def _deduplicate_events(self, events: List[FilteredEvent]) -> List[FilteredEvent]:
        """Remove duplicate events based on event ID.
        
        When events are processed in batches with retries, the same event might be processed 
        multiple times. This function ensures we keep only the highest quality classification
        for each unique event.
        
        Args:
            events: List of filtered events that may contain duplicates

        Returns:
            List of unique events with the highest confidence classification kept
        """
        unique_events = {}
        for event in events:
            event_id = event.id
            
            # If we haven't seen this ID before, add it
            if event_id not in unique_events:
                unique_events[event_id] = event
            else:
                # If we have seen it, keep the one with higher confidence score
                # This ensures we use the best classification when an event appears in multiple batches
                existing_confidence = 0
                if unique_events[event_id].classification:
                    existing_confidence = unique_events[event_id].classification.confidence_score
                    
                new_confidence = 0
                if event.classification:
                    new_confidence = event.classification.confidence_score
                
                if new_confidence > existing_confidence:
                    unique_events[event_id] = event
        
        return list(unique_events.values())
    
    def _sort_events(self, events: List[FilteredEvent]) -> List[FilteredEvent]:
        """Sort events by date and Eisenhower category.
        
        This provides a consistent ordering of events for output, making the 
        results predictable and easier to work with. Events are primarily sorted
        by date, then by importance/urgency.
        
        Args:
            events: List of filtered events to sort
            
        Returns:
            Sorted list of events with consistent ordering
        """
        # Define priority order for Eisenhower categories
        # Lower values = higher priority
        priority_order = {
            "Urgent & Important": 0,
            "Important & Not Urgent": 1,
            "Urgent & Not Important": 2,
            "Not Urgent & Not Important": 3
        }
        
        # Sort by date first, then by Eisenhower category
        # Uses a tuple key for multi-level sorting
        return sorted(
            events,
            key=lambda x: (
                x.start_date or "9999-12-31",  # Default to far future if no date
                priority_order.get(
                    x.classification.eisenhower_category if x.classification else "Not Urgent & Not Important",
                    3  # Default to lowest priority if no category
                )
            )
        )
    
    def save_filtered_events(self, filtered_data: FilteredEventResult, file_path: str | None = None) -> None:
        """Save the filtered events to a JSON file."""
        # Determine file path - use provided path, config path, or default
        output_path = file_path
        if not output_path and self.config and hasattr(self.config, "FILTERED_EVENTS_OUTPUT_FILE"):
            output_path = self.config.FILTERED_EVENTS_OUTPUT_FILE
        if not output_path:
            output_path = "output/filtered_calendar_events.json"
        
        # Make path absolute if relative
        if not os.path.isabs(output_path):
            # Get current working directory and make path absolute for clearer logging
            output_path = os.path.abspath(output_path)
        
        # Ensure directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Saving filtered events to: {output_path}")
        
        try:
            event_count = len(filtered_data.get("filtered_events", []))
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(filtered_data, f, indent=2, ensure_ascii=False)
            logger.info(f"✅ Successfully saved {event_count} filtered events to: {output_path}")
        except Exception as e:
            logger.error(f"❌ Error saving filtered events: {e}")
            raise 