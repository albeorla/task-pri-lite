/**
 * Task Service
 *
 * Application service for managing tasks
 */

import { IStorageService } from "../../core/interfaces/storage";
import { Task, TaskStatus } from "../../core/models/task";
import { Project } from "../../core/models/project";

export class TaskService {
  private storageService: IStorageService;

  constructor(storageService: IStorageService) {
    this.storageService = storageService;
  }

  /**
   * Gets all tasks from storage
   */
  async getAllTasks(): Promise<Task[]> {
    // Check if the storage service has specialized task methods
    if (
      "getTasks" in this.storageService &&
      typeof this.storageService.getTasks === "function"
    ) {
      return this.storageService.getTasks();
    }

    // Fall back to standard load
    const tasks = await this.storageService.load<Task[]>("tasks");
    return tasks || [];
  }

  /**
   * Gets all projects from storage
   */
  async getAllProjects(): Promise<Project[]> {
    // Check if the storage service has specialized project methods
    if (
      "getProjects" in this.storageService &&
      typeof this.storageService.getProjects === "function"
    ) {
      return this.storageService.getProjects();
    }

    // Fall back to standard load
    const projects = await this.storageService.load<Project[]>("projects");
    return projects || [];
  }

  /**
   * Gets incomplete tasks
   */
  async getIncompleteTasks(): Promise<Task[]> {
    const tasks = await this.getAllTasks();
    // Filter tasks that aren't done
    return tasks.filter((task) => task.status !== TaskStatus.DONE);
  }

  /**
   * Gets tasks by project
   */
  async getTasksByProject(projectId: string): Promise<Task[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => task.project?.id === projectId);
  }

  /**
   * Gets actionable tasks
   */
  async getActionableTasks(): Promise<Task[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => task.isActionable === true);
  }

  /**
   * Gets next actions
   */
  async getNextActions(): Promise<Task[]> {
    const tasks = await this.getAllTasks();
    // Filter tasks that aren't done
    const incompleteTasks = tasks.filter(
      (task) => task.status !== TaskStatus.DONE,
    );

    // Group by project
    const projectMap = new Map<string, Task[]>();

    for (const task of incompleteTasks) {
      if (task.project) {
        const projectId = task.project.id;
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, []);
        }
        projectMap.get(projectId)!.push(task);
      }
    }

    // Get next action for each project
    const nextActions: Task[] = [];

    for (const [projectId, projectTasks] of projectMap.entries()) {
      // Sort tasks by priority
      const sortedTasks = [...projectTasks].sort((a, b) => {
        // Sort by Eisenhower quadrant
        const quadrantOrder = {
          "urgent-important": 0,
          "urgent-not-important": 1,
          "not-urgent-important": 2,
          "not-urgent-not-important": 3,
        };

        // @ts-ignore
        const aOrder = quadrantOrder[a.eisenhowerQuadrant] || 999;
        // @ts-ignore
        const bOrder = quadrantOrder[b.eisenhowerQuadrant] || 999;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        // If same quadrant, sort by due date (if available)
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        } else if (a.dueDate) {
          return -1;
        } else if (b.dueDate) {
          return 1;
        }

        return 0;
      });

      if (sortedTasks.length > 0) {
        nextActions.push(sortedTasks[0]);
      }
    }

    return nextActions;
  }
}
