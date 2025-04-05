/**
 * Google Calendar File Loader
 * 
 * Reads Google Calendar export JSON files and validates them against the schema
 */

import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../../core/models/task';
import { validateFile } from './schema-validator';

// Define default file paths
const DEFAULT_EVENTS_PATH = path.resolve(process.cwd(), 'output/calendar_events.json');
const DEFAULT_TASKS_PATH = path.resolve(process.cwd(), 'output/calendar_tasks.json');

// Define types to match the exported JSON structure
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  all_day?: boolean;
  created: string;
  updated: string;
}

interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  calendar_id: string;
  calendar_name: string;
  due_date?: string;
  start_date?: string;
  is_all_day: boolean;
  location?: string;
  status: string;
  priority: number;
  tags: string[];
  url: string;
}

interface CalendarEventsData {
  [calendarName: string]: CalendarEvent[];
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
    tasksFilePath: string = DEFAULT_TASKS_PATH
  ) {
    this.eventsFilePath = eventsFilePath;
    this.tasksFilePath = tasksFilePath;
  }
  
  /**
   * Load and validate the Google Calendar events data
   * 
   * @returns The validated Google Calendar events data
   * @throws Error if the file doesn't exist, contains invalid JSON, or fails schema validation
   */
  public async loadRawEventsData(): Promise<CalendarEventsData> {
    // Validate the file against the schema
    const validation = validateFile(this.eventsFilePath, 'calendar_schema');
    
    if (!validation.valid) {
      throw new Error(`Google Calendar events validation failed: ${validation.errors.join(', ')}`);
    }
    
    // If valid, load and parse the file
    try {
      const rawData = await fs.promises.readFile(this.eventsFilePath, 'utf8');
      return JSON.parse(rawData) as CalendarEventsData;
    } catch (err) {
      throw new Error(`Error loading Google Calendar events data: ${(err as Error).message}`);
    }
  }
  
  /**
   * Load and validate the Google Calendar tasks data
   * 
   * @returns The validated Google Calendar tasks data
   * @throws Error if the file doesn't exist, contains invalid JSON, or fails schema validation
   */
  public async loadRawTasksData(): Promise<CalendarTask[]> {
    // Validate the file against the schema
    const validation = validateFile(this.tasksFilePath, 'calendar_schema');
    
    if (!validation.valid) {
      throw new Error(`Google Calendar tasks validation failed: ${validation.errors.join(', ')}`);
    }
    
    // If valid, load and parse the file
    try {
      const rawData = await fs.promises.readFile(this.tasksFilePath, 'utf8');
      return JSON.parse(rawData) as CalendarTask[];
    } catch (err) {
      throw new Error(`Error loading Google Calendar tasks data: ${(err as Error).message}`);
    }
  }
  
  /**
   * Maps Google Calendar events to the application's core Task model
   * 
   * @param calendarEvents - Google Calendar events to convert
   * @returns Array of converted Tasks
   */
  private mapEventsToTasks(calendarEvents: CalendarEventsData): Task[] {
    const tasks: Task[] = [];
    
    // Convert all events from all calendars
    for (const calendarName in calendarEvents) {
      const events = calendarEvents[calendarName];
      
      for (const event of events) {
        // Skip cancelled events
        if (event.status === 'cancelled') {
          continue;
        }
        
        // Determine if we should treat this event as a task
        // This is a business decision - we might only want events with certain properties
        // For simplicity, we'll convert all confirmed events to tasks
        if (event.status === 'confirmed') {
          const dueDate = event.start.dateTime 
            ? new Date(event.start.dateTime)
            : event.start.date 
              ? new Date(event.start.date)
              : undefined;
          
          const task = new Task({
            id: event.id,
            description: event.summary,
            notes: event.description || '',
            status: 'active',
            context: calendarName, // Use calendar name as context
            dueDate: dueDate,
            // All calendar events considered not urgent but important by default
            eisenhowerQuadrant: 'not-urgent-important',
            isActionable: true,
            creationDate: new Date(event.created),
          });
          
          tasks.push(task);
        }
      }
    }
    
    return tasks;
  }
  
  /**
   * Maps Google Calendar tasks to the application's core Task model
   * 
   * @param calendarTasks - Google Calendar tasks to convert
   * @returns Array of converted Tasks
   */
  private mapCalendarTasksToTasks(calendarTasks: CalendarTask[]): Task[] {
    return calendarTasks.map(calendarTask => {
      // Convert status from Google Calendar to our format
      let status = 'active';
      if (calendarTask.status === 'completed' || calendarTask.status === 'done') {
        status = 'completed';
      }
      
      // Map priority based on Google Calendar priority
      // Default to not-urgent-important if no clear mapping
      let eisenhowerQuadrant = 'not-urgent-important';
      if (calendarTask.priority > 7) {
        eisenhowerQuadrant = 'urgent-important';
      } else if (calendarTask.priority > 5) {
        eisenhowerQuadrant = 'urgent-not-important';
      } else if (calendarTask.priority > 3) {
        eisenhowerQuadrant = 'not-urgent-important';
      } else {
        eisenhowerQuadrant = 'not-urgent-not-important';
      }
      
      return new Task({
        id: calendarTask.id,
        description: calendarTask.title,
        notes: calendarTask.description || '',
        status: status,
        context: calendarTask.calendar_name,
        dueDate: calendarTask.due_date ? new Date(calendarTask.due_date) : undefined,
        eisenhowerQuadrant: eisenhowerQuadrant as any, // type assertion needed if using string literals
        isActionable: true,
        creationDate: new Date(), // Calendar tasks don't include creation date in exported format
      });
    });
  }
  
  /**
   * Loads Google Calendar events and tasks data and converts them to the application's core models
   * 
   * @returns Object containing tasks
   */
  public async load(): Promise<{ tasks: Task[] }> {
    // Load both events and tasks in parallel for efficiency
    const [eventsData, tasksData] = await Promise.all([
      this.loadRawEventsData(),
      this.loadRawTasksData()
    ]);
    
    // Convert events and tasks to our core Task model
    const eventTasks = this.mapEventsToTasks(eventsData);
    const calendarTasks = this.mapCalendarTasksToTasks(tasksData);
    
    // Combine both sets of tasks
    const allTasks = [...eventTasks, ...calendarTasks];
    
    return { tasks: allTasks };
  }
} 