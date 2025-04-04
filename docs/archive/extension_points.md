# Extension Points Documentation

## Overview

This document outlines the key extension points in the Input Processing System, designed according to SOLID principles. These extension points allow for customization and enhancement of the system without modifying existing code, following the Open/Closed Principle.

## Core Extension Points

### 1. Input Sources

The system is designed to accept input from various sources through the `IInputItem` interface and `InputSource` enum.

#### How to Extend

1. **Add New Input Source Types**:
   - Extend the `InputSource` enum with new source types:

```typescript
// Original enum
export enum InputSource {
  EMAIL = 'EMAIL',
  MEETING_NOTES = 'MEETING_NOTES',
  VOICE_MEMO = 'VOICE_MEMO',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  OTHER = 'OTHER'
}

// Extended enum
export enum InputSource {
  EMAIL = 'EMAIL',
  MEETING_NOTES = 'MEETING_NOTES',
  VOICE_MEMO = 'VOICE_MEMO',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  JIRA_TICKET = 'JIRA_TICKET',  // New source
  GITHUB_ISSUE = 'GITHUB_ISSUE', // New source
  TRELLO_CARD = 'TRELLO_CARD',  // New source
  OTHER = 'OTHER'
}
```

2. **Create Custom Input Item Classes**:
   - Extend `BaseInputItem` to create specialized input item classes:

```typescript
export class JiraTicketInputItem extends BaseInputItem {
  constructor(
    public ticketId: string,
    public summary: string,
    public description: string,
    public assignee: string,
    public priority: string
  ) {
    super(InputSource.JIRA_TICKET, {
      ticketId,
      summary,
      description,
      assignee,
      priority
    });
  }
  
  public getPotentialNature(): ItemNature {
    // Logic to determine if this is a task, event, etc.
    return ItemNature.ACTIONABLE_TASK;
  }
}
```

### 2. Input Processors

The system uses the Strategy pattern for input processing through the `IInputProcessor` interface.

#### How to Extend

1. **Create Custom Processors**:
   - Extend `BaseInputProcessor` to create specialized processors:

```typescript
export class JiraTicketProcessor extends BaseInputProcessor {
  public canProcess(input: IInputItem): boolean {
    return input.source === InputSource.JIRA_TICKET;
  }
  
  public process(input: IInputItem): IProcessedItem {
    // Cast to the specific input type
    const jiraInput = input as JiraTicketInputItem;
    
    // Extract relevant information
    const title = `[${jiraInput.ticketId}] ${jiraInput.summary}`;
    const description = jiraInput.description;
    const priority = this.mapJiraPriorityToTodoistPriority(jiraInput.priority);
    
    // Create processed item
    return new BaseProcessedItem(
      input,
      ItemNature.ACTIONABLE_TASK,
      DestinationType.TODOIST,
      {
        title,
        description,
        priority,
        jiraTicketId: jiraInput.ticketId,
        assignee: jiraInput.assignee
      }
    );
  }
  
  private mapJiraPriorityToTodoistPriority(jiraPriority: string): number {
    // Map Jira priorities to Todoist priorities (1-4)
    switch (jiraPriority.toLowerCase()) {
      case 'highest': return 1;
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      case 'lowest': return 4;
      default: return 4;
    }
  }
}
```

2. **Register Custom Processors**:
   - Add the processor to the `InputProcessingService`:

```typescript
const processingService = new InputProcessingService();
processingService.addProcessor(new JiraTicketProcessor());
```

### 3. Destination Types

The system supports various destination types through the `DestinationType` enum.

#### How to Extend

1. **Add New Destination Types**:
   - Extend the `DestinationType` enum:

```typescript
// Original enum
export enum DestinationType {
  TODOIST = 'TODOIST',
  CALENDAR = 'CALENDAR',
  MARKDOWN = 'MARKDOWN',
  REVIEW_LATER = 'REVIEW_LATER',
  NONE = 'NONE'
}

// Extended enum
export enum DestinationType {
  TODOIST = 'TODOIST',
  CALENDAR = 'CALENDAR',
  MARKDOWN = 'MARKDOWN',
  REVIEW_LATER = 'REVIEW_LATER',
  JIRA = 'JIRA',           // New destination
  GITHUB = 'GITHUB',       // New destination
  SLACK_REMINDER = 'SLACK_REMINDER', // New destination
  NONE = 'NONE'
}
```

### 4. Destination Handlers

The system uses the Strategy pattern for output handling through the `IDestinationHandler` interface.

#### How to Extend

1. **Create Custom Handlers**:
   - Extend `BaseDestinationHandler` to create specialized handlers:

