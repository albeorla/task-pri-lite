import { GTDClarificationProcessor } from '../gtd-processor';
import { Task, TaskStatus } from '../../../core/models/task';
import { Project } from '../../../core/models/project';

describe('GTDClarificationProcessor', () => {
  // Mock console methods to prevent test output noise
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('without LLM service', () => {
    let processor: GTDClarificationProcessor;
    
    beforeEach(() => {
      processor = new GTDClarificationProcessor();
    });
    
    test('should skip processing for non-inbox tasks', async () => {
      // Setup
      const task = new Task({
        id: '1',
        description: 'Test task',
        status: TaskStatus.NEXT_ACTION
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Verify - Status should remain unchanged
      expect(task.status).toBe(TaskStatus.NEXT_ACTION);
    });
    
    test('should mark inbox task as REFERENCE when no LLM available', async () => {
      // Setup
      const task = new Task({
        id: '1',
        description: 'Test inbox task',
        status: TaskStatus.INBOX
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Verify
      expect(task.status).toBe(TaskStatus.REFERENCE);
      expect(task.isActionable).toBe(false);
    });
  });
  
  describe('with LLM service', () => {
    let processor: GTDClarificationProcessor;
    const mockLLMService = {
      getClarification: jest.fn(),
      getNextActionSuggestion: jest.fn()
    };
    
    beforeEach(() => {
      jest.clearAllMocks();
      processor = new GTDClarificationProcessor(mockLLMService as any);
    });
    
    test('should process non-actionable item as reference material', async () => {
      // Setup
      mockLLMService.getClarification.mockResolvedValue({
        actionable: false,
        is_project: false,
        outcome: null,
        rationale: 'This is reference material'
      });
      
      const task = new Task({
        id: '1',
        description: 'Interesting article about programming',
        status: TaskStatus.INBOX
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Verify
      expect(mockLLMService.getClarification).toHaveBeenCalledWith(task.description);
      expect(task.isActionable).toBe(false);
      expect(task.status).toBe(TaskStatus.REFERENCE);
    });
    
    test('should process non-actionable item as someday/maybe', async () => {
      // Setup
      mockLLMService.getClarification.mockResolvedValue({
        actionable: false,
        is_project: false,
        outcome: null,
        rationale: 'This is a someday maybe item to consider later'
      });
      
      const task = new Task({
        id: '1',
        description: 'Consider learning a new language',
        status: TaskStatus.INBOX
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Verify
      expect(task.isActionable).toBe(false);
      expect(task.status).toBe(TaskStatus.SOMEDAY_MAYBE);
    });
    
    test('should process single action task', async () => {
      // Setup
      mockLLMService.getClarification.mockResolvedValue({
        actionable: true,
        is_project: false,
        outcome: null,
        rationale: 'This is a single actionable item'
      });
      
      const task = new Task({
        id: '1',
        description: 'Call John about the meeting',
        status: TaskStatus.INBOX
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Verify
      expect(task.isActionable).toBe(true);
      expect(task.status).toBe(TaskStatus.NEXT_ACTION);
      expect(task.context).toBe('@calls'); // Should assign context based on keywords
    });
    
    test('should process project task and create a new project', async () => {
      // Setup
      mockLLMService.getClarification.mockResolvedValue({
        actionable: true,
        is_project: true,
        outcome: 'Complete redesign of website',
        rationale: 'This requires multiple steps and planning'
      });
      
      mockLLMService.getNextActionSuggestion.mockResolvedValue(
        'Create wireframes for homepage'
      );
      
      const task = new Task({
        id: '1',
        description: 'Website redesign project',
        status: TaskStatus.INBOX
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Verify
      expect(task.isActionable).toBe(true);
      expect(task.status).toBe(TaskStatus.PROJECT_TASK);
      
      // Should have created a new project
      expect(projects.size).toBe(1);
      
      // Check that a project was created with the task description
      const projectEntries = Array.from(projects.entries());
      expect(projectEntries[0][0].substring(0, 20)).toBe('Website redesign pro');
      
      const project = projectEntries[0][1];
      expect(project.outcome).toBe('Complete redesign of website');
      
      // Should have asked for next action suggestion
      expect(mockLLMService.getNextActionSuggestion).toHaveBeenCalledWith(
        project.name,
        project.outcome
      );
      
      // Should have at least 2 tasks: the original one and the next action
      expect(project.tasks.length).toBeGreaterThanOrEqual(2);
      
      // One of the tasks should be a next action
      const nextAction = project.tasks.find(t => t.status === TaskStatus.NEXT_ACTION);
      expect(nextAction).toBeDefined();
      expect(nextAction?.description).toBe('Create wireframes for homepage');
      expect(nextAction?.nextActionFor).toContainEqual(project);
    });
    
    test('should handle errors in LLM response gracefully', async () => {
      // Setup
      mockLLMService.getClarification.mockResolvedValue(null);
      
      const task = new Task({
        id: '1',
        description: 'Task with problematic description',
        status: TaskStatus.INBOX
      });
      const projects = new Map<string, Project>();
      
      // Execute
      await processor.process(task, projects);
      
      // Even with errors, should complete without throwing
      expect(task.status).not.toBe(TaskStatus.INBOX); // Status should have changed
    });
  });
}); 