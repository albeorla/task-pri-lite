/**
 * Task Store for Task Priority Lite
 * 
 * A simple in-memory storage for processed tasks with persistence.
 */

import { IProcessedItem } from '../core/interfaces';
import fs from 'fs';
import path from 'path';

/**
 * Interface for TaskItem with essential properties
 */
export interface TaskItem {
  id: string;
  title: string;
  description: string;
  dueDate: Date | null;
  priority: number;  // 0=highest, 3=lowest
  project?: string;
  section?: string;
  parentTask?: string;
  labels?: string[];
  completed: boolean;
}

/**
 * Simple task store with persistence capabilities
 */
class TaskStore {
  private tasks: TaskItem[] = [];
  private storageFile: string;
  
  constructor(storageFilePath: string = 'output/tasks.json') {
    this.storageFile = path.resolve(process.cwd(), storageFilePath);
    this.loadFromFile();
  }
  
  /**
   * Add a task to the store
   */
  public addTask(task: TaskItem): void {
    // Check if task with this ID already exists
    const existingIndex = this.tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      // Update existing task
      this.tasks[existingIndex] = task;
    } else {
      // Add new task
      this.tasks.push(task);
    }
    this.saveToFile();
  }
  
  /**
   * Add a task from a processed item
   */
  public addFromProcessedItem(processedItem: IProcessedItem): TaskItem {
    // Extract data and create a TaskItem
    const { originalInput, extractedData } = processedItem;
    
    // Generate a unique ID
    const id = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create a new task
    const task: TaskItem = {
      id,
      title: extractedData.title || 'Untitled Task',
      description: extractedData.description || '',
      dueDate: extractedData.dueDate || null,
      priority: extractedData.priority !== undefined ? extractedData.priority : 2,
      project: extractedData.project,
      section: extractedData.section,
      parentTask: extractedData.parentTask,
      labels: extractedData.labels,
      completed: false
    };
    
    this.addTask(task);
    return task;
  }
  
  /**
   * Get all tasks
   */
  public getAllTasks(): TaskItem[] {
    return [...this.tasks]; // Return a copy to prevent unintended modifications
  }
  
  /**
   * Get a task by ID
   */
  public getTaskById(id: string): TaskItem | undefined {
    return this.tasks.find(task => task.id === id);
  }
  
  /**
   * Update a task
   */
  public updateTask(updatedTask: TaskItem): void {
    const index = this.tasks.findIndex(task => task.id === updatedTask.id);
    if (index >= 0) {
      this.tasks[index] = updatedTask;
      this.saveToFile();
    }
  }
  
  /**
   * Mark a task as completed
   */
  public completeTask(id: string): void {
    const task = this.getTaskById(id);
    if (task) {
      task.completed = true;
      this.saveToFile();
    }
  }
  
  /**
   * Clear all tasks
   */
  public clear(): void {
    this.tasks = [];
    this.saveToFile();
  }
  
  /**
   * Save tasks to file
   */
  private saveToFile(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Convert dates to ISO strings for JSON serialization
      const tasksToSave = this.tasks.map(task => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null
      }));
      
      fs.writeFileSync(this.storageFile, JSON.stringify(tasksToSave, null, 2));
    } catch (error) {
      console.error('Failed to save tasks to file:', error);
    }
  }
  
  /**
   * Load tasks from file
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const loadedTasks = JSON.parse(data);
        
        // Convert ISO strings back to Date objects
        this.tasks = loadedTasks.map((task: any) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : null
        }));
      }
    } catch (error) {
      console.error('Failed to load tasks from file:', error);
      this.tasks = []; // Reset to empty if loading fails
    }
  }
}

// Export a singleton instance
export const taskStore = new TaskStore(); 