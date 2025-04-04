# MVP Scope and Implementation Priorities

## MVP Core Components

### Phase 1: Foundation (Week 1)
- **Core Interfaces and Abstractions** ✅
  - IInputItem, IProcessedItem, IInputProcessor, IDestinationHandler interfaces
  - BaseInputItem, BaseProcessedItem, BaseInputProcessor, BaseDestinationHandler abstract classes
  - InputProcessingService and OutputHandlingService orchestration classes

### Phase 2: Basic Input Items (Week 1-2)
- **Priority Input Item Implementations**
  1. **ManualTaskInputItem** (P0)
     - Simplest implementation for direct task entry
     - Properties: title, description, dueDate, priority
     - Used for quick task capture scenarios
  
  2. **TextInputItem** (P0)
     - Generic text-based input implementation
     - Properties: text, title (optional)
     - Used for processing emails, notes, and other text content
  
  3. **MeetingNoteInputItem** (P1)
     - Specialized for meeting notes processing
     - Properties: meetingTitle, attendees, notes, date
     - Implementation can be deferred to post-MVP

### Phase 3: Core Processors (Week 2)
- **Priority Processor Implementations**
  1. **TaskDetectionProcessor** (P0)
     - Identifies actionable tasks from text
     - Looks for action verbs, deadlines, assignments
     - Returns ProcessedItem with ACTIONABLE_TASK nature and TODOIST destination
  
  2. **EventDetectionProcessor** (P0)
     - Identifies potential calendar events
     - Looks for date/time patterns, location mentions, meeting keywords
     - Returns ProcessedItem with POTENTIAL_EVENT nature and CALENDAR destination
  
  3. **ReferenceInfoProcessor** (P0)
     - Identifies reference information
     - Looks for informational content, links, resources
     - Returns ProcessedItem with REFERENCE_INFO nature and MARKDOWN destination
  
  4. **DefaultProcessor** (P0)
     - Fallback processor for unclassified inputs
     - Always returns ProcessedItem with UNCLEAR nature and REVIEW_LATER destination

### Phase 4: Destination Handlers (Week 3)
- **Priority Handler Implementations**
  1. **TodoistHandler** (P0)
     - Formats task for manual Todoist entry
     - Presents structured output for user to copy/paste or manually enter
     - Manual implementation in MVP, with design for future automation
  
  2. **CalendarHandler** (P0)
     - Formats event and uses AI calendar tool
     - Asks for user confirmation before creating event
     - Semi-automated implementation in MVP
  
  3. **MarkdownHandler** (P0)
     - Formats reference info for manual saving
     - Presents structured Markdown for user to save
     - Manual implementation in MVP
  
  4. **ReviewLaterHandler** (P0)
     - Simple notification for unclear items
     - Suggests user review or discard
     - Manual implementation in MVP

### Phase 5: Integration and Testing (Week 3-4)
- **System Integration**
  - Connect all components into working flow
  - Create simple CLI or UI for testing
  - Develop user guidelines for manual steps

## Implementation Approach

### Manual vs. Automated Components

#### Manual Components (MVP)
1. **Input Capture**
   - User manually enters input details
   - System creates appropriate IInputItem object

2. **Todoist Actions**
   - System formats task information
   - User manually adds to Todoist

3. **Markdown Actions**
   - System formats reference information
   - User manually saves to Markdown file

#### Semi-Automated Components (MVP)
1. **Calendar Actions**
   - System formats event information
   - System asks for user confirmation
   - If confirmed, system uses AI calendar tool to create event

#### Fully Automated Components (MVP)
1. **Input Processing**
   - System automatically selects appropriate processor
   - System automatically processes input

2. **Output Handling**
   - System automatically selects appropriate handler
   - System automatically formats output for user action

### Post-MVP Enhancements (Prioritized)

#### Phase 6: Enhanced Processing (Future)
1. **Natural Language Processing** (P1)
   - Improve task and event detection accuracy
   - Extract more details from unstructured text

2. **Email Integration** (P1)
   - Direct processing of email content
   - Automatic extraction of email metadata

#### Phase 7: Direct Integrations (Future)
1. **Todoist API Integration** (P2)
   - Direct task creation in Todoist
   - Bidirectional sync capabilities

2. **Advanced Calendar Features** (P2)
   - Attendee management
   - Recurring event handling

#### Phase 8: Machine Learning (Future)
1. **User Preference Learning** (P2)
   - Learn from user corrections and preferences
   - Improve classification accuracy over time

2. **Predictive Processing** (P3)
   - Predict likely destinations based on content patterns
   - Suggest related tasks or events
