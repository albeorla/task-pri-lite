/**
 * Todoist File Loader
 * 
 * Reads Todoist export JSON files and validates them against the schema
 */

import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../../core/models/task';
import { Project } from '../../core/models/project';
import { validateFile } from './schema-validator';

// Define default file paths
const DEFAULT_EXPORT_PATH = path.resolve(process.cwd(), 'output/todoist_export.json');

interface TodoistExportData {
  metadata: {
    export_date: string;
    counts: {
      projects: number;
      sections: number;
      tasks: number;
      sub_tasks: number;
      comments: number;
      labels: number;
    };
    statistics: {
      completed_tasks: number;
      incomplete_tasks: number;
      completion_rate: number;
      tasks_with_due_dates: number;
      tasks_with_labels: number;
      tasks_with_comments: number;
      average_labels_per_task: number;
      average_comments_per_task: number;
    };
  };
  projects: TodoistProject[];
  labels: TodoistLabel[];
}

interface TodoistProject {
  id: string;
  name: string;
  parent_id: string | null;
  order: number;
  color: string;
  comment_count: number;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  url: string;
  view_style: string;
  description: string;
  tasks: TodoistTask[];
  sections: TodoistSection[];
  child_projects: TodoistProject[];
}

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  order: number;
  priority: number;
  is_completed: boolean;
  labels: string[];
  comment_count: number;
  created_at: string;
  due: {
    date: string;
    is_recurring: boolean;
    datetime: string | null;
    string: string;
    timezone: string | null;
  } | null;
  url: string;
  sub_tasks: TodoistTask[];
}

interface TodoistSection {
  id: string;
  project_id: string;
  order: number;
  name: string;
  tasks: TodoistTask[];
}

interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

/**
 * TodoistLoader class
 * 
 * Responsible for loading Todoist export data from JSON files and mapping
 * them to the application's core domain models
 */
export class TodoistLoader {
  private filePath: string;
  
  /**
   * Creates a new TodoistLoader
   * 
   * @param filePath - Path to the Todoist export JSON file
   */
  constructor(filePath: string = DEFAULT_EXPORT_PATH) {
    this.filePath = filePath;
  }
  
  /**
   * Load and validate the Todoist export data
   * 
   * @returns The validated Todoist export data
   * @throws Error if the file doesn't exist, contains invalid JSON, or fails schema validation
   */
  public async loadRawData(): Promise<TodoistExportData> {
    // Validate the file against the schema
    const validation = validateFile(this.filePath, 'todoist_denormalized_schema');
    
    if (!validation.valid) {
      throw new Error(`Todoist export validation failed: ${validation.errors.join(', ')}`);
    }
    
    // If valid, load and parse the file
    try {
      const rawData = await fs.promises.readFile(this.filePath, 'utf8');
      return JSON.parse(rawData) as TodoistExportData;
    } catch (err) {
      throw new Error(`Error loading Todoist export data: ${(err as Error).message}`);
    }
  }
  
  /**
   * Maps Todoist tasks to the application's core Task model
   * 
   * @param todoistTasks - Array of Todoist tasks to convert
   * @returns Array of converted Tasks
   */
  private mapTasks(todoistTasks: TodoistTask[], projects: Map<string, Project>): Task[] {
    const tasks: Task[] = [];
    const taskMap = new Map<string, Task>();
    
    // First pass: Create all tasks
    for (const todoistTask of todoistTasks) {
      const task = new Task({
        id: todoistTask.id,
        description: todoistTask.content,
        notes: todoistTask.description || '',
        status: todoistTask.is_completed ? 'completed' : 'active',
        context: '', // Todoist doesn't have direct context mapping
        dueDate: todoistTask.due ? new Date(todoistTask.due.datetime || todoistTask.due.date) : undefined,
        // Map Todoist priority (4=highest, 1=lowest) to Eisenhower quadrant (roughly)
        eisenhowerQuadrant: todoistTask.priority >= 3 ? 'urgent-important' : 
                            todoistTask.priority === 2 ? 'not-urgent-important' : 
                            todoistTask.priority === 1 ? 'urgent-not-important' : 'not-urgent-not-important',
        isActionable: true, // Assume all Todoist tasks are actionable
        creationDate: new Date(todoistTask.created_at),
      });
      
      // Find and associate project
      if (todoistTask.project_id && projects.has(todoistTask.project_id)) {
        task.project = projects.get(todoistTask.project_id)!;
      }
      
      taskMap.set(task.id, task);
      tasks.push(task);
    }
    
    // Second pass: Set up parent-child relationships for subtasks
    for (const todoistTask of todoistTasks) {
      if (todoistTask.parent_id && taskMap.has(todoistTask.parent_id) && taskMap.has(todoistTask.id)) {
        const childTask = taskMap.get(todoistTask.id)!;
        const parentTask = taskMap.get(todoistTask.parent_id)!;
        
        // We could implement a parent-child relationship here if our core Task model supported it
        // For now, we're just associating both with the same project
        if (parentTask.project) {
          childTask.project = parentTask.project;
        }
      }
    }
    
    return tasks;
  }
  
  /**
   * Maps Todoist projects to the application's core Project model
   * 
   * @param todoistProjects - Array of Todoist projects to convert
   * @returns Array of converted Projects
   */
  private mapProjects(todoistProjects: TodoistProject[]): Project[] {
    const projects: Project[] = [];
    const projectMap = new Map<string, Project>();
    
    // First pass: Create all projects
    for (const todoistProject of todoistProjects) {
      const project = new Project({
        id: todoistProject.id,
        name: todoistProject.name,
        outcome: todoistProject.description || '',
        status: 'active', // Todoist doesn't have project status
        creationDate: new Date(), // Todoist doesn't expose project creation date
      });
      
      projectMap.set(project.id, project);
      projects.push(project);
    }
    
    // Second pass: Set up parent-child relationships
    for (const todoistProject of todoistProjects) {
      if (todoistProject.parent_id && projectMap.has(todoistProject.parent_id) && projectMap.has(todoistProject.id)) {
        // We could implement a parent-child relationship here if our core Project model supported it
        // For now, we're just creating separate projects
      }
    }
    
    return projects;
  }
  
  /**
   * Loads Todoist export data and converts it to the application's core models
   * 
   * @returns Object containing tasks and projects
   */
  public async load(): Promise<{ tasks: Task[], projects: Project[] }> {
    const todoistData = await this.loadRawData();
    
    // First map projects so we can associate tasks with them
    const projects = this.mapProjects(todoistData.projects);
    const projectMap = new Map<string, Project>();
    projects.forEach(project => projectMap.set(project.id, project));
    
    // Collect all tasks from projects, sections, and subtasks
    const allTodoistTasks: TodoistTask[] = [];
    
    // Helper function to recursively collect tasks
    const collectTasks = (tasks: TodoistTask[]) => {
      for (const task of tasks) {
        allTodoistTasks.push(task);
        if (task.sub_tasks && task.sub_tasks.length > 0) {
          collectTasks(task.sub_tasks);
        }
      }
    };
    
    // Collect tasks from all projects and sections
    for (const project of todoistData.projects) {
      collectTasks(project.tasks);
      
      for (const section of project.sections) {
        collectTasks(section.tasks);
      }
    }
    
    // Map all collected tasks
    const tasks = this.mapTasks(allTodoistTasks, projectMap);
    
    // Associate tasks with projects
    for (const task of tasks) {
      if (task.project) {
        task.project.addTask(task);
      }
    }
    
    return { tasks, projects };
  }
} 