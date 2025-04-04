# Manual Implementation Guidelines

## Overview

This document provides guidelines for manually implementing and using the Input Processing System. Since the MVP includes some components that require manual intervention, this guide will help users understand how to interact with the system effectively.

## System Components

The Input Processing System consists of the following components:

1. **Input Items**: Objects that encapsulate raw input data
2. **Input Processors**: Components that analyze and categorize input items
3. **Processed Items**: Objects that contain the results of processing
4. **Destination Handlers**: Components that format and handle processed items
5. **Orchestration Services**: Services that coordinate the entire process

## Manual Implementation Workflow

### 1. Capturing Input

#### Manual Task Entry
For direct task entry:

```typescript
// Create a new ManualTaskInputItem
const taskItem = new ManualTaskInputItem(
  "Complete project proposal",
  "Draft the initial proposal for the client meeting",
  new Date("2025-04-15"),
  2 // Medium priority
);

// Pass to orchestrator
await orchestrator.processAndHandle(taskItem);
```

#### Text Input Processing
For processing text from various sources:

```typescript
// Create a new TextInputItem
const textItem = new TextInputItem(
  "Meeting with marketing team tomorrow at 2:30 PM to discuss Q2 campaign. Location: Conference Room A.",
  "Marketing Meeting",
  InputSource.MEETING_NOTES
);

// Pass to orchestrator
await orchestrator.processAndHandle(textItem);
```

### 2. Understanding Processing Results

The system will automatically:

1. Analyze the input using appropriate processors
2. Determine the nature of the input (task, event, reference, etc.)
3. Select the appropriate destination (Todoist, Calendar, Markdown, etc.)
4. Format the output for the destination

### 3. Manual Actions Required

Depending on the destination, you may need to take manual actions:

#### For Todoist Tasks

When the system identifies a task for Todoist, it will display formatted output like:

```
## Task for Todoist

### Title
Complete project proposal

### Description
Draft the initial proposal for the client meeting

### Due Date
2025-04-15

### Priority
Medium

---
Please add this task to Todoist manually.
```

**Manual Action Required**: Copy the task details and add them to Todoist manually.

#### For Markdown References

When the system identifies reference information, it will display formatted output like:

```
# Marketing Strategy Resources

## Content
Collection of useful marketing strategy articles and resources.

### URLs
- [https://example.com/marketing-strategy-guide](https://example.com/marketing-strategy-guide)
- [https://example.com/social-media-best-practices](https://example.com/social-media-best-practices)

### Tags
#marketing #strategy #resources

---
Please save this reference information to your Markdown notes.
```

**Manual Action Required**: Copy the formatted Markdown and save it to your notes system.

#### For Calendar Events

When the system identifies a potential calendar event, it will display formatted output like:

```
## Event for Calendar

### Title
Marketing Team Meeting

### Description
Discuss Q2 campaign

### Start Time
4/2/2025, 2:30:00 PM

### End Time
4/2/2025, 3:30:00 PM

### Location
Conference Room A

### Attendees
None

---
Would you like to add this event to your calendar?
```

**Semi-Automated Action**: Confirm if you want to add the event to your calendar. If confirmed, the system will use the AI calendar tool to create the event.

#### For Review Later Items

When the system cannot clearly classify an item, it will display:

```
## Item for Review

### Title
Untitled Item

### Content
Content that couldn't be clearly classified...

---
This item couldn't be automatically classified. Please review it manually.
```

**Manual Action Required**: Review the content and decide what to do with it.

### 4. Customizing the System

You can customize the system by:

1. Adding new processors for specific input types
2. Adding new handlers for different destinations
3. Modifying the orchestration services to change the processing flow

Example of adding a custom processor:

```typescript
class EmailTaskProcessor extends BaseInputProcessor {
  public canProcess(input: IInputItem): boolean {
    return input.source === InputSource.EMAIL;
  }
  
  public process(input: IInputItem): IProcessedItem {
    // Custom email processing logic
    // ...
  }
}

// Add to the processing service
inputProcessingService.addProcessor(new EmailTaskProcessor());
```

## Best Practices

1. **Be Consistent with Input Format**: When manually entering text for processing, try to be consistent with formatting to help the processors identify relevant information.

2. **Use Clear Indicators**: Include clear indicators in your text like "Task:", "Event:", "Due:", "Location:", etc. to help the system classify correctly.

3. **Review Processing Results**: Always review the system's output before taking manual actions to ensure accuracy.

4. **Provide Feedback**: If the system consistently misclassifies certain types of input, consider creating a custom processor for that specific case.

5. **Start Simple**: Begin with simple, well-structured inputs to get familiar with the system before processing more complex content.

## Troubleshooting

### Common Issues

1. **Misclassified Input**: If an input is misclassified, check if it contains clear indicators for the intended classification.

2. **Missing Information**: If the system doesn't extract all relevant information, try reformatting your input to make the information more explicit.

3. **Processing Errors**: If you encounter processing errors, check the console output for error messages.

### Getting Help

For additional help or to report issues, please contact the system administrator or refer to the technical documentation.

## Future Enhancements

The manual steps in this MVP will be gradually automated in future versions:

1. **Direct Todoist Integration**: Automatic task creation in Todoist
2. **Enhanced NLP**: Better extraction of information from unstructured text
3. **Email Integration**: Direct processing of email content
4. **User Preference Learning**: Learning from user corrections and preferences

Stay tuned for updates!
