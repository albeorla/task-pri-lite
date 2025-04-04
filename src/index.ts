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
import { TodoistImporter } from './inputs/todoist-import';
import { taskStore } from './storage/task-store';
import { TimeBasedViewGenerator, TimeHorizon } from './outputs/time-based-views';
import fs from 'fs';
import path from 'path';

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
  todoist <file>     Process a Todoist export file
  views <horizon>    Generate time-based views from processed tasks
                     Horizons: today, tomorrow, this-work-week, this-weekend, 
                               next-week, next-month, next-quarter, next-year
  help               Display this help message

Examples:
  npm start -- example 1                Run example 1 (manual task)
  npm start -- examples                 Run all examples
  npm start -- manual                   Create and process a manual task
  npm start -- text                     Process text input
  npm start -- todoist ./export.json    Process Todoist export
  npm start -- views today              Show tasks due today
  npm start -- help                     Display this help message
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
 * Processes a Todoist export file
 * @param filePath Path to the Todoist export file
 */
async function processTodoistExport(filePath: string): Promise<void> {
  console.log(`Processing Todoist export from ${filePath}...`);
  
  try {
    // Resolve the file path
    const resolvedPath = path.resolve(process.cwd(), filePath);
    console.log(`Reading file from: ${resolvedPath}`);
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`File not found: ${resolvedPath}`);
      return;
    }
    
    // Read the file
    const jsonData = fs.readFileSync(resolvedPath, 'utf8');
    
    // Import the data
    const importer = new TodoistImporter(jsonData);
    const taskItems = importer.importAsTaskItems();
    
    // Add tasks to store
    let completedCount = 0;
    let skippedCount = 0;
    
    taskItems.forEach(task => {
      // Skip tasks that are already completed
      if (task.completed) {
        skippedCount++;
        return;
      }
      
      taskStore.addTask(task);
      completedCount++;
    });
    
    console.log(`Successfully processed ${completedCount} tasks from Todoist (${skippedCount} completed tasks skipped)`);
    console.log(`Tasks stored in: ${path.resolve(process.cwd(), 'output/tasks.json')}`);
    
    // Optionally process through the orchestrator
    // const orchestrator = new InputProcessingOrchestrator();
    // const inputItems = importer.importTasks();
    // for (const item of inputItems) {
    //   await orchestrator.processAndHandle(item);
    // }
  } catch (error) {
    console.error('Error processing Todoist export:', error);
  }
}

/**
 * Generates a time-based view of tasks
 * @param horizonArg Time horizon argument from command line
 */
async function generateTimeBasedView(horizonArg: string): Promise<void> {
  // Map command line arguments to TimeHorizon enum
  const horizonMap: Record<string, TimeHorizon> = {
    'today': TimeHorizon.TODAY,
    'tomorrow': TimeHorizon.TOMORROW,
    'this-work-week': TimeHorizon.THIS_WORK_WEEK,
    'this-weekend': TimeHorizon.THIS_WEEKEND,
    'next-week': TimeHorizon.NEXT_WEEK,
    'next-month': TimeHorizon.NEXT_MONTH,
    'next-quarter': TimeHorizon.NEXT_QUARTER,
    'next-year': TimeHorizon.NEXT_YEAR
  };
  
  // Convert input to proper format (lowercase, replace spaces with hyphens)
  const normalizedArg = horizonArg.toLowerCase().replace(/\s+/g, '-');
  const horizon = horizonMap[normalizedArg];
  
  if (!horizon) {
    console.error(`Invalid time horizon: ${horizonArg}`);
    console.log('Valid horizons: today, tomorrow, this-work-week, this-weekend, next-week, next-month, next-quarter, next-year');
    return;
  }
  
  console.log(`Generating ${horizon} view...`);
  
  // Get stored tasks
  const tasks = taskStore.getAllTasks();
  
  if (tasks.length === 0) {
    console.log('No tasks found. Import tasks using the todoist command first.');
    return;
  }
  
  // Generate the view
  const viewGenerator = new TimeBasedViewGenerator(tasks);
  const tasksInView = viewGenerator.generateView(horizon);
  
  // Display the tasks
  console.log(`\n${horizon} (${tasksInView.length} tasks):`);
  console.log('----------------------------------------------');
  
  if (tasksInView.length === 0) {
    console.log('No tasks due in this time horizon.');
  } else {
    tasksInView.forEach((task, index) => {
      const dueString = task.dueDate ? `Due: ${task.dueDate.toDateString()}` : 'No due date';
      const projectString = task.project ? `Project: ${task.project}` : '';
      const priorityLabels = ['Highest', 'High', 'Medium', 'Low'];
      
      console.log(`${index + 1}. [${priorityLabels[task.priority]}] ${task.title} - ${dueString} ${projectString}`);
      
      if (task.description) {
        console.log(`   ${task.description.slice(0, 100)}${task.description.length > 100 ? '...' : ''}`);
      }
      
      if (task.parentTask) {
        console.log(`   Parent Task: ${task.parentTask}`);
      }
      
      if (task.section) {
        console.log(`   Section: ${task.section}`);
      }
      
      if (task.labels && task.labels.length > 0) {
        console.log(`   Labels: ${task.labels.join(', ')}`);
      }
      
      console.log(''); // Empty line for better readability
    });
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
    
    case 'todoist':
      if (args.length < 2) {
        console.error('Missing file path');
        displayHelp();
        return;
      }
      const filePath = args[1];
      await processTodoistExport(filePath);
      break;
    
    case 'views':
      if (args.length < 2) {
        console.error('Missing time horizon');
        displayHelp();
        return;
      }
      const horizon = args[1];
      await generateTimeBasedView(horizon);
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
