/**
 * Todoist Import for Task Priority Lite
 *
 * This module provides functionality for importing tasks from Todoist export JSON.
 */

import { InputSource } from "../core/interfaces";
import { TextInputItem, ManualTaskInputItem } from "./basic-input-items";
import { TaskItem } from "../storage/task-store";
import { v4 as uuidv4 } from "uuid";

/**
 * Interface for Todoist Task structure
 */
interface TodoistTask {
  id: string;
  content: string;
  description: string;
  due?: {
    date: string;
    is_recurring: boolean;
  };
  priority: number;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  labels: string[];
  is_completed: boolean;
  sub_tasks?: TodoistTask[];
}

/**
 * Interface for Todoist Project structure
 */
interface TodoistProject {
  id: string;
  name: string;
  tasks: TodoistTask[];
  sections: TodoistSection[];
}

/**
 * Interface for Todoist Section structure
 */
interface TodoistSection {
  id: string;
  name: string;
  tasks: TodoistTask[];
}

/**
 * Class for importing Todoist tasks
 */
export class TodoistImporter {
  private todoistData: any;
  private projectMap: Map<string, string> = new Map();
  private sectionMap: Map<string, { name: string; project: string }> =
    new Map();

  /**
   * Constructor
   * @param jsonData Todoist export JSON data
   */
  constructor(jsonData: string) {
    try {
      this.todoistData = JSON.parse(jsonData);
      this.buildMaps();
    } catch (error) {
      console.error("Error parsing Todoist JSON:", error);
      throw new Error("Invalid Todoist JSON format");
    }
  }

  /**
   * Build maps for projects and sections for faster lookups
   */
  private buildMaps(): void {
    // Map projects
    if (this.todoistData.projects && Array.isArray(this.todoistData.projects)) {
      this.todoistData.projects.forEach((project: TodoistProject) => {
        this.projectMap.set(project.id, project.name);

        // Map sections within projects
        if (project.sections && Array.isArray(project.sections)) {
          project.sections.forEach((section: TodoistSection) => {
            this.sectionMap.set(section.id, {
              name: section.name,
              project: project.name,
            });
          });
        }
      });
    }
  }

  /**
   * Import tasks from Todoist export
   * @returns Array of input items
   */
  public importTasks(): (TextInputItem | ManualTaskInputItem)[] {
    const items: (TextInputItem | ManualTaskInputItem)[] = [];

    // Process all projects and their tasks
    if (this.todoistData.projects && Array.isArray(this.todoistData.projects)) {
      this.todoistData.projects.forEach((project: TodoistProject) => {
        this.processProjectTasks(project, items);
      });
    }

    return items;
  }

  /**
   * Import tasks from Todoist export directly to TaskItem[]
   * @returns Array of TaskItems ready for storage
   */
  public importAsTaskItems(): TaskItem[] {
    const taskItems: TaskItem[] = [];

    // Process all projects and their tasks
    if (this.todoistData.projects && Array.isArray(this.todoistData.projects)) {
      this.todoistData.projects.forEach((project: TodoistProject) => {
        // Process main tasks in project
        if (project.tasks && Array.isArray(project.tasks)) {
          project.tasks.forEach((task: TodoistTask) => {
            taskItems.push(this.convertToTaskItem(task, project.name));

            // Process subtasks if any
            if (task.sub_tasks && Array.isArray(task.sub_tasks)) {
              task.sub_tasks.forEach((subtask: TodoistTask) => {
                taskItems.push(
                  this.convertToTaskItem(subtask, project.name, task.content),
                );
              });
            }
          });
        }

        // Process tasks in sections
        if (project.sections && Array.isArray(project.sections)) {
          project.sections.forEach((section: TodoistSection) => {
            if (section.tasks && Array.isArray(section.tasks)) {
              section.tasks.forEach((task: TodoistTask) => {
                taskItems.push(
                  this.convertToTaskItem(
                    task,
                    project.name,
                    undefined,
                    section.name,
                  ),
                );

                // Process subtasks if any
                if (task.sub_tasks && Array.isArray(task.sub_tasks)) {
                  task.sub_tasks.forEach((subtask: TodoistTask) => {
                    taskItems.push(
                      this.convertToTaskItem(
                        subtask,
                        project.name,
                        task.content,
                        section.name,
                      ),
                    );
                  });
                }
              });
            }
          });
        }
      });
    }

    return taskItems;
  }

