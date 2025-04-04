import { createGTDEisenhowerSystem, Task, TaskStatus, EisenhowerQuadrant } from '../gtd-eisen';

/**
 * This file demonstrates how to integrate the GTD-Eisenhower module
 * with an existing application. It shows common integration patterns
 * and how to map between your application's data models and the
 * GTD-Eisenhower module's models.
 */

// Example interfaces from your existing application
interface AppTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  tags: string[];
}

interface AppProject {
  id: string;
  name: string;
  description?: string;
  tasks: string[]; // Task IDs
  status: 'active' | 'completed' | 'on-hold';
}

// Mock data service for the application
class AppDataService {
  private tasks: Map<string, AppTask> = new Map();
  private projects: Map<string, AppProject> = new Map();

  constructor() {
    // Initialize with some sample data
    this.addTask({
      id: 'task1',
      title: 'Complete project proposal',
      completed: false,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'Work',
      priority: 'high',
      tags: ['proposal', 'deadline']
    });

    this.addTask({
      id: 'task2',
      title: 'Buy groceries',
      completed: false,
      category: 'Personal',
      priority: 'medium',
      tags: ['errands']
    });

    this.addProject({
      id: 'project1',
      name: 'Website Redesign',
      description: 'Update company website with new branding',
      tasks: [],
      status: 'active'
    });
  }

  addTask(task: AppTask): void {
    this.tasks.set(task.id, task);
  }

  addProject(project: AppProject): void {
    this.projects.set(project.id, project);
  }

  getAllTasks(): AppTask[] {
    return Array.from(this.tasks.values());
  }

  getAllProjects(): AppProject[] {
    return Array.from(this.projects.values());
  }

  getTask(id: string): AppTask | undefined {
    return this.tasks.get(id);
  }

  getProject(id: string): AppProject | undefined {
    return this.projects.get(id);
  }

  updateTask(task: AppTask): void {
    this.tasks.set(task.id, task);
  }

  updateProject(project: AppProject): void {
    this.projects.set(project.id, project);
  }
}

// Mapper class to convert between app models and GTD-Eisenhower models
class ModelMapper {
  // Map from app task to GTD task
  static toGTDTask(appTask: AppTask): Task {
    return new Task({
      id: appTask.id,
      description: appTask.title,
      notes: appTask.description,
      status: appTask.completed ? TaskStatus.DONE : TaskStatus.INBOX,
      dueDate: appTask.dueDate ? new Date(appTask.dueDate) : undefined,
      // Convert app-specific context/tags to GTD context
      context: appTask.tags.includes('errands') 
        ? '@errands' 
        : appTask.tags.includes('calls') 
          ? '@calls' 
          : appTask.category === 'Work' 
            ? '@work' 
            : appTask.category === 'Personal' 
              ? '@home' 
              : undefined
    });
  }

  // Update GTD task with Eisenhower info back to app task
  static updateAppTaskFromGTD(appTask: AppTask, gtdTask: Task): AppTask {
    // Map Eisenhower quadrant to app priority
    let appPriority: 'low' | 'medium' | 'high';
    
    if (gtdTask.eisenhowerQuadrant === EisenhowerQuadrant.DO) {
      appPriority = 'high';
    } else if (gtdTask.eisenhowerQuadrant === EisenhowerQuadrant.DECIDE) {
      appPriority = 'medium';
    } else if (gtdTask.eisenhowerQuadrant === EisenhowerQuadrant.DELEGATE) {
      appPriority = 'medium';
    } else {
      appPriority = 'low';
    }
    
    // Update app task with new priority
    return {
      ...appTask,
      priority: appPriority,
      // Add tag based on GTD status
      tags: [
        ...appTask.tags,
        gtdTask.status === TaskStatus.NEXT_ACTION ? 'next-action' : '',
        gtdTask.status === TaskStatus.PROJECT_TASK ? 'project-task' : '',
        gtdTask.status === TaskStatus.WAITING_FOR ? 'waiting-for' : '',
        gtdTask.status === TaskStatus.SOMEDAY_MAYBE ? 'someday-maybe' : ''
      ].filter(tag => tag !== '')
    };
  }
}

// Integration service that connects the application with GTD-Eisenhower
export class GTDEisenhowerIntegration {
  private appDataService: AppDataService;
  private gtdSystem: any; // Will hold the GTD-Eisenhower system

  constructor(appDataService: AppDataService) {
    this.appDataService = appDataService;
  }

  async initialize(): Promise<void> {
    // Initialize the GTD-Eisenhower system
    this.gtdSystem = await createGTDEisenhowerSystem('./data');
    console.log('GTD-Eisenhower system initialized');
  }

  async processAllTasks(): Promise<void> {
    if (!this.gtdSystem) {
      throw new Error('GTD-Eisenhower system not initialized. Call initialize() first.');
    }

    const { taskManager } = this.gtdSystem;
    
    // Convert app tasks to GTD tasks
    const appTasks = this.appDataService.getAllTasks();
    const gtdTasks = appTasks.map(appTask => ModelMapper.toGTDTask(appTask));
    
    // Load tasks into GTD system
    taskManager.loadTasks(gtdTasks);
    
    // Run the GTD-Eisenhower workflow
    await taskManager.runWorkflow();
    
    // Update app tasks with GTD results
    const processedGTDTasks = taskManager.getAllTasks();
    for (const gtdTask of processedGTDTasks) {
      const appTask = this.appDataService.getTask(gtdTask.id);
      if (appTask) {
        const updatedAppTask = ModelMapper.updateAppTaskFromGTD(appTask, gtdTask);
        this.appDataService.updateTask(updatedAppTask);
      }
    }
    
    console.log('All tasks processed with GTD-Eisenhower workflow');
  }

  async processSingleTask(taskId: string): Promise<void> {
    if (!this.gtdSystem) {
      throw new Error('GTD-Eisenhower system not initialized. Call initialize() first.');
    }

    const appTask = this.appDataService.getTask(taskId);
    if (!appTask) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Convert to GTD task
    const gtdTask = ModelMapper.toGTDTask(appTask);
    
    // Use the GTD processor and prioritizer directly
    const { processor, prioritizer } = this.gtdSystem;
    
    // Process with GTD clarification
    await processor.process(gtdTask, new Map());
    
    // Prioritize with Eisenhower matrix
    await prioritizer.prioritize(gtdTask);
    
    // Update the app task with the results
    const updatedAppTask = ModelMapper.updateAppTaskFromGTD(appTask, gtdTask);
    this.appDataService.updateTask(updatedAppTask);
    
    console.log(`Task ${taskId} processed with GTD-Eisenhower workflow`);
  }
}

// Example usage
async function demonstrateIntegration() {
  const appDataService = new AppDataService();
  const integration = new GTDEisenhowerIntegration(appDataService);
  
  // Initialize the integration
  await integration.initialize();
  
  // Process all tasks
  await integration.processAllTasks();
  
  // Process a single task
  await integration.processSingleTask('task1');
  
  // Display the results
  console.log('Updated tasks:');
  console.log(appDataService.getAllTasks());
}

// Uncomment to run the demonstration
// demonstrateIntegration().catch(console.error); 