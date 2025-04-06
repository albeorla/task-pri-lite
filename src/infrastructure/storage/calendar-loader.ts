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
  private eventToTask(event: CalendarEvent): Task {
    // Determine if this is a task-like event
    // For example, events that use specific keywords or formatting
    const isTaskLike = this.isEventLikelyTask(event);

    // Extract date information
    const startDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : undefined;

    // Create the task
    const task = new Task({
      id: event.id,
      description: event.summary,
      notes: event.description || "",
      status: TaskStatus.INBOX, // Default status for events
      context: event.location || "",
      dueDate: startDate,
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
  private calendarTaskToTask(calendarTask: CalendarTask): Task {
    // Determine status
    let status = TaskStatus.INBOX;

    if (calendarTask.status === "completed") {
      status = TaskStatus.DONE;
    } else if (calendarTask.status === "needsAction") {
      status = TaskStatus.NEXT_ACTION;
    }

    // Map priority to Eisenhower quadrant
    let eisenhowerQuadrant = EisenhowerQuadrant.DECIDE; // Default to Q2

    if (calendarTask.priority) {
      if (calendarTask.priority > 7) {
        eisenhowerQuadrant = EisenhowerQuadrant.DO; // Q1: Urgent & Important
      } else if (calendarTask.priority > 5) {
        eisenhowerQuadrant = EisenhowerQuadrant.DELEGATE; // Q3: Urgent & Not Important
      } else if (calendarTask.priority > 3) {
        eisenhowerQuadrant = EisenhowerQuadrant.DECIDE; // Q2: Not Urgent & Important
      } else {
        eisenhowerQuadrant = EisenhowerQuadrant.DELETE; // Q4: Not Urgent & Not Important
      }
    }

    // Create the task
    const task = new Task({
      id: calendarTask.id,
      description: calendarTask.title,
      notes: calendarTask.notes || "",
      status: status,
      dueDate: calendarTask.due ? new Date(calendarTask.due) : undefined,
      eisenhowerQuadrant: eisenhowerQuadrant,
      isActionable: true, // Calendar tasks are typically actionable
      creationDate: new Date(calendarTask.created),
    });

    return task;
  }

  /**
   * Determine if an event is likely a task
   *
   * @param event - The event to analyze
   * @returns Whether the event is likely a task
   */
  private isEventLikelyTask(event: CalendarEvent): boolean {
    // This is a simplified heuristic - in a real app, we'd use more sophisticated logic
    const taskKeywords = [
      "todo",
      "task",
      "action item",
      "deadline",
      "submit",
      "complete",
      "finish",
    ];

    // Check summary and description for task keywords
    const textToCheck =
      `${event.summary} ${event.description || ""}`.toLowerCase();

    return taskKeywords.some((keyword) => textToCheck.includes(keyword));
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
    const eventTasks = events.map((event) => this.eventToTask(event));

    // Convert calendar tasks to tasks
    const calendarTasksTasks = calendarTasks.map((calTask) =>
      this.calendarTaskToTask(calTask),
    );

    // Combine all tasks
    const allTasks = [...eventTasks, ...calendarTasksTasks];

    // Calendar doesn't have projects, so return an empty array
    return { tasks: allTasks, projects: [] };
  }
}
