import { Project } from './project';

export enum TaskStatus {
  INBOX = 'Inbox',
  NEXT_ACTION = 'Next Action',
  PROJECT_TASK = 'Project Task',
  WAITING_FOR = 'Waiting For',
  SOMEDAY_MAYBE = 'Someday/Maybe',
  REFERENCE = 'Reference',
  DONE = 'Done',
}

export enum EisenhowerQuadrant {
  DO = 'Urgent / Important', // Q1
  DECIDE = 'Not Urgent / Important', // Q2
  DELEGATE = 'Urgent / Not Important', // Q3
  DELETE = 'Not Urgent / Not Important', // Q4
}

export interface TaskProps {
  id?: string;
  description: string;
  sourceId?: string;
  dueDate?: Date;
  notes?: string;
  status?: TaskStatus;
  project?: Project;
  context?: string;
  eisenhowerQuadrant?: EisenhowerQuadrant;
  isActionable?: boolean;
  creationDate?: Date;
}

export class Task {
  public id: string;
  public description: string;
  public notes: string | null;
  public status: TaskStatus;
  public project: Project | null;
  public context: string | null;
  public dueDate: Date | null;
  public nextActionFor: Project[] = [];
  public eisenhowerQuadrant: EisenhowerQuadrant | null;
  public isActionable: boolean | null;
  public creationDate: Date;

  constructor(props: TaskProps) {
    this.id = props.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.description = props.description;
    this.notes = props.notes || null;
    this.status = props.status || TaskStatus.INBOX;
    this.project = props.project || null;
    this.context = props.context || null;
    this.dueDate = props.dueDate || null;
    this.eisenhowerQuadrant = props.eisenhowerQuadrant || null;
    this.isActionable = props.isActionable === undefined ? null : props.isActionable;
    this.creationDate = props.creationDate || new Date();
    this.nextActionFor = [];
  }

  toString(): string {
    const proj = this.project ? ` (Project: ${this.project.name})` : '';
    const ctx = this.context ? ` (Context: ${this.context})` : '';
    const quad = this.eisenhowerQuadrant 
      ? ` (Eisenhower: ${this.eisenhowerQuadrant})` 
      : ' (Eisenhower: N/A)';
    const due = this.dueDate 
      ? ` (Due: ${this.dueDate.toISOString().split('T')[0]})` 
      : '';
    
    return `Task(${this.id}): '${this.description}' - Status: ${this.status}${proj}${ctx}${quad}${due}`;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      notes: this.notes,
      status: this.status,
      project: this.project ? this.project.id : null,
      context: this.context,
      dueDate: this.dueDate ? this.dueDate.toISOString() : null,
      nextActionFor: this.nextActionFor.map(p => p.id),
      eisenhowerQuadrant: this.eisenhowerQuadrant,
      isActionable: this.isActionable,
      creationDate: this.creationDate.toISOString(),
    };
  }

  static fromJSON(json: any, projectsMap: Map<string, Project> = new Map()): Task {
    const task = new Task({
      id: json.id,
      description: json.description,
      notes: json.notes,
      status: json.status as TaskStatus,
      context: json.context,
      dueDate: json.dueDate ? new Date(json.dueDate) : undefined,
      eisenhowerQuadrant: json.eisenhowerQuadrant as EisenhowerQuadrant,
      isActionable: json.isActionable,
      creationDate: new Date(json.creationDate),
    });

    // Link project if available in the map
    if (json.project && projectsMap.has(json.project)) {
      task.project = projectsMap.get(json.project) || null;
    }

    // Link nextActionFor projects if available
    if (Array.isArray(json.nextActionFor)) {
      task.nextActionFor = json.nextActionFor
        .map((projId: string) => projectsMap.get(projId))
        .filter((p: Project | undefined): p is Project => p !== undefined);
    }

    return task;
  }
} 