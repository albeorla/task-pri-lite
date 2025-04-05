/**
 * Unit tests for TodoistLoader
 */

import { TodoistLoader } from '../todoist-loader';
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

describe('TodoistLoader', () => {
  // Test data
  const mockTodoistData = {
    metadata: {
      export_date: '2025-04-03T17:20:46.055102',
      counts: {
        projects: 1,
        sections: 1,
        tasks: 2,
        sub_tasks: 1,
        comments: 0,
        labels: 0
      }
    },
    projects: [
      {
        id: '123456',
        name: 'Test Project',
        tasks: [
          {
            id: '1',
            content: 'Task 1',
            description: 'Description for Task 1',
            project_id: '123456',
            priority: 3,
            is_completed: false,
            created_at: '2025-04-03T17:20:46.055102Z',
            sub_tasks: []
          },
          {
            id: '2',
            content: 'Task 2',
            description: 'Description for Task 2',
            project_id: '123456',
            priority: 2,
            is_completed: false,
            created_at: '2025-04-03T17:20:47.055102Z',
            sub_tasks: [
              {
                id: '3',
                content: 'Sub Task 1',
                description: 'Description for Sub Task 1',
                project_id: '123456',
                parent_id: '2',
                priority: 1,
                is_completed: false,
                created_at: '2025-04-03T17:20:48.055102Z',
                sub_tasks: []
              }
            ]
          }
        ]
      }
    ]
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the readFile implementation
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTodoistData));
  });

  it('should create a TodoistLoader instance with the default file path', () => {
    const loader = new TodoistLoader();
    expect(loader).toBeInstanceOf(TodoistLoader);
  });

  it('should create a TodoistLoader instance with a custom file path', () => {
    const customPath = '/custom/path/todoist_export.json';
    const loader = new TodoistLoader(customPath);
    expect(loader).toBeInstanceOf(TodoistLoader);
  });

  it('should validate file before loading raw data', async () => {
    const loader = new TodoistLoader('/test/path.json');
    await loader.loadRawData();
    
    expect(validateFile).toHaveBeenCalledWith('/test/path.json', 'todoist_denormalized_schema');
  });

  it('should throw an error if validation fails', async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({ valid: false, errors: ['Test error'] });
    const loader = new TodoistLoader();
    
    await expect(loader.loadRawData()).rejects.toThrow('Todoist export validation failed: Test error');
  });

  it('should load and parse raw data from file', async () => {
    const loader = new TodoistLoader();
    const data = await loader.loadRawData();
    
    expect(fs.promises.readFile).toHaveBeenCalled();
    expect(data).toEqual(mockTodoistData);
  });

  it('should throw an error if file reading fails', async () => {
    (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(new Error('File read error'));
    const loader = new TodoistLoader();
    
    await expect(loader.loadRawData()).rejects.toThrow('Error loading Todoist export data: File read error');
  });

  it('should map Todoist data to core domain models', async () => {
    const loader = new TodoistLoader();
    const result = await loader.load();
    
    // Check that we got tasks and projects
    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('projects');
    
    // Check that we have the correct number of tasks (2 tasks + 1 sub-task)
    expect(result.tasks.length).toBe(3);
    
    // Check that we have the correct number of projects
    expect(result.projects.length).toBe(1);
    
    // Check that tasks are linked to projects
    expect(result.tasks[0].project).toBeTruthy();
    expect(result.tasks[0].project?.id).toBe('123456');
    
    // Check that project has tasks
    expect(result.projects[0].tasks.length).toBe(3);
  });

  it('should handle empty data', async () => {
    const emptyData = { metadata: { export_date: '', counts: {} }, projects: [] };
    (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(emptyData));
    
    const loader = new TodoistLoader();
    const result = await loader.load();
    
    expect(result.tasks.length).toBe(0);
    expect(result.projects.length).toBe(0);
  });
}); 