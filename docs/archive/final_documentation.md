# Input Processing System Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Implementation Guide](#implementation-guide)
5. [Extension Guide](#extension-guide)
6. [Rollout Strategy](#rollout-strategy)
7. [Examples](#examples)
8. [FAQ](#faq)

## Introduction

The Input Processing System is a flexible, extensible framework designed to process various types of input (emails, meeting notes, manual entries, etc.), classify them according to their nature (tasks, events, reference information, etc.), and route them to appropriate destinations (Todoist, Calendar, Markdown notes, etc.).

### Purpose

This system addresses the common challenge of managing information overload by:

1. Automating the classification of different types of information
2. Standardizing the processing workflow
3. Ensuring important items are properly captured and actioned
4. Reducing manual effort in organizing information

### Design Principles

The system is built on SOLID principles:

- **Single Responsibility Principle**: Each component has one specific job
- **Open/Closed Principle**: Extensible without modifying existing code
- **Liskov Substitution Principle**: Implementations are substitutable for their interfaces
- **Interface Segregation Principle**: Focused interfaces for specific purposes
- **Dependency Inversion Principle**: High-level modules depend on abstractions

## System Architecture

The Input Processing System follows a pipeline architecture with clear separation of concerns:

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Raw Input  │────▶│  Input Items    │────▶│  Input Processors │────▶│ Processed Items │
└─────────────┘     └─────────────────┘     └──────────────────┘     └─────────────────┘
                                                                              │
                                                                              ▼
                    ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
                    │    Actions      │◀────│ Destination      │◀────│ Output Handling │
                    │                 │     │ Handlers         │     │ Service         │
                    └─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Key Components

1. **Input Items**: Encapsulate raw input data with source information
2. **Input Processors**: Analyze and categorize input items
3. **Processed Items**: Contain the results of processing with extracted data
4. **Output Handling Service**: Routes processed items to appropriate handlers
5. **Destination Handlers**: Format and handle processed items for specific destinations
6. **Orchestration Service**: Coordinates the entire process

## Core Components

### Input Sources

The system supports various input sources through the `InputSource` enum:

```typescript
export enum InputSource {
  EMAIL = 'EMAIL',
  MEETING_NOTES = 'MEETING_NOTES',
  VOICE_MEMO = 'VOICE_MEMO',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  OTHER = 'OTHER'
}
```

### Item Nature Types

Items are categorized by their nature using the `ItemNature` enum:

```typescript
export enum ItemNature {
  UNKNOWN = 'UNKNOWN',
  ACTIONABLE_TASK = 'ACTIONABLE_TASK',
  POTENTIAL_EVENT = 'POTENTIAL_EVENT',
  REFERENCE_INFO = 'REFERENCE_INFO',
  PROJECT_IDEA = 'PROJECT_IDEA',
  UNCLEAR = 'UNCLEAR',
  TRASH = 'TRASH'
}
```

### Destination Types

The system supports various destination types through the `DestinationType` enum:

```typescript
export enum DestinationType {
  TODOIST = 'TODOIST',
  CALENDAR = 'CALENDAR',
  MARKDOWN = 'MARKDOWN',
  REVIEW_LATER = 'REVIEW_LATER',
  NONE = 'NONE'
}
```

### Core Interfaces

#### IInputItem

```typescript
export interface IInputItem {
  source: InputSource;
  rawContent: any;
  timestamp: Date;
  getPotentialNature(): ItemNature;
}
```

#### IProcessedItem

```typescript
export interface IProcessedItem {
  originalInput: IInputItem;
  determinedNature: ItemNature;
  extractedData: Record<string, any>;
  suggestedDestination: DestinationType;
}
```

#### IInputProcessor

```typescript
export interface IInputProcessor {
  canProcess(input: IInputItem): boolean;
  process(input: IInputItem): IProcessedItem;
}
```

#### IDestinationHandler

```typescript
export interface IDestinationHandler {
  canHandle(processedItem: IProcessedItem): boolean;
  handle(processedItem: IProcessedItem): Promise<void>;
}
```

### Orchestration Services

#### InputProcessingService

Manages the selection and execution of input processors.

```typescript
export class InputProcessingService {
  private processors: IInputProcessor[] = [];
  
  public addProcessor(processor: IInputProcessor): void { ... }
  
  public processInput(item: IInputItem): IProcessedItem { ... }
}
```

#### OutputHandlingService

Manages the selection and execution of destination handlers.

```typescript
export class OutputHandlingService {
  private handlers: IDestinationHandler[] = [];
  
  public addHandler(handler: IDestinationHandler): void { ... }
  
  public async handleOutput(item: IProcessedItem): Promise<void> { ... }
}
```

#### InputProcessingOrchestrator

Coordinates the entire process.

```typescript
export class InputProcessingOrchestrator {
  private inputProcessingService: InputProcessingService;
  private outputHandlingService: OutputHandlingService;
  
  public async processAndHandle(item: IInputItem): Promise<void> { ... }
}
```

## Implementation Guide

### Setup

1. **Create Project Structure**:
   ```
   input-processing-system/
   ├── src/
   │   ├── core/
   │   │   ├── interfaces.ts
   │   │   ├── enums.ts
   │   │   └── base-classes.ts
   │   ├── input-items/
   │   │   ├── manual-task-item.ts
   │   │   ├── text-input-item.ts
   │   │   └── meeting-note-item.ts
   │   ├── processors/
   │   │   ├── task-detection-processor.ts
   │   │   ├── event-detection-processor.ts
   │   │   ├── reference-info-processor.ts
   │   │   └── default-processor.ts
   │   ├── handlers/
   │   │   ├── todoist-handler.ts
   │   │   ├── calendar-handler.ts
   │   │   ├── markdown-handler.ts
   │   │   ├── review-later-handler.ts
   │   │   └── trash-handler.ts
   │   └── services/
   │       ├── input-processing-service.ts
   │       ├── output-handling-service.ts
   │       └── orchestrator.ts
   ├── examples/
   │   └── implementation-examples.ts
   ├── package.json
   └── tsconfig.json
   ```

2. **Install Dependencies**:
   ```bash
   npm init -y
   npm install typescript @types/node --save-dev
   ```

3. **Configure TypeScript**:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true
     },
     "include": ["src/**/*"]
   }
   ```

### Basic Usage

1. **Create Input Items**:
   ```typescript
   // Manual task
   const taskItem = new ManualTaskInputItem(
     "Complete project proposal",
     "Draft the initial proposal for the client meeting",
     new Date("2025-04-15"),
     2 // Medium priority
   );

   // Text input
   const textItem = new TextInputItem(
     "Meeting with marketing team tomorrow at 2:30 PM to discuss Q2 campaign. Location: Conference Room A.",
     "Marketing Meeting",
     InputSource.MEETING_NOTES
   );
   ```

2. **Set Up Orchestrator**:
   ```typescript
   // Create orchestrator with default processors and handlers
   const orchestrator = new InputProcessingOrchestrator();
   ```

3. **Process Input**:
   ```typescript
   // Process and handle input
   await orchestrator.processAndHandle(taskItem);
   ```

### Manual Implementation Steps

For the MVP, some components require manual intervention:

#### For Todoist Tasks

When the system identifies a task for Todoist, it will display formatted output. You need to manually add this task to Todoist.

#### For Markdown References

When the system identifies reference information, it will display formatted Markdown. You need to manually save this to your notes system.

#### For Calendar Events

When the system identifies a potential calendar event, it will display formatted event details and ask for confirmation. If confirmed, the system will use the AI calendar tool to create the event.

#### For Review Later Items

When the system cannot clearly classify an item, it will display the content for manual review.

## Extension Guide

The system is designed to be extended in various ways:

### Adding New Input Sources

1. Extend the `InputSource` enum with new source types
2. Create custom input item classes extending `BaseInputItem`

### Creating Custom Processors

1. Extend `BaseInputProcessor` to create specialized processors
2. Implement `canProcess` and `process` methods
3. Add the processor to the `InputProcessingService`

### Adding New Destination Types

1. Extend the `DestinationType` enum with new destination types
2. Create custom handlers extending `BaseDestinationHandler`
3. Add the handler to the `OutputHandlingService`

### Customizing Orchestration

1. Extend the `InputProcessingOrchestrator` class
2. Override the `processAndHandle` method to add custom logic
3. Implement custom hooks for different stages of processing

### Advanced Extensions

1. **NLP Integration**: Enhance text processing with natural language processing
2. **Direct API Integration**: Create handlers that directly integrate with external APIs
3. **Machine Learning Classification**: Implement processors that use machine learning for classification

## Rollout Strategy

The system is designed to be rolled out in phases:

### Phase 1: Foundation (Weeks 1-2)

- Establish core infrastructure
- Implement basic manual workflows
- Train key users

### Phase 2: Basic Integration (Weeks 3-4)

- Expand input sources
- Improve processing accuracy
- Establish regular usage patterns

### Phase 3: Automation Expansion (Weeks 5-8)

- Reduce manual steps
- Integrate with external systems
- Expand user adoption

### Phase 4: Advanced Features (Weeks 9-12)

- Implement AI-enhanced processing
- Add direct integrations
- Optimize user experience

### Phase 5: Learning & Optimization (Ongoing)

- Implement machine learning capabilities
- Optimize performance
- Expand to additional destinations

## Examples

### Example 1: Processing a Manual Task

```typescript
// Create the orchestrator
const orchestrator = new InputProcessingOrchestrator();

// Create a manual task input
const taskItem = new ManualTaskInputItem(
  "Complete project proposal",
  "Draft the initial proposal for the client meeting",
  new Date("2025-04-15"),
  2 // Medium priority
);

// Process and handle the input
await orchestrator.processAndHandle(taskItem);
```

### Example 2: Processing Text with Task Information

```typescript
// Create the orchestrator
const orchestrator = new InputProcessingOrchestrator();

// Create a text input with task information
const textItem = new TextInputItem(
  "Please review the marketing materials by Friday. Priority: high",
  "Marketing Review Task",
  InputSource.EMAIL
);

// Process and handle the input
await orchestrator.processAndHandle(textItem);
```

### Example 3: Processing Text with Event Information

```typescript
// Create the orchestrator
const orchestrator = new InputProcessingOrchestrator();

// Create a text input with event information
const textItem = new TextInputItem(
  "Team meeting tomorrow at 2:30 PM in Conference Room A. We'll discuss the Q2 roadmap.",
  "Team Meeting",
  InputSource.SLACK_MESSAGE
);

// Process and handle the input
await orchestrator.processAndHandle(textItem);
```

## FAQ

### General Questions

**Q: What is the Input Processing System?**  
A: It's a framework for processing various types of input, classifying them, and routing them to appropriate destinations.

**Q: What problem does it solve?**  
A: It helps manage information overload by automating the classification and organization of different types of information.

**Q: Is it fully automated?**  
A: The MVP includes some manual steps, but the system is designed to be gradually automated over time.

### Technical Questions

**Q: What programming language is used?**  
A: The system is implemented in TypeScript.

**Q: How do I add a new input source?**  
A: Extend the `InputSource` enum and create a new input item class extending `BaseInputItem`.

**Q: How do I add a new destination?**  
A: Extend the `DestinationType` enum and create a new handler extending `BaseDestinationHandler`.

**Q: Can I customize the processing logic?**  
A: Yes, you can create custom processors extending `BaseInputProcessor` and add them to the `InputProcessingService`.

### Implementation Questions

**Q: How do I get started?**  
A: Follow the setup instructions in the Implementation Guide section.

**Q: What are the manual steps required?**  
A: For the MVP, you need to manually add tasks to Todoist, save reference information to Markdown, and confirm calendar events.

**Q: How long does it take to implement?**  
A: The basic system can be set up in 1-2 weeks, with additional phases rolled out over 3-6 months.

**Q: How can I contribute to the project?**  
A: You can extend the system with new processors, handlers, or other enhancements following the Extension Guide.
