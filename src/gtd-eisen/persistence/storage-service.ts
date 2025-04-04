import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../models/task';
import { Project } from '../models/project';

export interface StorageService {
  saveTasks(tasks: Task[]): Promise<void>;
  saveProjects(projects: Project[]): Promise<void>;
  loadTasks(): Promise<Task[]>;
  loadProjects(): Promise<Project[]>;
  saveAll(tasks: Task[], projects: Project[]): Promise<void>;
  loadAll(): Promise<{ tasks: Task[], projects: Project[] }>;
}

export class FileStorageService implements StorageService {
  private tasksFilePath: string;
  private projectsFilePath: string;

  constructor(storageDir: string = './data') {
    // Ensure the storage directory exists
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    this.tasksFilePath = path.join(storageDir, 'tasks.json');
    this.projectsFilePath = path.join(storageDir, 'projects.json');
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    const serializedTasks = tasks.map(task => task.toJSON());
    await fs.promises.writeFile(
      this.tasksFilePath, 
      JSON.stringify(serializedTasks, null, 2)
    );
    console.log(`Saved ${tasks.length} tasks to ${this.tasksFilePath}`);
  }

  async saveProjects(projects: Project[]): Promise<void> {
    const serializedProjects = projects.map(project => project.toJSON());
    await fs.promises.writeFile(
      this.projectsFilePath, 
      JSON.stringify(serializedProjects, null, 2)
    );
    console.log(`Saved ${projects.length} projects to ${this.projectsFilePath}`);
  }

  async loadTasks(): Promise<Task[]> {
    try {
      if (!fs.existsSync(this.tasksFilePath)) {
        console.log(`No tasks file found at ${this.tasksFilePath}`);
        return [];
      }

      const rawData = await fs.promises.readFile(this.tasksFilePath, 'utf8');
      const parsedData = JSON.parse(rawData) as any[];
      
      // Temporarily return partially hydrated tasks 
      // (project links will be added later in loadAll)
      return parsedData.map(data => new Task({
        id: data.id,
        description: data.description,
        notes: data.notes,
        status: data.status,
        context: data.context,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        eisenhowerQuadrant: data.eisenhowerQuadrant,
        isActionable: data.isActionable,
        creationDate: new Date(data.creationDate),
      }));
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  async loadProjects(): Promise<Project[]> {
    try {
      if (!fs.existsSync(this.projectsFilePath)) {
        console.log(`No projects file found at ${this.projectsFilePath}`);
        return [];
      }

      const rawData = await fs.promises.readFile(this.projectsFilePath, 'utf8');
      const parsedData = JSON.parse(rawData) as any[];
      
      // Temporarily return partially hydrated projects 
      // (task links will be added later in loadAll)
      return parsedData.map(data => new Project({
        id: data.id,
        name: data.name,
        outcome: data.outcome,
        status: data.status,
        creationDate: new Date(data.creationDate),
      }));
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  async saveAll(tasks: Task[], projects: Project[]): Promise<void> {
    await Promise.all([
      this.saveTasks(tasks),
      this.saveProjects(projects)
    ]);
  }

  async loadAll(): Promise<{ tasks: Task[], projects: Project[] }> {
    // First load basic task and project objects
    const [rawTasks, rawProjects] = await Promise.all([
      this.loadTasks(),
      this.loadProjects()
    ]);

    // Create maps for faster lookups
    const tasksMap = new Map<string, Task>();
    rawTasks.forEach(task => tasksMap.set(task.id, task));
    
    const projectsMap = new Map<string, Project>();
    rawProjects.forEach(project => projectsMap.set(project.id, project));

    // Now we need to establish cross-references
    
    // 1. Link tasks to their projects
    const taskData = await this.readRawTasksData();
    for (const data of taskData) {
      if (data.project && projectsMap.has(data.project)) {
        const task = tasksMap.get(data.id);
        const project = projectsMap.get(data.project);
        
        if (task && project) {
          task.project = project;
          
          // Also add task to project's tasks array if not already there
          if (!project.tasks.includes(task)) {
            project.tasks.push(task);
          }
        }
      }
      
      // Link nextActionFor relationships
      if (Array.isArray(data.nextActionFor)) {
        const task = tasksMap.get(data.id);
        if (task) {
          task.nextActionFor = data.nextActionFor
            .map((projId: string) => projectsMap.get(projId))
            .filter((p: Project | undefined): p is Project => p !== undefined);
        }
      }
    }

    // 2. Link projects to their tasks from projects data
    const projectData = await this.readRawProjectsData();
    for (const data of projectData) {
      if (Array.isArray(data.tasks)) {
        const project = projectsMap.get(data.id);
        if (project) {
          // We've already added some tasks in step 1,
          // so we need to make sure we don't add duplicates
          const existingTaskIds = new Set(project.tasks.map(t => t.id));
          
          for (const taskId of data.tasks) {
            if (!existingTaskIds.has(taskId) && tasksMap.has(taskId)) {
              const task = tasksMap.get(taskId)!;
              project.addTask(task);
            }
          }
        }
      }
    }

    return {
      tasks: Array.from(tasksMap.values()),
      projects: Array.from(projectsMap.values())
    };
  }

  // Helper method to read raw JSON data for tasks
  private async readRawTasksData(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.tasksFilePath)) {
        return [];
      }
      const rawData = await fs.promises.readFile(this.tasksFilePath, 'utf8');
      return JSON.parse(rawData) as any[];
    } catch (error) {
      console.error('Error reading raw task data:', error);
      return [];
    }
  }

  // Helper method to read raw JSON data for projects
  private async readRawProjectsData(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.projectsFilePath)) {
        return [];
      }
      const rawData = await fs.promises.readFile(this.projectsFilePath, 'utf8');
      return JSON.parse(rawData) as any[];
    } catch (error) {
      console.error('Error reading raw project data:', error);
      return [];
    }
  }
} 