import { config } from 'dotenv';
import { 
  createGTDEisenhowerSystem,
  Task,
  TaskStatus
} from '../gtd-eisen';

// Load environment variables
config();

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  console.error('Please set it in your .env file or environment variables.');
  process.exit(1);
}

// Example usage of the GTD-Eisenhower system
async function runExample() {
  console.log('Starting GTD-Eisenhower Example...');

  // Initialize the system
  const system = await createGTDEisenhowerSystem('./data');
  const { taskManager, storageService } = system;

  // Create sample tasks
  const sampleTasks = [
    new Task({ 
      description: "Resume Daily Self Care Habits", 
      sourceId: "cal_task_123" 
    }),
    new Task({ 
      description: "Fix Urgent Issues with Pacing Report", 
      sourceId: "cal_task_456", 
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due tomorrow
    }),
    new Task({ 
      description: "Financial Plan Organization", 
      sourceId: "todo_1", 
      notes: "See checklist in description" 
    }),
    new Task({ 
      description: "Clean bathroom", 
      sourceId: "cal_task_789" 
    }),
    new Task({ 
      description: "Call Mavis", 
      sourceId: "todo_2" 
    }),
    new Task({ 
      description: "Idea: Write blog post about productivity", 
      sourceId: "todo_3" 
    }),
    new Task({ 
      description: "Review notes from meeting on April 3rd", 
      sourceId: "ref_1" 
    }),
    new Task({ 
      description: "Book flights for summer vacation", 
      sourceId: "todo_4", 
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Due in a month
    }),
  ];

  // Load the sample tasks
  taskManager.loadTasks(sampleTasks);

  // Run the GTD-Eisenhower workflow
  await taskManager.runWorkflow();

  // Print summaries grouped by different criteria
  taskManager.printSummary('status');
  taskManager.printSummary('priority');
  taskManager.printSummary('project');
  taskManager.printSummary('context');

  // Save the processed tasks and projects
  await storageService.saveAll(
    taskManager.getAllTasks(),
    taskManager.getAllProjects()
  );

  console.log('Example completed and data saved successfully.');
}

// Run the example
runExample().catch(error => {
  console.error('Example failed with error:', error);
}); 