```typescript
export class JiraHandler extends BaseDestinationHandler {
  constructor() {
    super(DestinationType.JIRA);
  }
  
  public async handle(processedItem: IProcessedItem): Promise<void> {
    // Extract details from the processed item
    const title = processedItem.extractedData.title || 'Untitled Issue';
    const description = processedItem.extractedData.description || '';
    const priority = processedItem.extractedData.priority || 'Medium';
    
    // Format the issue for Jira
    const formattedIssue = `
## Issue for Jira

### Summary
${title}

${description ? `### Description
${description}

` : ''}### Priority
${priority}

---
Please create this issue in Jira manually.
`;
    
    console.log(formattedIssue);
    
    // In a real implementation, this would call the Jira API
    // await this.createJiraIssue(title, description, priority);
    
    return Promise.resolve();
  }
  
  private async createJiraIssue(
    title: string,
    description: string,
    priority: string
  ): Promise<void> {
    // Implementation would use Jira API client
    console.log('Creating Jira issue:', { title, description, priority });
    return Promise.resolve();
  }
}
```

2. **Register Custom Handlers**:
   - Add the handler to the `OutputHandlingService`:

```typescript
const handlingService = new OutputHandlingService();
handlingService.addHandler(new JiraHandler());
```

### 5. Item Nature Types

The system categorizes items by their nature using the `ItemNature` enum.

#### How to Extend

1. **Add New Nature Types**:
   - Extend the `ItemNature` enum:

```typescript
// Original enum
export enum ItemNature {
  UNKNOWN = 'UNKNOWN',
  ACTIONABLE_TASK = 'ACTIONABLE_TASK',
  POTENTIAL_EVENT = 'POTENTIAL_EVENT',
  REFERENCE_INFO = 'REFERENCE_INFO',
  PROJECT_IDEA = 'PROJECT_IDEA',
  UNCLEAR = 'UNCLEAR',
  TRASH = 'TRASH'
}

// Extended enum
export enum ItemNature {
  UNKNOWN = 'UNKNOWN',
  ACTIONABLE_TASK = 'ACTIONABLE_TASK',
  POTENTIAL_EVENT = 'POTENTIAL_EVENT',
  REFERENCE_INFO = 'REFERENCE_INFO',
  PROJECT_IDEA = 'PROJECT_IDEA',
  DECISION = 'DECISION',       // New nature
  QUESTION = 'QUESTION',       // New nature
  FEEDBACK = 'FEEDBACK',       // New nature
  UNCLEAR = 'UNCLEAR',
  TRASH = 'TRASH'
}
```

### 6. Orchestration Customization

The system's orchestration can be customized to change the processing flow.

#### How to Extend

1. **Custom Orchestration Logic**:
   - Extend the `InputProcessingOrchestrator` class:

```typescript
export class CustomOrchestrator extends InputProcessingOrchestrator {
  /**
   * Override the processAndHandle method to add custom logic
   */
  public async processAndHandle(item: IInputItem): Promise<void> {
    try {
      console.log('Starting custom processing workflow...');
      
      // Pre-processing hooks
      await this.beforeProcessing(item);
      
      // Process the input
      const processedItem = this.inputProcessingService.processInput(item);
      
      // Post-processing hooks
      await this.afterProcessing(processedItem);
      
      // Pre-handling hooks
      await this.beforeHandling(processedItem);
      
      // Handle the processed item
      await this.outputHandlingService.handleOutput(processedItem);
      
      // Post-handling hooks
      await this.afterHandling(processedItem);
      
      console.log('Custom workflow completed successfully');
    } catch (error) {
      console.error('Error in custom workflow:', error);
      await this.handleError(error, item);
    }
  }
  
  /**
   * Custom hook before processing
   */
  protected async beforeProcessing(item: IInputItem): Promise<void> {
    console.log('Before processing hook');
    // Custom logic here
  }
  
  /**
   * Custom hook after processing
   */
  protected async afterProcessing(item: IProcessedItem): Promise<void> {
    console.log('After processing hook');
    // Custom logic here
  }
  
  /**
   * Custom hook before handling
   */
  protected async beforeHandling(item: IProcessedItem): Promise<void> {
    console.log('Before handling hook');
    // Custom logic here
  }
  
  /**
   * Custom hook after handling
   */
  protected async afterHandling(item: IProcessedItem): Promise<void> {
    console.log('After handling hook');
    // Custom logic here
  }
  
  /**
   * Custom error handling
   */
  protected async handleError(error: any, item: IInputItem): Promise<void> {
    console.log('Custom error handling');
    // Custom error handling logic
  }
}
```

