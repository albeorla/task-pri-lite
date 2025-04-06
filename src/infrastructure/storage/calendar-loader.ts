/**
 * Google Calendar File Loader
 *
 * Reads Google Calendar export JSON files and validates them against the schema
 */

import * as fs from "fs";
import * as path from "path";
import { Task, TaskStatus, EisenhowerQuadrant } from "../../core/models/task";
import { validateFile } from "./schema-validator";

// Define default file paths
const DEFAULT_EVENTS_PATH = path.resolve(
  process.cwd(),
  "output/calendar_events.json",
);
const DEFAULT_TASKS_PATH = path.resolve(
  process.cwd(),
  "output/calendar_tasks.json",
);

// Calendar event interface based on the JSON schema
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: string;
  created: string;
  updated: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
  }>;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: {
    dateTime: string;
    timeZone: string;
  };
  transparency?: string;
  visibility?: string;
  iCalUID: string;
  sequence: number;
  hangoutLink?: string;
  conferenceData?: {
    conferenceId: string;
    conferenceSolution: {
      key: {
        type: string;
      };
      name: string;
      iconUri: string;
    };
  };
  creator?: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  isTaskLike?: boolean; // Custom property we might add to flag events that seem like tasks
}

// Calendar task interface
interface CalendarTask {
  id: string;
  title: string;
  notes?: string;
  due?: string; // ISO date string
  completed?: string; // ISO date string
  status: string;
  updated: string;
  created: string;
  links?: Array<{
    link: string;
    description?: string;
  }>;
  parent?: string;
  position?: string;
  priority?: number;
}

/**
 * Interface for calendar event data
 */
interface _CalendarEventsData {
  events: CalendarEvent[];
}

/**
 * GoogleCalendarLoader class
 *
 * Responsible for loading Google Calendar export data from JSON files and mapping
 * them to the application's core domain models
 */
export class GoogleCalendarLoader {
  private eventsFilePath: string;
  private tasksFilePath: string;

  /**
   * Creates a new GoogleCalendarLoader
   *
   * @param eventsFilePath - Path to the Google Calendar events JSON file
   * @param tasksFilePath - Path to the Google Calendar tasks JSON file
   */
  constructor(
    eventsFilePath: string = DEFAULT_EVENTS_PATH,
    tasksFilePath: string = DEFAULT_TASKS_PATH,
  ) {
    this.eventsFilePath = eventsFilePath;
    this.tasksFilePath = tasksFilePath;
  }

