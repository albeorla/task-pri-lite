/**
 * Tests for the Project model
 */

import { Project } from '../project';
import { Task, TaskStatus } from '../task';

describe('Project Model', () => {
  describe('Constructor and Properties', () => {
    test('should create a project with minimal properties', () => {
      const project = new Project({ name: 'Test Project' });
      
      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.outcome).toBeNull();
      expect(project.tasks).toEqual([]);
      expect(project.status).toBe('Active');
      expect(project.creationDate).toBeInstanceOf(Date);
    });

    test('should create a project with all properties', () => {
      const date = new Date('2023-04-01');
      const project = new Project({
        id: 'proj-1',
        name: 'Complete Project',
        outcome: 'Successful completion',
        status: 'In Progress',
        creationDate: date
      });
      
      expect(project.id).toBe('proj-1');
      expect(project.name).toBe('Complete Project');
      expect(project.outcome).toBe('Successful completion');
      expect(project.tasks).toEqual([]);
      expect(project.status).toBe('In Progress');
      expect(project.creationDate).toBe(date);
    });
  });

  describe('toString Method', () => {
    test('should return formatted string representation', () => {
      const project = new Project({
        name: 'Test Project',
        outcome: 'Successful completion',
        status: 'Active'
      });
      
      const result = project.toString();
      
      expect(result).toContain('Test Project');
      expect(result).toContain('Successful completion');
      expect(result).toContain('Active');
    });

    test('should handle missing outcome in toString', () => {
      const project = new Project({
        name: 'Simple Project'
      });
      
      const result = project.toString();
      
      expect(result).toContain('Simple Project');
      expect(result).toContain('N/A');
      expect(result).toContain('Active');
    });
  });

  describe('Task Associations', () => {
    test('should add a task to the project', () => {
      const project = new Project({ name: 'Test Project' });
      const task = new Task({ description: 'Project task' });
      
      project.addTask(task);
      
      expect(project.tasks).toHaveLength(1);
      expect(project.tasks[0]).toBe(task);
      expect(task.project).toBe(project);
    });

    test('should not add the same task twice', () => {
      const project = new Project({ name: 'Test Project' });
      const task = new Task({ description: 'Project task' });
      
      project.addTask(task);
      project.addTask(task); // Add again
      
      expect(project.tasks).toHaveLength(1);
    });

    test('should get next action for project', () => {
      const project = new Project({ name: 'Test Project' });
      const task1 = new Task({ 
        description: 'Regular task',
        status: TaskStatus.PROJECT_TASK 
      });
      const task2 = new Task({ 
        description: 'Next action',
        status: TaskStatus.NEXT_ACTION 
      });
      
      project.addTask(task1);
      project.addTask(task2);
      task2.nextActionFor.push(project);
      
      const nextAction = project.getNextAction();
      
      expect(nextAction).toBe(task2);
    });

    test('should return null if no next action exists', () => {
      const project = new Project({ name: 'Test Project' });
      const task = new Task({ 
        description: 'Regular task',
        status: TaskStatus.PROJECT_TASK 
      });
      
      project.addTask(task);
      
      const nextAction = project.getNextAction();
      
      expect(nextAction).toBeNull();
    });
  });

  describe('Serialization and Deserialization', () => {
    test('should serialize to JSON correctly', () => {
      const date = new Date('2023-04-01T12:00:00.000Z');
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        outcome: 'Successful completion',
        status: 'Active',
        creationDate: date
      });
      
      const task1 = new Task({ id: 'task-1', description: 'Task 1' });
      const task2 = new Task({ id: 'task-2', description: 'Task 2' });
      
      project.addTask(task1);
      project.addTask(task2);
      
      const json = project.toJSON();
      
      expect(json.id).toBe('proj-1');
      expect(json.name).toBe('Test Project');
      expect(json.outcome).toBe('Successful completion');
      expect(json.tasks).toEqual(['task-1', 'task-2']);
      expect(json.status).toBe('Active');
      expect(json.creationDate).toBe(date.toISOString());
    });

    test('should deserialize from JSON correctly', () => {
      const task1 = new Task({ id: 'task-1', description: 'Task 1' });
      const task2 = new Task({ id: 'task-2', description: 'Task 2' });
      
      const tasksMap = new Map<string, Task>();
      tasksMap.set('task-1', task1);
      tasksMap.set('task-2', task2);
      
      const json = {
        id: 'proj-1',
        name: 'Test Project',
        outcome: 'Successful completion',
        tasks: ['task-1', 'task-2'],
        status: 'Active',
        creationDate: '2023-04-01T12:00:00.000Z'
      };
      
      const project = Project.fromJSON(json, tasksMap);
      
      expect(project.id).toBe('proj-1');
      expect(project.name).toBe('Test Project');
      expect(project.outcome).toBe('Successful completion');
      expect(project.tasks).toHaveLength(2);
      expect(project.tasks).toContain(task1);
      expect(project.tasks).toContain(task2);
      expect(project.status).toBe('Active');
      expect(project.creationDate.toISOString()).toBe('2023-04-01T12:00:00.000Z');
      
      // Verify bidirectional relationship
      expect(task1.project).toBe(project);
      expect(task2.project).toBe(project);
    });

    test('should handle missing tasks when deserializing', () => {
      const task1 = new Task({ id: 'task-1', description: 'Task 1' });
      
      const tasksMap = new Map<string, Task>();
      tasksMap.set('task-1', task1);
      
      const json = {
        id: 'proj-1',
        name: 'Test Project',
        tasks: ['task-1', 'task-2'], // task-2 doesn't exist in the map
        status: 'Active',
        creationDate: '2023-04-01T12:00:00.000Z'
      };
      
      const project = Project.fromJSON(json, tasksMap);
      
      expect(project.tasks).toHaveLength(1);
      expect(project.tasks[0]).toBe(task1);
    });
  });
}); 