  /**
   * Process tasks within a project
   */
  private processProjectTasks(
    project: TodoistProject,
    items: (TextInputItem | ManualTaskInputItem)[],
  ): void {
    // Process main tasks in project
    if (project.tasks && Array.isArray(project.tasks)) {
      project.tasks.forEach((task: TodoistTask) => {
        items.push(this.convertToInputItem(task, project.name));

        // Process subtasks if any
        if (task.sub_tasks && Array.isArray(task.sub_tasks)) {
          task.sub_tasks.forEach((subtask: TodoistTask) => {
            items.push(
              this.convertToInputItem(subtask, project.name, task.content),
            );
          });
        }
      });
    }

    // Process tasks in sections
    if (project.sections && Array.isArray(project.sections)) {
      project.sections.forEach((section: TodoistSection) => {
        if (section.tasks && Array.isArray(section.tasks)) {
          section.tasks.forEach((task: TodoistTask) => {
            items.push(
              this.convertToInputItem(
                task,
                project.name,
                undefined,
                section.name,
              ),
            );

            // Process subtasks if any
            if (task.sub_tasks && Array.isArray(task.sub_tasks)) {
              task.sub_tasks.forEach((subtask: TodoistTask) => {
                items.push(
                  this.convertToInputItem(
                    subtask,
                    project.name,
                    task.content,
                    section.name,
                  ),
                );
              });
            }
          });
        }
      });
    }
  }

  /**
   * Convert a Todoist task to an input item
   */
  private convertToInputItem(
    task: TodoistTask,
    projectName: string,
    parentTask?: string,
    sectionName?: string,
  ): ManualTaskInputItem | TextInputItem {
    // Parse due date if available
    const dueDate = task.due ? new Date(task.due.date) : null;

    // Map Todoist priority (4=highest, 1=lowest) to our system (0=highest, 3=lowest)
    // Todoist: 4 -> PriLite: 0, Todoist: 1 -> PriLite: 3
    const priorityMap: Record<number, number> = { 4: 0, 3: 1, 2: 2, 1: 3 };
    const priority = task.priority ? priorityMap[task.priority] || 2 : 2;

    // Create context string
    const context = [
      `Project: ${projectName}`,
      sectionName ? `Section: ${sectionName}` : null,
      parentTask ? `Parent: ${parentTask}` : null,
      task.labels.length > 0 ? `Labels: ${task.labels.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    // Combine task description with context info if description is empty
    const description = task.description || context;

    if (dueDate) {
      return new ManualTaskInputItem(
        task.content,
        description,
        dueDate,
        priority,
      );
    } else {
      return new TextInputItem(
        task.content,
        description,
        InputSource.OTHER, // Use OTHER as fallback since EXTERNAL_SYSTEM doesn't exist
      );
    }
  }

  /**
   * Convert a Todoist task directly to a TaskItem for storage
   */
  private convertToTaskItem(
    task: TodoistTask,
    projectName: string,
    parentTask?: string,
    sectionName?: string,
  ): TaskItem {
    // Parse due date if available
    const dueDate = task.due ? new Date(task.due.date) : null;

    // Map Todoist priority (4=highest, 1=lowest) to our system (0=highest, 3=lowest)
    const priorityMap: Record<number, number> = { 4: 0, 3: 1, 2: 2, 1: 3 };
    const priority = task.priority ? priorityMap[task.priority] || 2 : 2;

    // Create context for description if empty
    const description = task.description || "";

    return {
      id: task.id || uuidv4(),
      title: task.content,
      description: description,
      dueDate: dueDate,
      priority: priority,
      project: projectName,
      section: sectionName,
      parentTask: parentTask,
      labels: task.labels,
      completed: task.is_completed,
    };
  }
}