## Advanced Extension Scenarios

### 1. Natural Language Processing Integration

Enhance text processing with NLP libraries:

```typescript
export class NlpEnhancedTextProcessor extends BaseInputProcessor {
  private nlpService: NlpService;
  
  constructor(nlpService: NlpService) {
    super();
    this.nlpService = nlpService;
  }
  
  public canProcess(input: IInputItem): boolean {
    return input instanceof TextInputItem;
  }
  
  public process(input: IInputItem): IProcessedItem {
    const textInput = input as TextInputItem;
    
    // Use NLP service to analyze text
    const nlpResult = this.nlpService.analyze(textInput.text);
    
    // Determine nature based on NLP analysis
    const nature = this.determineNatureFromNlp(nlpResult);
    
    // Determine destination based on nature
    const destination = this.determineDestinationFromNature(nature);
    
    // Extract data based on NLP entities
    const extractedData = this.extractDataFromNlp(nlpResult);
    
    return new BaseProcessedItem(
      input,
      nature,
      destination,
      extractedData
    );
  }
  
  private determineNatureFromNlp(nlpResult: any): ItemNature {
    // Implementation depends on NLP service
    // ...
  }
  
  private determineDestinationFromNature(nature: ItemNature): DestinationType {
    // Implementation depends on nature
    // ...
  }
  
  private extractDataFromNlp(nlpResult: any): Record<string, any> {
    // Implementation depends on NLP service
    // ...
  }
}
```

### 2. Direct API Integration

Create handlers that directly integrate with external APIs:

```typescript
export class DirectTodoistHandler extends BaseDestinationHandler {
  private todoistClient: TodoistClient;
  
  constructor(todoistClient: TodoistClient) {
    super(DestinationType.TODOIST);
    this.todoistClient = todoistClient;
  }
  
  public async handle(processedItem: IProcessedItem): Promise<void> {
    // Extract task details
    const title = processedItem.extractedData.title || 'Untitled Task';
    const description = processedItem.extractedData.description || '';
    const dueDate = processedItem.extractedData.dueDate;
    const priority = processedItem.extractedData.priority || 4;
    
    // Create task in Todoist
    await this.todoistClient.createTask({
      content: title,
      description,
      due_date: dueDate instanceof Date ? dueDate.toISOString().split('T')[0] : dueDate,
      priority
    });
    
    console.log('Task created in Todoist:', title);
  }
}
```

### 3. Machine Learning Classification

Implement a processor that uses machine learning for classification:

```typescript
export class MlClassificationProcessor extends BaseInputProcessor {
  private mlModel: ClassificationModel;
  
  constructor(mlModel: ClassificationModel) {
    super();
    this.mlModel = mlModel;
  }
  
  public canProcess(input: IInputItem): boolean {
    // This processor can handle any input type
    return true;
  }
  
  public process(input: IInputItem): IProcessedItem {
    // Extract features from input
    const features = this.extractFeatures(input);
    
    // Use ML model to predict nature and destination
    const prediction = this.mlModel.predict(features);
    
    // Extract data based on prediction
    const extractedData = this.extractDataBasedOnPrediction(input, prediction);
    
    return new BaseProcessedItem(
      input,
      prediction.nature,
      prediction.destination,
      extractedData
    );
  }
  
  private extractFeatures(input: IInputItem): any[] {
    // Implementation depends on input type and ML model
    // ...
  }
  
  private extractDataBasedOnPrediction(input: IInputItem, prediction: any): Record<string, any> {
    // Implementation depends on prediction
    // ...
  }
}
```

## Best Practices for Extensions

1. **Follow the Open/Closed Principle**: Extend functionality through new classes rather than modifying existing ones.

2. **Maintain Interface Contracts**: Ensure all extensions properly implement the required interfaces.

3. **Use Dependency Injection**: Pass dependencies to constructors rather than creating them internally.

4. **Add Unit Tests**: Create tests for new extensions to ensure they work correctly.

5. **Document Extensions**: Add clear documentation for any new extensions.

6. **Register Extensions Properly**: Add processors to the InputProcessingService and handlers to the OutputHandlingService.

7. **Consider Performance**: Be mindful of the performance impact of extensions, especially those involving external services.

8. **Handle Errors Gracefully**: Implement proper error handling in extensions.

## Conclusion

The Input Processing System is designed with extensibility in mind, following SOLID principles. By leveraging these extension points, you can customize and enhance the system to meet your specific needs without modifying the core codebase.

Whether you're adding new input sources, creating specialized processors, integrating with external APIs, or implementing advanced features like NLP and machine learning, the system's architecture provides clear extension points to support your requirements.
