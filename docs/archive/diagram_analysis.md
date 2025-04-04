# Flow Diagram Analysis

## Key Components Identified

### Input Processing Flow
1. **Raw Input Arrival** - Starting point of the flow
2. **IInputItem Object Creation** - Encapsulation of raw input
3. **InputProcessingService.ProcessInput()** - Main orchestration method
4. **IInputProcessors Iteration** - Strategy pattern implementation
5. **Processor Selection Logic** - Based on `CanProcess(item)` capability
6. **Processing Execution** - `chosenProcessor.Process(item)`
7. **IProcessedItem Object Creation** - Result of processing
8. **OutputHandlingService.HandleOutput()** - Secondary orchestration method
9. **IDestinationHandler Selection** - Based on ProcessedItem type
10. **Handling Execution** - `chosenHandler.Handle(processedItem)`

### Handling Actions Subgraph
1. **Handler Type Determination** - Branching logic
2. **CalendarHandler Flow**:
   - Format prompt and ask for user confirmation
   - If confirmed, call generic_calendar Tool
3. **TodoistHandler Flow**:
   - Format prompt for user
   - User manually adds to Todoist
4. **MarkdownHandler Flow**:
   - Format prompt for user
   - User manually saves to Markdown
5. **Other Handlers Flow**:
   - Inform user (Review/Trash)

## SOLID Principles Application

### Single Responsibility Principle (SRP)
- Each processor focuses on one type of input processing
- Each handler focuses on one type of destination handling
- Clear separation between processing logic and handling logic

### Open/Closed Principle (OCP)
- System is open for extension (new processors, new handlers) without modifying existing code
- New input types can be added without changing the core flow

### Liskov Substitution Principle (LSP)
- All processors implement IInputProcessor interface
- All handlers implement IDestinationHandler interface
- Concrete implementations can be substituted for their interfaces

### Interface Segregation Principle (ISP)
- Focused interfaces (IInputProcessor, IDestinationHandler)
- No forced implementation of unnecessary methods

### Dependency Inversion Principle (DIP)
- High-level modules (services) depend on abstractions (interfaces)
- Low-level modules (concrete processors/handlers) also depend on abstractions

## Design Patterns Identified

1. **Strategy Pattern**:
   - Different processing strategies encapsulated in IInputProcessor implementations
   - Different handling strategies encapsulated in IDestinationHandler implementations

2. **Chain of Responsibility**:
   - Processors are tried in sequence until one can handle the input
   - Handlers are tried in sequence until one can handle the processed item

3. **Factory Pattern** (implied):
   - Selection of appropriate handler based on ProcessedItem type

## Manual vs. Automated Implementation

1. **Automated Components**:
   - Core orchestration logic
   - Processing selection
   - Handler selection
   - CalendarHandler (uses AI-assisted generic_calendar Tool)

2. **Manual Components**:
   - TodoistHandler (requires user action)
   - MarkdownHandler (requires user action)
   - Other handlers (user review/action)
