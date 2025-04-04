# MVP Requirements and P0 Tasks

## Core MVP Principles
1. **Functional First Approach**: Implement core functionality before refinements
2. **Manual with Path to Automation**: Start with manual implementations where needed, design for future automation
3. **Interface Stability**: Design stable interfaces that won't change as implementation evolves
4. **Minimal Viable Classes**: Start with essential classes only, expand as needed

## P0 (Highest Priority) Components

### Core Interfaces (Must Have)
1. **IInputItem**: Foundation for all input types
   - Properties: Source, RawContent, Timestamp
   - Methods: GetPotentialNature()

2. **IProcessedItem**: Foundation for all processed results
   - Properties: OriginalInput, DeterminedNature, ExtractedData, SuggestedDestination
   - Methods: None required for MVP

3. **IInputProcessor**: Strategy pattern for processing logic
   - Methods: CanProcess(input), Process(input)

4. **IDestinationHandler**: Strategy pattern for handling logic
   - Methods: CanHandle(processedItem), Handle(processedItem)

### Enums and Types (Must Have)
1. **ItemNature**: UNKNOWN, ACTIONABLE_TASK, POTENTIAL_EVENT, REFERENCE_INFO, PROJECT_IDEA, UNCLEAR, TRASH
2. **DestinationType**: TODOIST, CALENDAR, MARKDOWN, REVIEW_LATER, NONE
3. **IInputSource**: Simple enum for input sources (EMAIL, MEETING_NOTES, MANUAL_ENTRY, etc.)

### Minimal Concrete Implementations (Must Have)
1. **Input Items**:
   - ManualTaskInputItem: For direct task entry (simplest case)
   - TextInputItem: Generic text-based input (for notes, emails, etc.)

2. **Processors**:
   - TaskDetectionProcessor: Identifies actionable tasks from text
   - EventDetectionProcessor: Identifies potential calendar events
   - DefaultProcessor: Fallback processor for unclassified inputs

3. **Handlers**:
   - TodoistHandler: Format task for manual Todoist entry
   - CalendarHandler: Format event and use AI calendar tool
   - MarkdownHandler: Format reference info for manual saving
   - ReviewLaterHandler: Simple notification for unclear items

### Orchestration Services (Must Have)
1. **InputProcessingService**: Manages processor selection and execution
2. **OutputHandlingService**: Manages handler selection and execution

## Manual Implementation Requirements

### User Interaction Points
1. **Input Capture**: Initially manual entry of input details
2. **Todoist Actions**: User manually adds tasks to Todoist
3. **Markdown Actions**: User manually saves reference info to Markdown
4. **Decision Points**: User confirms calendar events before AI creates them

### Implementation Guidelines Needed
1. **Input Formatting**: How to structure manual input for processing
2. **Output Interpretation**: How to interpret system output for manual actions
3. **Transition Plan**: Path from manual to automated implementations

## P1 (Secondary Priority) Components
1. Additional input item types (EmailInputItem, MeetingNoteInputItem)
2. More specialized processors (EmailToTaskProcessor, MeetingNoteToActionItemProcessor)
3. Configuration system for processor/handler priorities
4. Logging and history tracking

## P2 (Future Enhancements) Components
1. Natural language processing enhancements
2. Integration with email systems
3. Direct API integration with Todoist
4. Machine learning for improved classification
5. User preference learning
