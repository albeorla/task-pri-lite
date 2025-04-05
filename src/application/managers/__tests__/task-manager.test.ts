import { TaskManager } from '../task-manager';
import { Task, TaskStatus } from '../../../core/models/task';
import { Project } from '../../../core/models/project';
import { EisenhowerMatrix } from '../../../core/types/enums';

describe('TaskManager', () => {
  // Mock dependencies
  const mockTaskService = {
    getAllTasks: jest.fn(),
    getAllProjects: jest.fn(),
    getIncompleteTasks: jest.fn(),
    getTasksByProject: jest.fn(),
    getActionableTasks: jest.fn(),
    getNextActions: jest.fn(),
  };

  const mockStorageService = {
    save: jest.fn(),
    load: jest.fn(),
    delete: jest.fn(),
    listKeys: jest.fn(),
  };

  let taskManager: TaskManager;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    taskManager = new TaskManager(mockTaskService, mockStorageService);
  });

  describe('createTask', () => {
    test('should create a new task with correct properties', async () => {
      // Setup
      const taskData = {
        description: 'Test task',
        notes: 'Some notes',
        status: TaskStatus.INBOX,
        dueDate: new Date('2023-12-31'),
      };

      // Execute
      const result = await taskManager.createTask(taskData);

      // Verify
      expect(result).toBeInstanceOf(Task);
      expect(result.description).toBe(taskData.description);
      expect(result.notes).toBe(taskData.notes);
      expect(result.status).toBe(taskData.status);
      expect(result.dueDate).toEqual(taskData.dueDate);
      expect(mockStorageService.save).toHaveBeenCalledWith('tasks', [result]);
    });

    test('should add task to existing tasks', async () => {
      // Setup
      const existingTasks = [
        new Task({ id: 'existing1', description: 'Existing task' }),
      ];
      mockTaskService.getAllTasks.mockResolvedValue(existingTasks);

      const taskData = {
        description: 'New task',
      };

      // Execute
      const result = await taskManager.createTask(taskData);

      // Verify
      expect(mockStorageService.save).toHaveBeenCalledWith(
        'tasks',
        expect.arrayContaining([
          existingTasks[0],
          expect.objectContaining({ description: 'New task' }),
        ])
      );
    });
  });

  describe('updateTask', () => {
    test('should update existing task properties', async () => {
      // Setup
      const existingTask = new Task({
        id: 'task1',
        description: 'Original description',
        notes: 'Original notes',
        status: TaskStatus.INBOX,
      });

      const mockTasks = [existingTask, new Task({ id: 'task2', description: 'Another task' })];
      mockTaskService.getAllTasks.mockResolvedValue(mockTasks);

      const updateData = {
        description: 'Updated description',
        notes: 'Updated notes',
        status: TaskStatus.IN_PROGRESS,
      };

      // Execute
      const result = await taskManager.updateTask('task1', updateData);

      // Verify
      expect(result).toBeDefined();
      expect(result.id).toBe('task1');
      expect(result.description).toBe(updateData.description);
      expect(result.notes).toBe(updateData.notes);
      expect(result.status).toBe(updateData.status);
      expect(mockStorageService.save).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    test('should throw error when task is not found', async () => {
      // Setup
      mockTaskService.getAllTasks.mockResolvedValue([
        new Task({ id: 'task1', description: 'Some task' }),
      ]);

      // Execute & Verify
      await expect(
        taskManager.updateTask('nonexistent', { description: 'New description' })
      ).rejects.toThrow('Task not found with id: nonexistent');
      expect(mockStorageService.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    test('should delete an existing task', async () => {
      // Setup
      const task1 = new Task({ id: 'task1', description: 'Task to delete' });
      const task2 = new Task({ id: 'task2', description: 'Task to keep' });
      mockTaskService.getAllTasks.mockResolvedValue([task1, task2]);

      // Execute
      await taskManager.deleteTask('task1');

      // Verify
      expect(mockStorageService.save).toHaveBeenCalledWith('tasks', [task2]);
    });

    test('should throw error when task is not found', async () => {
      // Setup
      mockTaskService.getAllTasks.mockResolvedValue([
        new Task({ id: 'task1', description: 'Some task' }),
      ]);

      // Execute & Verify
      await expect(taskManager.deleteTask('nonexistent')).rejects.toThrow(
        'Task not found with id: nonexistent'
      );
      expect(mockStorageService.save).not.toHaveBeenCalled();
    });
  });

  describe('createProject', () => {
    test('should create a new project with correct properties', async () => {
      // Setup
      const projectData = {
        name: 'Test project',
        outcome: 'Desired outcome',
      };

      // Execute
      const result = await taskManager.createProject(projectData);

      // Verify
      expect(result).toBeInstanceOf(Project);
      expect(result.name).toBe(projectData.name);
      expect(result.outcome).toBe(projectData.outcome);
      expect(mockStorageService.save).toHaveBeenCalledWith('projects', [result]);
    });

    test('should add project to existing projects', async () => {
      // Setup
      const existingProjects = [
        new Project({ id: 'existing1', name: 'Existing project' }),
      ];
      mockTaskService.getAllProjects.mockResolvedValue(existingProjects);

      const projectData = {
        name: 'New project',
      };

      // Execute
      const result = await taskManager.createProject(projectData);

      // Verify
      expect(mockStorageService.save).toHaveBeenCalledWith(
        'projects',
        expect.arrayContaining([
          existingProjects[0],
          expect.objectContaining({ name: 'New project' }),
        ])
      );
    });
  });

  describe('prioritizeTaskWithEisenhower', () => {
    test('should set eisenhower quadrant for a task', async () => {
      // Setup
      const task = new Task({ id: 'task1', description: 'Task to prioritize' });
      const tasks = [task, new Task({ id: 'task2', description: 'Another task' })];
      mockTaskService.getAllTasks.mockResolvedValue(tasks);

      // Execute
      const result = await taskManager.prioritizeTaskWithEisenhower(
        'task1',
        EisenhowerMatrix.URGENT_IMPORTANT
      );

      // Verify
      expect(result.eisenhowerQuadrant).toBe(EisenhowerMatrix.URGENT_IMPORTANT);
      expect(mockStorageService.save).toHaveBeenCalledWith('tasks', expect.any(Array));
    });
  });

  describe('setTaskActionable', () => {
    test('should mark task as actionable', async () => {
      // Setup
      const task = new Task({ id: 'task1', description: 'Task to make actionable', isActionable: false });
      const tasks = [task, new Task({ id: 'task2', description: 'Another task' })];
      mockTaskService.getAllTasks.mockResolvedValue(tasks);

      // Execute
      const result = await taskManager.setTaskActionable('task1', true);

      // Verify
      expect(result.isActionable).toBe(true);
      expect(mockStorageService.save).toHaveBeenCalledWith('tasks', expect.any(Array));
    });
  });

  describe('assignTaskToProject', () => {
    test('should assign task to project', async () => {
      // Setup
      const project = new Project({ id: 'project1', name: 'Test Project' });
      const task = new Task({ id: 'task1', description: 'Task to assign' });
      
      mockTaskService.getAllTasks.mockResolvedValue([task]);
      mockTaskService.getAllProjects.mockResolvedValue([project]);

      // Execute
      const result = await taskManager.assignTaskToProject('task1', 'project1');

      // Verify
      expect(result.project).toEqual(project);
      expect(mockStorageService.save).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    test('should throw error when project is not found', async () => {
      // Setup
      const task = new Task({ id: 'task1', description: 'Task to assign' });
      mockTaskService.getAllTasks.mockResolvedValue([task]);
      mockTaskService.getAllProjects.mockResolvedValue([]);

      // Execute & Verify
      await expect(
        taskManager.assignTaskToProject('task1', 'nonexistent')
      ).rejects.toThrow('Project not found with id: nonexistent');
    });
  });
}); 