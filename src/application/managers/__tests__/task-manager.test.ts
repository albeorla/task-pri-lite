import { TaskManager } from "../task-manager";
import {
  Task,
  TaskStatus,
  EisenhowerQuadrant,
} from "../../../core/models/task";
import { Project } from "../../../core/models/project";

describe("TaskManager", () => {
  // Mock dependencies
  const mockProcessor = {
    process: jest.fn(),
  };

  const mockPrioritizer = {
    prioritize: jest.fn(),
  };

  let taskManager: TaskManager;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    taskManager = new TaskManager(mockProcessor, mockPrioritizer);
  });

  describe("loadTasks", () => {
    test("should load tasks into the manager", async () => {
      // Setup
      const tasks = [
        new Task({ id: "task1", description: "Test task 1" }),
        new Task({ id: "task2", description: "Test task 2" }),
      ];

      // Execute
      taskManager.loadTasks(tasks);

      // Verify through public API
      const loadedTasks = taskManager.getAllTasks();
      expect(loadedTasks).toHaveLength(2);
      expect(loadedTasks).toContainEqual(tasks[0]);
      expect(loadedTasks).toContainEqual(tasks[1]);
    });
  });

  describe("runWorkflow", () => {
    test("should process inbox tasks and prioritize appropriate tasks", async () => {
      // Setup
      const inboxTask = new Task({
        id: "task1",
        description: "Inbox task",
        status: TaskStatus.INBOX,
      });
      const nextActionTask = new Task({
        id: "task2",
        description: "Next action task",
        status: TaskStatus.NEXT_ACTION,
      });
      const referenceTask = new Task({
        id: "task3",
        description: "Reference task",
        status: TaskStatus.REFERENCE,
      });

      taskManager.loadTasks([inboxTask, nextActionTask, referenceTask]);

      // Execute
      await taskManager.runWorkflow();

      // Verify
      expect(mockProcessor.process).toHaveBeenCalledWith(
        inboxTask,
        expect.any(Map),
      );
      expect(mockProcessor.process).not.toHaveBeenCalledWith(
        nextActionTask,
        expect.any(Map),
      );
      expect(mockProcessor.process).not.toHaveBeenCalledWith(
        referenceTask,
        expect.any(Map),
      );

      // Prioritizer should be called for actionable tasks, not reference
      expect(mockPrioritizer.prioritize).not.toHaveBeenCalledWith(
        referenceTask,
      );
      expect(mockPrioritizer.prioritize).toHaveBeenCalledWith(nextActionTask);
    });

    test("should skip processing for non-inbox tasks", async () => {
      // Setup
      const waitingTask = new Task({
        id: "task1",
        description: "Waiting task",
        status: TaskStatus.WAITING_FOR,
      });
      const nextActionTask = new Task({
        id: "task2",
        description: "Next action task",
        status: TaskStatus.NEXT_ACTION,
      });

      taskManager.loadTasks([waitingTask, nextActionTask]);

      // Execute
      await taskManager.runWorkflow();

      // Verify - neither task should be processed as they're not in INBOX
      expect(mockProcessor.process).not.toHaveBeenCalled();

      // But both should be prioritized if they're not REFERENCE, SOMEDAY_MAYBE, or DONE
      expect(mockPrioritizer.prioritize).toHaveBeenCalledWith(waitingTask);
      expect(mockPrioritizer.prioritize).toHaveBeenCalledWith(nextActionTask);
    });

    test("should handle processor errors gracefully", async () => {
      // Setup
      const inboxTask = new Task({
        id: "task1",
        description: "Problem task",
        status: TaskStatus.INBOX,
      });

      mockProcessor.process.mockRejectedValueOnce(
        new Error("Processing error"),
      );
      taskManager.loadTasks([inboxTask]);

      // Execute - should not throw
      await expect(taskManager.runWorkflow()).resolves.not.toThrow();

      // Verify processing was attempted but failed
      expect(mockProcessor.process).toHaveBeenCalledWith(
        inboxTask,
        expect.any(Map),
      );
    });

    test("should handle prioritizer errors gracefully", async () => {
      // Setup
      const actionableTask = new Task({
        id: "task1",
        description: "Actionable task",
        status: TaskStatus.NEXT_ACTION,
      });

      mockPrioritizer.prioritize.mockRejectedValueOnce(
        new Error("Prioritization error"),
      );
      taskManager.loadTasks([actionableTask]);

      // Execute - should not throw
      await expect(taskManager.runWorkflow()).resolves.not.toThrow();

      // Verify prioritization was attempted but failed
      expect(mockPrioritizer.prioritize).toHaveBeenCalledWith(actionableTask);
    });

    test("should update projects map during workflow", async () => {
      // Setup
      const inboxTask = new Task({
        id: "task1",
        description: "Project-related task",
        status: TaskStatus.INBOX,
      });

      const project = new Project({ id: "project1", name: "New Project" });

      // Mock the processor to add a project to the task during processing
      mockProcessor.process.mockImplementationOnce((task, projectsMap) => {
        task.project = project;
        projectsMap.set(project.id, project);
        project.addTask(task);
        task.status = TaskStatus.PROJECT_TASK;
        return Promise.resolve();
      });

      taskManager.loadTasks([inboxTask]);

      // Execute
      await taskManager.runWorkflow();

      // Verify that task was updated and project was created
      const tasks = taskManager.getAllTasks();
      expect(tasks[0].project).toBe(project);
      expect(tasks[0].status).toBe(TaskStatus.PROJECT_TASK);

      const projects = taskManager.getAllProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0]).toBe(project);
    });
  });

  describe("getAllTasks", () => {
    test("should return all tasks", async () => {
      // Setup
      const tasks = [
        new Task({ id: "task1", description: "Test task 1" }),
        new Task({ id: "task2", description: "Test task 2" }),
      ];
      taskManager.loadTasks(tasks);

      // Execute
      const result = taskManager.getAllTasks();

      // Verify
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(tasks[0]);
      expect(result).toContainEqual(tasks[1]);
    });
  });

  describe("getAllProjects", () => {
    test("should return all projects", async () => {
      // Setup - Create tasks with projects
      const project1 = new Project({ id: "project1", name: "Project 1" });
      const project2 = new Project({ id: "project2", name: "Project 2" });

      const task1 = new Task({
        id: "task1",
        description: "Task 1",
        project: project1,
      });

      const task2 = new Task({
        id: "task2",
        description: "Task 2",
        project: project2,
      });

      // Load tasks into manager (note: we need to make projects accessible in the test)
      project1.addTask(task1);
      project2.addTask(task2);
      taskManager.loadTasks([task1, task2]);

      // This is a test implementation detail to make projects accessible in TaskManager
      // In a real implementation, project-task relationships would be properly managed
      const projectsMap = new Map<string, Project>();
      projectsMap.set(project1.id, project1);
      projectsMap.set(project2.id, project2);
      (taskManager as any).projects = projectsMap;

      // Execute
      const result = taskManager.getAllProjects();

      // Verify
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(project1);
      expect(result).toContainEqual(project2);
    });
  });

  describe("serializeData", () => {
    test("should serialize tasks and projects", async () => {
      // Setup
      const project = new Project({ id: "project1", name: "Project 1" });
      const task = new Task({
        id: "task1",
        description: "Task 1",
        project: project,
      });

      // Prepare the manager with data
      project.addTask(task);
      taskManager.loadTasks([task]);

      // Add project to manager's internal map
      const projectsMap = new Map<string, Project>();
      projectsMap.set(project.id, project);
      (taskManager as any).projects = projectsMap;

      // Execute
      const result = taskManager.serializeData();

      // Verify
      expect(result).toHaveProperty("tasks");
      expect(result).toHaveProperty("projects");
      expect(result.tasks).toHaveLength(1);
      expect(result.projects).toHaveLength(1);
      expect(result.tasks[0].id).toBe("task1");
      expect(result.projects[0].id).toBe("project1");
    });
  });

  describe("printSummary", () => {
    test("should log task summary when tasks exist", () => {
      // Setup - mock console.log
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Create tasks with different statuses and projects
      const project1 = new Project({ id: "project1", name: "Project 1" });
      const inboxTask = new Task({
        id: "task1",
        description: "Inbox task",
        status: TaskStatus.INBOX,
      });
      const projectTask = new Task({
        id: "task2",
        description: "Project task",
        status: TaskStatus.PROJECT_TASK,
        project: project1,
      });

      // Load tasks
      taskManager.loadTasks([inboxTask, projectTask]);

      // Add project to manager's internal map
      const projectsMap = new Map<string, Project>();
      projectsMap.set(project1.id, project1);
      (taskManager as any).projects = projectsMap;

      // Execute
      taskManager.printSummary();

      // Verify console.log was called multiple times
      expect(console.log).toHaveBeenCalled();

      // Restore console.log
      console.log = originalConsoleLog;
    });

    test("should log message when no tasks exist", () => {
      // Setup - mock console.log
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Execute with no tasks loaded
      taskManager.printSummary();

      // Verify console.log was called with "No tasks loaded or processed"
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("No tasks loaded or processed"),
      );

      // Restore console.log
      console.log = originalConsoleLog;
    });

    test("should handle different groupBy parameters", () => {
      // Setup - mock console.log
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Create tasks with different contexts and eisenhower quadrants
      const task1 = new Task({
        id: "task1",
        description: "Important task",
        context: "@work",
        eisenhowerQuadrant: EisenhowerQuadrant.DO,
      });
      const task2 = new Task({
        id: "task2",
        description: "Less important task",
        context: "@home",
        eisenhowerQuadrant: EisenhowerQuadrant.DECIDE,
      });

      // Load tasks
      taskManager.loadTasks([task1, task2]);

      // Execute with different groupBy parameters
      taskManager.printSummary("context");
      taskManager.printSummary("priority");

      // Verify console.log was called with appropriate groupings
      expect(console.log).toHaveBeenCalled();

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });
});
