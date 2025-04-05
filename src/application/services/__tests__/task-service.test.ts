import { TaskService } from '../task-service';
import { Task, TaskStatus } from '../../../core/models/task';
import { Project } from '../../../core/models/project';

describe('TaskService', () => {
  // Mock storage service
  const mockStorageService = {
    load: jest.fn(),
    save: jest.fn(),
    getTasks: jest.fn(),
    getProjects: jest.fn(),
  };

  let taskService: TaskService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    taskService = new TaskService(mockStorageService);
  });

  describe('getAllTasks', () => {
    test('should use getTasks method when available', async () => {
      // Setup
      const mockTasks = [
        new Task({ id: '1', description: 'Task 1' }),
        new Task({ id: '2', description: 'Task 2' }),
      ];
      mockStorageService.getTasks.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskService.getAllTasks();

      // Verify
      expect(mockStorageService.getTasks).toHaveBeenCalled();
      expect(mockStorageService.load).not.toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    test('should fall back to load method when getTasks is not available', async () => {
      // Setup
      const mockStorageServiceWithoutGetTasks = {
        load: jest.fn(),
        save: jest.fn(),
      };
      const taskServiceWithFallback = new TaskService(mockStorageServiceWithoutGetTasks);
      
      const mockTasks = [
        new Task({ id: '1', description: 'Task 1' }),
        new Task({ id: '2', description: 'Task 2' }),
      ];
      mockStorageServiceWithoutGetTasks.load.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskServiceWithFallback.getAllTasks();

      // Verify
      expect(mockStorageServiceWithoutGetTasks.load).toHaveBeenCalledWith('tasks');
      expect(result).toEqual(mockTasks);
    });

    test('should return empty array if no tasks are found', async () => {
      // Setup
      mockStorageService.getTasks.mockResolvedValue(null);

      // Execute
      const result = await taskService.getAllTasks();

      // Verify
      expect(mockStorageService.getTasks).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getAllProjects', () => {
    test('should use getProjects method when available', async () => {
      // Setup
      const mockProjects = [
        new Project({ id: '1', name: 'Project 1' }),
        new Project({ id: '2', name: 'Project 2' }),
      ];
      mockStorageService.getProjects.mockResolvedValue(mockProjects);

      // Execute
      const result = await taskService.getAllProjects();

      // Verify
      expect(mockStorageService.getProjects).toHaveBeenCalled();
      expect(mockStorageService.load).not.toHaveBeenCalled();
      expect(result).toEqual(mockProjects);
    });

    test('should fall back to load method when getProjects is not available', async () => {
      // Setup
      const mockStorageServiceWithoutGetProjects = {
        load: jest.fn(),
        save: jest.fn(),
      };
      const taskServiceWithFallback = new TaskService(mockStorageServiceWithoutGetProjects);
      
      const mockProjects = [
        new Project({ id: '1', name: 'Project 1' }),
        new Project({ id: '2', name: 'Project 2' }),
      ];
      mockStorageServiceWithoutGetProjects.load.mockResolvedValue(mockProjects);

      // Execute
      const result = await taskServiceWithFallback.getAllProjects();

      // Verify
      expect(mockStorageServiceWithoutGetProjects.load).toHaveBeenCalledWith('projects');
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getIncompleteTasks', () => {
    test('should return only incomplete tasks', async () => {
      // Setup
      const mockTasks = [
        new Task({ id: '1', description: 'Task 1', status: TaskStatus.TODO }),
        new Task({ id: '2', description: 'Task 2', status: TaskStatus.IN_PROGRESS }),
        new Task({ id: '3', description: 'Task 3', status: TaskStatus.DONE }),
      ];
      mockStorageService.getTasks.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskService.getIncompleteTasks();

      // Verify
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockTasks[0]);
      expect(result).toContainEqual(mockTasks[1]);
      expect(result).not.toContainEqual(mockTasks[2]);
    });
  });

  describe('getTasksByProject', () => {
    test('should return tasks for a specific project', async () => {
      // Setup
      const project1 = new Project({ id: 'project1', name: 'Project 1' });
      const project2 = new Project({ id: 'project2', name: 'Project 2' });
      
      const mockTasks = [
        new Task({ id: '1', description: 'Task 1', project: project1 }),
        new Task({ id: '2', description: 'Task 2', project: project1 }),
        new Task({ id: '3', description: 'Task 3', project: project2 }),
      ];
      mockStorageService.getTasks.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskService.getTasksByProject('project1');

      // Verify
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockTasks[0]);
      expect(result).toContainEqual(mockTasks[1]);
      expect(result).not.toContainEqual(mockTasks[2]);
    });
  });

  describe('getActionableTasks', () => {
    test('should return only actionable tasks', async () => {
      // Setup
      const mockTasks = [
        new Task({ id: '1', description: 'Task 1', isActionable: true }),
        new Task({ id: '2', description: 'Task 2', isActionable: false }),
        new Task({ id: '3', description: 'Task 3', isActionable: true }),
      ];
      mockStorageService.getTasks.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskService.getActionableTasks();

      // Verify
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockTasks[0]);
      expect(result).not.toContainEqual(mockTasks[1]);
      expect(result).toContainEqual(mockTasks[2]);
    });
  });

  describe('getNextActions', () => {
    test('should return one task per project based on priority', async () => {
      // Setup
      const project1 = new Project({ id: 'project1', name: 'Project 1' });
      const project2 = new Project({ id: 'project2', name: 'Project 2' });
      
      const mockTasks = [
        new Task({ 
          id: '1', 
          description: 'Task 1', 
          project: project1, 
          eisenhowerQuadrant: 'urgent-important',
          status: TaskStatus.TODO
        }),
        new Task({ 
          id: '2', 
          description: 'Task 2', 
          project: project1, 
          eisenhowerQuadrant: 'not-urgent-important',
          status: TaskStatus.TODO
        }),
        new Task({ 
          id: '3', 
          description: 'Task 3', 
          project: project2, 
          eisenhowerQuadrant: 'urgent-not-important',
          status: TaskStatus.TODO
        }),
        new Task({ 
          id: '4', 
          description: 'Task 4', 
          project: project2, 
          eisenhowerQuadrant: 'urgent-important',
          status: TaskStatus.DONE // This one is done, so it shouldn't be included
        }),
      ];
      mockStorageService.getTasks.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskService.getNextActions();

      // Verify
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockTasks[0]); // Task 1 should be the next action for project1
      expect(result).toContainEqual(mockTasks[2]); // Task 3 should be the next action for project2
      expect(result).not.toContainEqual(mockTasks[1]); 
      expect(result).not.toContainEqual(mockTasks[3]); 
    });

    test('should prioritize tasks with due dates', async () => {
      // Setup
      const project1 = new Project({ id: 'project1', name: 'Project 1' });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const mockTasks = [
        new Task({ 
          id: '1', 
          description: 'Task 1', 
          project: project1, 
          eisenhowerQuadrant: 'not-urgent-important',
          status: TaskStatus.TODO,
          dueDate: nextWeek
        }),
        new Task({ 
          id: '2', 
          description: 'Task 2', 
          project: project1, 
          eisenhowerQuadrant: 'not-urgent-important',
          status: TaskStatus.TODO,
          dueDate: tomorrow // This has an earlier due date
        }),
      ];
      mockStorageService.getTasks.mockResolvedValue(mockTasks);

      // Execute
      const result = await taskService.getNextActions();

      // Verify
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('2'); // Task 2 should be prioritized due to earlier due date
    });
  });
}); 