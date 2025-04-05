/**
 * External Data Source Service
 *
 * Provides access to external data sources like Todoist and Google Calendar
 */

import * as path from "path";
import { IStorageService } from "../../core/interfaces/storage";
import { Task } from "../../core/models/task";
import { Project } from "../../core/models/project";
import { TodoistLoader, GoogleCalendarLoader } from "./index";

export interface ExternalDataSourceOptions {
  todoistFilePath?: string;
  calendarEventsFilePath?: string;
  calendarTasksFilePath?: string;
  outputDir?: string;
}

export interface ExternalDataSourceResult {
  tasks: Task[];
  projects: Project[];
}

/**
 * Service for accessing data from external sources like Todoist and Google Calendar
 */
export class ExternalDataSourceService implements IStorageService {
  private todoistLoader: TodoistLoader;
  private calendarLoader: GoogleCalendarLoader;
  private outputDir: string;
  private cachedData: Record<string, any> = {};

  constructor(options: ExternalDataSourceOptions = {}) {
    this.outputDir = options.outputDir || "./output";
    const todoistFilePath =
      options.todoistFilePath ||
      path.resolve(this.outputDir, "todoist_export.json");
    const calendarEventsFilePath =
      options.calendarEventsFilePath ||
      path.resolve(this.outputDir, "calendar_events.json");
    const calendarTasksFilePath =
      options.calendarTasksFilePath ||
      path.resolve(this.outputDir, "calendar_tasks.json");

    this.todoistLoader = new TodoistLoader(todoistFilePath);
    this.calendarLoader = new GoogleCalendarLoader(
      calendarEventsFilePath,
      calendarTasksFilePath,
    );
  }

  /**
   * Loads all data from external sources
   */
  async loadFromExternalSources(): Promise<ExternalDataSourceResult> {
    try {
      console.log("Loading data from external sources...");

      // Load Todoist and Calendar data in parallel
      const [todoistData, calendarData] = await Promise.all([
        this.todoistLoader.load(),
        this.calendarLoader.load(),
      ]);

      // Combine data
      const allTasks = [...todoistData.tasks, ...calendarData.tasks];
      const allProjects = [...todoistData.projects]; // Calendar data doesn't have projects

      console.log(
        `Loaded ${allTasks.length} tasks and ${allProjects.length} projects from external sources`,
      );

      // Cache the results
      this.cachedData["tasks"] = allTasks;
      this.cachedData["projects"] = allProjects;
      this.cachedData["combined"] = { tasks: allTasks, projects: allProjects };

      return {
        tasks: allTasks,
        projects: allProjects,
      };
    } catch (error) {
      console.error("Error loading data from external sources:", error);
      throw error;
    }
  }

  // IStorageService implementation

  /**
   * Save data to storage (not implemented for read-only external sources)
   */
  async save<T>(key: string, data: T): Promise<void> {
    console.warn(
      "ExternalDataSourceService is read-only, save operation not implemented",
    );
  }

  /**
   * Load data from storage
   */
  async load<T>(key: string): Promise<T | null> {
    // If we have cached data for this key, return it
    if (this.cachedData[key]) {
      return this.cachedData[key] as T;
    }

    // Otherwise, try to load all data and then return the requested key
    await this.loadFromExternalSources();

    return (this.cachedData[key] as T) || null;
  }

  /**
   * Delete data from storage (not implemented for read-only external sources)
   */
  async delete(key: string): Promise<void> {
    console.warn(
      "ExternalDataSourceService is read-only, delete operation not implemented",
    );
  }

  /**
   * List available keys
   */
  async listKeys(): Promise<string[]> {
    // If we've already loaded data, return the available keys
    if (Object.keys(this.cachedData).length > 0) {
      return Object.keys(this.cachedData);
    }

    // Otherwise, load the data first
    await this.loadFromExternalSources();
    return Object.keys(this.cachedData);
  }

  /**
   * Get combined tasks and projects
   */
  async getCombinedData(): Promise<ExternalDataSourceResult> {
    // If we have cached combined data, return it
    if (this.cachedData["combined"]) {
      return this.cachedData["combined"] as ExternalDataSourceResult;
    }

    // Otherwise, load all data
    return this.loadFromExternalSources();
  }

  /**
   * Get tasks from all sources
   */
  async getTasks(): Promise<Task[]> {
    // If we have cached tasks, return them
    if (this.cachedData["tasks"]) {
      return this.cachedData["tasks"] as Task[];
    }

    // Otherwise, load all data and return tasks
    const data = await this.loadFromExternalSources();
    return data.tasks;
  }

  /**
   * Get projects from all sources
   */
  async getProjects(): Promise<Project[]> {
    // If we have cached projects, return them
    if (this.cachedData["projects"]) {
      return this.cachedData["projects"] as Project[];
    }

    // Otherwise, load all data and return projects
    const data = await this.loadFromExternalSources();
    return data.projects;
  }
}
