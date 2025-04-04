/**
 * Task Priority Lite - Main Entry Point
 * 
 * This file serves as the main entry point for the Task Priority Lite application.
 * It provides a command-line interface for interacting with the system and
 * demonstrates the complete processing path from input to output.
 */

import {
  example1_manualTask,
  example2_textWithTaskInfo,
  example3_textWithEventInfo,
  example4_textWithReferenceInfo,
  example5_meetingNotes,
  example6_unclearText,
  runAllExamples
} from './examples/implementation-examples';

import { InputSource } from './core/interfaces';
import { ManualTaskInputItem, TextInputItem } from './inputs/basic-input-items';
import { InputProcessingOrchestrator } from './services/orchestration-services-impl';

/**
 * Displays the help message
 */
function displayHelp(): void {
  console.log(`
Task Priority Lite - Command Line Interface

Usage: npm start -- [command] [options]

Commands:
  example <number>   Run a specific example (1-6)
  examples           Run all examples
  manual             Create and process a manual task
  text               Process text input
  help               Display this help message

Examples:
  npm start -- example 1     Run example 1 (manual task)
  npm start -- examples      Run all examples
  npm start -- manual        Create and process a manual task
  npm start -- text          Process text input
  npm start -- help          Display this help message
  `);
}

/**
 * Processes a manual task input from command line arguments
 */
async function processManualTask(): Promise<void> {
  console.log('Creating a manual task...');
  
  // In a real CLI, we would prompt for these values
  // For now, we'll use hardcoded values for demonstration
  const title = "Command line task";
  const description = "This task was created from the command line";
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
  const priority = 3;
  
  console.log(`Task details:
  Title: ${title}
  Description: ${description}
  Due Date: ${dueDate.toISOString().split('T')[0]}
  Priority: ${priority}
  `);
  
  // Create the task item
  const taskItem = new ManualTaskInputItem(
    title,
    description,
    dueDate,
    priority
  );
  
  // Process the task
  const orchestrator = new InputProcessingOrchestrator();
  try {
    await orchestrator.processAndHandle(taskItem);
    console.log('Manual task processed successfully');
  } catch (error) {
    console.error('Error processing manual task:', error);
  }
}

/**
 * Processes text input from command line arguments
 */
async function processTextInput(): Promise<void> {
  console.log('Processing text input...');
  
  // In a real CLI, we would prompt for these values
  // For now, we'll use hardcoded values for demonstration
  const text = "Review the documentation by Friday and provide feedback";
  const title = "Documentation Review";
  const source = InputSource.MANUAL_ENTRY;
  
  console.log(`Text details:
  Text: ${text}
  Title: ${title}
  Source: ${source}
  `);
  
  // Create the text item
  const textItem = new TextInputItem(
    text,
    title,
    source
  );
  
  // Process the text
  const orchestrator = new InputProcessingOrchestrator();
  try {
    await orchestrator.processAndHandle(textItem);
    console.log('Text input processed successfully');
  } catch (error) {
    console.error('Error processing text input:', error);
  }
}

/**
 * Runs a specific example by number
 * @param exampleNumber The example number to run (1-6)
 */
async function runExample(exampleNumber: number): Promise<void> {
  switch (exampleNumber) {
    case 1:
      await example1_manualTask();
      break;
    case 2:
      await example2_textWithTaskInfo();
      break;
    case 3:
      await example3_textWithEventInfo();
      break;
    case 4:
      await example4_textWithReferenceInfo();
      break;
    case 5:
      await example5_meetingNotes();
      break;
    case 6:
      await example6_unclearText();
      break;
    default:
      console.error(`Invalid example number: ${exampleNumber}`);
      displayHelp();
      break;
  }
}

/**
 * Main function that parses command line arguments and executes the appropriate action
 */
async function main(): Promise<void> {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  // If no arguments, display help
  if (args.length === 0) {
    displayHelp();
    return;
  }
  
  // Parse command
  const command = args[0].toLowerCase();
  
  // Execute command
  switch (command) {
    case 'example':
      if (args.length < 2) {
        console.error('Missing example number');
        displayHelp();
        return;
      }
      const exampleNumber = parseInt(args[1], 10);
      await runExample(exampleNumber);
      break;
    
    case 'examples':
      await runAllExamples();
      break;
    
    case 'manual':
      await processManualTask();
      break;
    
    case 'text':
      await processTextInput();
      break;
    
    case 'help':
      displayHelp();
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      displayHelp();
      break;
  }
}

// Execute the main function
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});
