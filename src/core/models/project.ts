/**
 * Core Project Model
 *
 * This file defines the Project model and related types
 */

import { Task } from "./task";

export interface ProjectProps {
  id?: string;
  name: string;
  outcome?: string | null | undefined;
  status?: string;
  creationDate?: Date;
}

export class Project {
  public id: string;
  public name: string;
  public outcome: string | null;
  public tasks: Task[] = [];
  public status: string;
  public creationDate: Date;

  constructor(props: ProjectProps) {
    this.id =
      props.id ||
      `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.name = props.name;
    this.outcome = props.outcome || null;
    this.status = props.status || "Active";
    this.creationDate = props.creationDate || new Date();
    this.tasks = [];
  }

  addTask(task: Task): void {
    if (!this.tasks.includes(task)) {
      this.tasks.push(task);
      task.project = this;
    }
  }

  getNextAction(): Task | null {
    return this.tasks.find((task) => task.nextActionFor.includes(this)) || null;
  }

  toString(): string {
    return `Project: '${this.name}' (Outcome: ${this.outcome || "N/A"}) - Status: ${this.status}`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      outcome: this.outcome,
      tasks: this.tasks.map((t) => t.id),
      status: this.status,
      creationDate: this.creationDate.toISOString(),
    };
  }

  static fromJSON(json: any, tasksMap: Map<string, Task> = new Map()): Project {
    const project = new Project({
      id: json.id,
      name: json.name,
      outcome: json.outcome,
      status: json.status,
      creationDate: new Date(json.creationDate),
    });

    // Link tasks if available
    if (Array.isArray(json.tasks)) {
      json.tasks.forEach((taskId: string) => {
        const task = tasksMap.get(taskId);
        if (task) {
          project.addTask(task);
        }
      });
    }

    return project;
  }
}
