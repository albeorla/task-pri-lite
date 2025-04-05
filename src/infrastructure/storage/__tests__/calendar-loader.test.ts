/**
 * Unit tests for GoogleCalendarLoader
 */

import { GoogleCalendarLoader } from '../calendar-loader';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and validator modules
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('../schema-validator', () => ({
  validateFile: jest.fn().mockReturnValue({ valid: true, errors: [] })
}));

// Import mocked modules
import { validateFile } from '../schema-validator';

describe('GoogleCalendarLoader', () => {
  // Test data
  const mockEventsData = {
    'Test Calendar': [
      {
        id: 'event1',
        summary: 'Test Event 1',
        description: 'Description for Test Event 1',
        status: 'confirmed',
        start: {
          dateTime: '2025-04-10T10:00:00Z'
        },
        end: {
          dateTime: '2025-04-10T11:00:00Z'
        },
        created: '2025-04-03T17:20:46.055102Z',
        updated: '2025-04-03T17:20:46.055102Z'
      },
      {
        id: 'event2',
        summary: 'Test Event 2',
        status: 'confirmed',
        start: {
          date: '2025-04-15'
        },
        end: {
          date: '2025-04-16'
        },
        all_day: true,
        created: '2025-04-03T17:20:46.055102Z',
        updated: '2025-04-03T17:20:46.055102Z'
      }
    ]
  };

  const mockTasksData = [
    {
      id: 'task1',
      title: 'Test Task 1',
      description: 'Description for Test Task 1',
      calendar_id: 'calendar1',
      calendar_name: 'Test Calendar',
      due_date: '2025-04-10',
      status: 'active',
      priority: 3,
      tags: ['important'],
      url: 'https://example.com/task1'
    },
    {
      id: 'task2',
      title: 'Test Task 2',
      calendar_id: 'calendar1',
      calendar_name: 'Test Calendar',
      status: 'active',
      priority: 2,
      tags: [],
      url: 'https://example.com/task2'
    }
  ];

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the readFile implementation for events
    (fs.promises.readFile as jest.Mock).mockImplementation((path) => {
      if (path.includes('events')) {
        return Promise.resolve(JSON.stringify(mockEventsData));
      } else if (path.includes('tasks')) {
        return Promise.resolve(JSON.stringify(mockTasksData));
      }
      return Promise.reject(new Error('Unknown file'));
    });
  });

  it('should create a GoogleCalendarLoader instance with the default file paths', () => {
    const loader = new GoogleCalendarLoader();
    expect(loader).toBeInstanceOf(GoogleCalendarLoader);
  });

  it('should create a GoogleCalendarLoader instance with custom file paths', () => {
    const eventsPath = '/custom/path/calendar_events.json';
    const tasksPath = '/custom/path/calendar_tasks.json';
    const loader = new GoogleCalendarLoader(eventsPath, tasksPath);
    expect(loader).toBeInstanceOf(GoogleCalendarLoader);
  });

  it('should validate files before loading raw data', async () => {
    const loader = new GoogleCalendarLoader('/test/events.json', '/test/tasks.json');
    await loader.loadRawEventsData();
    await loader.loadRawTasksData();
    
    expect(validateFile).toHaveBeenCalledWith('/test/events.json', 'calendar_schema');
    expect(validateFile).toHaveBeenCalledWith('/test/tasks.json', 'calendar_schema');
  });

  it('should throw an error if events validation fails', async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({ valid: false, errors: ['Test error'] });
    const loader = new GoogleCalendarLoader();
    
    await expect(loader.loadRawEventsData()).rejects.toThrow('Google Calendar events validation failed: Test error');
  });

  it('should throw an error if tasks validation fails', async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({ valid: true, errors: [] })
      .mockReturnValueOnce({ valid: false, errors: ['Test error'] });
    const loader = new GoogleCalendarLoader();
    
    await loader.loadRawEventsData(); // First call passes
    await expect(loader.loadRawTasksData()).rejects.toThrow('Google Calendar tasks validation failed: Test error');
  });

  it('should load and parse raw events data from file', async () => {
    const loader = new GoogleCalendarLoader();
    const data = await loader.loadRawEventsData();
    
    expect(fs.promises.readFile).toHaveBeenCalled();
    expect(data).toEqual(mockEventsData);
  });

  it('should load and parse raw tasks data from file', async () => {
    const loader = new GoogleCalendarLoader();
    const data = await loader.loadRawTasksData();
    
    expect(fs.promises.readFile).toHaveBeenCalled();
    expect(data).toEqual(mockTasksData);
  });

  it('should throw an error if file reading fails', async () => {
    (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(new Error('File read error'));
    const loader = new GoogleCalendarLoader();
    
    await expect(loader.loadRawEventsData()).rejects.toThrow('Error loading Google Calendar events data: File read error');
  });

  it('should map Calendar data to core domain Tasks', async () => {
    const loader = new GoogleCalendarLoader();
    const result = await loader.load();
    
    // Check that we got tasks
    expect(result).toHaveProperty('tasks');
    
    // Check that we have the correct number of tasks
    // 2 from events + 2 from tasks = 4 tasks
    expect(result.tasks.length).toBe(4);
    
    // Check that the first task is properly mapped
    const firstTask = result.tasks[0];
    expect(firstTask.description).toBe('Test Event 1');
    expect(firstTask.dueDate).toBeInstanceOf(Date);
  });

  it('should handle empty data', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
    
    const loader = new GoogleCalendarLoader();
    const result = await loader.load();
    
    expect(result.tasks.length).toBe(0);
  });
}); 