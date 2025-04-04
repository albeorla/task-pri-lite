# GTD-Eisenhower Module

This module provides a robust implementation of GTD (Getting Things Done) principles combined with Eisenhower prioritization, powered by LLMs (Large Language Models) through LangChain.js.

## Overview

The GTD-Eisenhower module helps process tasks through the GTD workflow:

1. **Capture**: Import tasks into the system
2. **Clarify**: Determine if tasks are actionable and identify outcomes
3. **Organize**: Sort tasks into projects, next actions, etc.
4. **Prioritize**: Use the Eisenhower Matrix to assess urgency/importance
5. **Store**: Persist processed tasks and projects

## Key Features

- **LLM-powered task processing**: Uses OpenAI's GPT models to analyze tasks
- **GTD Clarification**: Determines if tasks are actionable, need to be broken down, etc.
- **Eisenhower Prioritization**: Assesses task urgency and importance
- **Project Management**: Identifies and manages multi-step outcomes
- **Next Actions**: Suggests next physical actions to move projects forward
- **Context Assignment**: Associates tasks with contexts like @home, @work
- **Data Persistence**: Saves and loads processed tasks and projects

## Installation

```bash
# Install dependencies
yarn add @langchain/core @langchain/openai zod dotenv
```

## Environment Setup

Create a `.env` file with your OpenAI API key:

```
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4-turbo
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_TOKENS=1024
```

## Usage

### Basic Example

```typescript
import { createGTDEisenhowerSystem, Task, TaskStatus } from '../gtd-eisen';

async function example() {
  // Initialize the system
  const system = await createGTDEisenhowerSystem('./data');
  const { taskManager, storageService } = system;

  // Create tasks
  const tasks = [
    new Task({ description: "Complete project proposal" }),
    new Task({ description: "Review meeting notes" }),
    // Add more tasks...
  ];

  // Process tasks through GTD and Eisenhower workflows
  taskManager.loadTasks(tasks);
  await taskManager.runWorkflow();

  // View results
  taskManager.printSummary('status');
  
  // Save results
  await storageService.saveAll(
    taskManager.getAllTasks(),
    taskManager.getAllProjects()
  );
}
```

### Integration with Existing Applications

See `src/integration/gtd-eisen-integration.ts` for a complete example of integrating this module with an existing application.

## Architecture

The module follows SOLID principles and uses the following design patterns:

- **Dependency Injection**: Services and processors are injected into managers
- **Strategy Pattern**: Swappable processors and prioritizers
- **Repository Pattern**: Storage abstraction for data persistence
- **Factory Pattern**: System creation via the `createGTDEisenhowerSystem` function

## Components

- **Models**: `Task`, `Project` with associated enums and interfaces
- **Services**: `LLMService` for LangChain integration
- **Processors**: `GTDClarificationProcessor` for applying GTD principles
- **Prioritizers**: `EisenhowerPrioritizer` for prioritization
- **Managers**: `TaskManager` for orchestrating the workflow
- **Storage**: `StorageService` for data persistence

## Customization

You can extend the system by:

1. Implementing new processors that adhere to the `TaskProcessor` interface
2. Creating new prioritizers that implement the `Prioritizer` interface
3. Developing custom storage services that implement `StorageService`
4. Replacing the LLM service with your own implementation

## License

MIT 