  /**
   * Load and validate the Google Calendar events data
   *
   * @returns The validated events data
   * @throws Error if the file doesn't exist, contains invalid JSON, or fails schema validation
   */
  public async loadEventsData(): Promise<CalendarEvent[]> {
    // Validate the file against the schema
    const validation = validateFile(this.eventsFilePath, "calendar_schema");

    if (!validation.valid) {
      throw new Error(
        `Calendar events validation failed: ${validation.errors.join(", ")}`,
      );
    }

    // If valid, load and parse the file
    try {
      const rawData = await fs.promises.readFile(this.eventsFilePath, "utf8");
      return JSON.parse(rawData) as CalendarEvent[];
    } catch (err) {
      throw new Error(
        `Error loading calendar events data: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Load and validate the Google Calendar tasks data
   *
   * @returns The validated tasks data
   * @throws Error if the file doesn't exist, contains invalid JSON, or fails schema validation
   */
  public async loadTasksData(): Promise<CalendarTask[]> {
    // Check if the file exists
    if (!fs.existsSync(this.tasksFilePath)) {
      console.warn(
        `Calendar tasks file not found: ${this.tasksFilePath}. Returning empty array.`,
      );
      return [];
    }

    try {
      const rawData = await fs.promises.readFile(this.tasksFilePath, "utf8");
      const parsedData = JSON.parse(rawData) as CalendarTask[];

      // Basic validation - in the future, we could add a schema for this
      if (!Array.isArray(parsedData)) {
        throw new Error("Calendar tasks data is not an array");
      }

      return parsedData;
    } catch (err) {
      throw new Error(
        `Error loading calendar tasks data: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Convert a calendar event to a task
   *
   * @param event - The calendar event to convert
   * @returns A task representing the event
   */
  private convertEventToTask(event: any): Task {
    // Extract start date/time
    let startDate: Date | null = null;
    if (event.start) {
      if (event.start.dateTime) {
        startDate = new Date(event.start.dateTime);
      } else if (event.start.date) {
        startDate = new Date(event.start.date);
      }
    }

    // Determine if the event is task-like (e.g., has "TODO" or "Task" in the title)
    const isTaskLike =
      event.summary && /task|todo|action|remind(?:er)?/i.test(event.summary);

    const task = new Task({
      id: event.id,
      description: event.summary,
      notes: event.description || "",
      status: TaskStatus.INBOX, // Default status for events
      context: event.location || "",
      dueDate: startDate, // Use the start date of the event as the due date
      // Events are typically important but not urgent unless they're happening today/tomorrow
      eisenhowerQuadrant: EisenhowerQuadrant.DECIDE,
      isActionable: isTaskLike, // Only task-like events are directly actionable
      creationDate: new Date(event.created),
    });

    return task;
  }

  /**
   * Convert a calendar task to a core task
   *
   * @param calendarTask - The calendar task to convert
   * @returns A task representing the calendar task
   */
  private convertCalendarTaskToTask(calendarTask: any): Task {
    // Parse the due date if present
    let dueDate: Date | null = null;
    if (calendarTask.due) {
      dueDate = new Date(calendarTask.due);
    }

    // Map Google Task status to our TaskStatus
    const getTaskStatus = (status: string): TaskStatus => {
      switch (status.toLowerCase()) {
        case "completed":
          return TaskStatus.DONE;
        case "needsaction":
          return TaskStatus.NEXT_ACTION;
        default:
          return TaskStatus.INBOX;
      }
    };

    // Map Google Task priority to Eisenhower quadrant
    const getEisenhowerQuadrant = (priority: number): EisenhowerQuadrant => {
      switch (priority) {
        case 1: // High priority
          return EisenhowerQuadrant.DO;
        case 2: // Medium priority
          return EisenhowerQuadrant.DECIDE;
        case 3: // Low priority
          return EisenhowerQuadrant.DELEGATE;
        default:
          return EisenhowerQuadrant.DELETE;
      }
    };

    const task = new Task({
      id: calendarTask.id,
      description: calendarTask.title,
      notes: calendarTask.notes || "",
      status: getTaskStatus(calendarTask.status),
      dueDate: dueDate,
      eisenhowerQuadrant: getEisenhowerQuadrant(calendarTask.priority),
      isActionable: true,
      creationDate: new Date(calendarTask.created),
    });

    return task;
  }

  /**
   * Loads Google Calendar data and converts it to the application's core models
   *
   * @returns Array of converted Tasks
   */
  public async load(): Promise<{ tasks: Task[]; projects: [] }> {
    // Load events and tasks in parallel
    const [events, calendarTasks] = await Promise.all([
      this.loadEventsData().catch((err) => {
        console.error("Error loading events:", err);
        return [] as CalendarEvent[];
      }),
      this.loadTasksData().catch((err) => {
        console.error("Error loading tasks:", err);
        return [] as CalendarTask[];
      }),
    ]);

    console.log(
      `Loaded ${events.length} events and ${calendarTasks.length} tasks from Calendar`,
    );

    // Convert events to tasks
    const eventTasks = events.map((event) => this.convertEventToTask(event));

    // Convert calendar tasks to tasks
    const calendarTasksTasks = calendarTasks.map((calTask) =>
      this.convertCalendarTaskToTask(calTask),
    );

    // Combine all tasks
    const allTasks = [...eventTasks, ...calendarTasksTasks];

    // Calendar doesn't have projects, so return an empty array
    return { tasks: allTasks, projects: [] };
  }
}
