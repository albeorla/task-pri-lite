/**
 * Integration Tests for Multiple Components
 *
 * These tests verify how different components interact with each other
 */

import {
  InputProcessingService,
  OutputHandlingService,
  InputProcessingOrchestrator,
} from "../orchestration-services-impl";

import { TaskDetectionProcessor } from "../../processors/core-processors";
import {
  TextInputItem,
  ManualTaskInputItem,
} from "../../inputs/basic-input-items";
import { InputSource } from "../../core/types/enums";
import { Task, TaskStatus, EisenhowerQuadrant } from "../../core/models/task";
import { Project } from "../../core/models/project";
import { TaskManager } from "../../application/managers/task-manager";
import { GTDClarificationProcessor } from "../../application/processors/gtd-processor";
import { EisenhowerPrioritizer } from "../../application/processors/eisenhower-prioritizer";

describe("Integration Tests", () => {
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

  describe("Input Processing Pipeline", () => {
    test("should process text input through all pipeline stages", async () => {
      // Setup the components
      const inputService = new InputProcessingService();
      const outputService = new OutputHandlingService();

      // Mock the output handler's handle method to capture the output
      const mockHandleMethod = jest.fn().mockResolvedValue(undefined);
      const originalHandlers = (outputService as any).handlers;

      // Add a spy to the first handler to intercept handling
      if (originalHandlers.length > 0) {
        originalHandlers[0].handle = mockHandleMethod;
      }

      // Setup the orchestrator
      const orchestrator = new InputProcessingOrchestrator(
        inputService,
        outputService,
      );

      // Create a test input
      const textInput = new TextInputItem(
        "Complete project report\nThis is a high priority task due by next week.",
      );

      // Process the input through the entire pipeline
      await orchestrator.processAndHandle(textInput);

      // Verify the input was processed and output was handled
      expect(mockHandleMethod).toHaveBeenCalled();

      // Check the processed item passed to the handler
      const processedItem = mockHandleMethod.mock.calls[0][0];
      expect(processedItem.originalInput).toBe(textInput);
      expect(processedItem.extractedData.title).toBe("Complete project report");
      expect(processedItem.extractedData.description).toContain(
        "high priority task",
      );

      // The due date should be set to next week
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      if (processedItem.extractedData.dueDate) {
        const dueDate = new Date(processedItem.extractedData.dueDate);
        // Just compare the date part (ignore time differences)
        expect(dueDate.toDateString()).toBe(nextWeek.toDateString());
      }
    });
  });

  describe("TaskManager with Processors", () => {
    test("should process tasks using GTD processor and Eisenhower prioritizer", async () => {
      // Create the processors
      const gtdProcessor = new GTDClarificationProcessor();
      const eisenhowerPrioritizer = new EisenhowerPrioritizer();

      // Create the task manager
      const taskManager = new TaskManager(gtdProcessor, eisenhowerPrioritizer);

      // Create test tasks - to have the prioritizer called, we need to change the status to something other than INBOX
      const nextActionTask = new Task({
        id: "task1",
        description: "Write project report",
        status: TaskStatus.NEXT_ACTION,
      });

      // Load tasks into manager
      taskManager.loadTasks([nextActionTask]);

      // Spy on the processors
      const processSpy = jest.spyOn(gtdProcessor, "process");
      const prioritizeSpy = jest.spyOn(eisenhowerPrioritizer, "prioritize");

      // Run the workflow
      await taskManager.runWorkflow();

      // Verify both processors were called
      expect(processSpy).not.toHaveBeenCalled(); // No INBOX tasks to process
      expect(prioritizeSpy).toHaveBeenCalled(); // But NEXT_ACTION tasks should be prioritized
    });

    test("should handle complete workflow with projects and tasks", async () => {
      // Mock processors
      const mockProcessor = {
        process: jest.fn().mockImplementation((task, projectsMap) => {
          // Simulate GTD processing by setting task properties
          if (task.status === TaskStatus.INBOX) {
            // Create or get project based on task description
            let project;
            const projectName = "Test Project";
            if (!projectsMap.has(projectName)) {
              project = new Project({ id: "project1", name: projectName });
              projectsMap.set(projectName, project);
            } else {
              project = projectsMap.get(projectName);
            }

            // Update task
            task.project = project;
            task.status = TaskStatus.NEXT_ACTION;
            project.addTask(task);
          }
          return Promise.resolve();
        }),
      };

      const mockPrioritizer = {
        prioritize: jest.fn().mockImplementation((task) => {
          // Simulate Eisenhower prioritization
          if (
            task.description.includes("urgent") &&
            task.description.includes("important")
          ) {
            task.eisenhowerQuadrant = EisenhowerQuadrant.DO;
          } else if (task.description.includes("urgent")) {
            task.eisenhowerQuadrant = EisenhowerQuadrant.DELEGATE;
          } else if (task.description.includes("important")) {
            task.eisenhowerQuadrant = EisenhowerQuadrant.DECIDE;
          } else {
            task.eisenhowerQuadrant = EisenhowerQuadrant.DELETE;
          }
          return Promise.resolve();
        }),
      };

      // Create the task manager with mocks
      const taskManager = new TaskManager(mockProcessor, mockPrioritizer);

      // Create test tasks
      const inboxTask1 = new Task({
        id: "task1",
        description: "Write urgent and important report",
        status: TaskStatus.INBOX,
      });

      const inboxTask2 = new Task({
        id: "task2",
        description: "Review important documentation",
        status: TaskStatus.INBOX,
      });

      // Load tasks into manager
      taskManager.loadTasks([inboxTask1, inboxTask2]);

      // Run the workflow
      await taskManager.runWorkflow();

      // Verify the result
      const tasks = taskManager.getAllTasks();
      expect(tasks).toHaveLength(2);

      // Both tasks should now be NEXT_ACTION and have projects
      tasks.forEach((task) => {
        expect(task.status).toBe(TaskStatus.NEXT_ACTION);
        expect(task.project).not.toBeNull();
      });

      // Tasks should have appropriate Eisenhower quadrants
      const urgentImportantTask = tasks.find((t) => t.id === "task1");
      const importantTask = tasks.find((t) => t.id === "task2");

      expect(urgentImportantTask?.eisenhowerQuadrant).toBe(
        EisenhowerQuadrant.DO,
      );
      expect(importantTask?.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DECIDE);

      // Verify that projects were created
      const projects = taskManager.getAllProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Test Project");

      // Verify project has the tasks
      expect(projects[0].tasks).toHaveLength(2);
    });
  });

  describe("End-to-End Processing", () => {
    test("should process input from text to completed task", async () => {
      // Create a task detection processor
      const taskProcessor = new TaskDetectionProcessor();

      // Create a text input
      const textInput = new TextInputItem(
        "Buy groceries\nPriority: high\nDue by tomorrow: milk, eggs, bread",
      );

      // Process the input to get a processed item
      const processedItem = taskProcessor.process(textInput);

      // Verify the processed item has the right properties
      expect(processedItem.extractedData.title).toBe("Buy groceries");
      expect(processedItem.extractedData.priority).toBe(1); // High priority

      // The processed item can now be used to create a Task
      const task = new Task({
        description: processedItem.extractedData.title,
        dueDate: processedItem.extractedData.dueDate,
        notes: processedItem.extractedData.description,
      });

      // Create GTD processor and Eisenhower prioritizer
      const gtdProcessor = new GTDClarificationProcessor();
      const eisenhowerPrioritizer = new EisenhowerPrioritizer();

      // Create task manager and load the task
      const taskManager = new TaskManager(gtdProcessor, eisenhowerPrioritizer);
      taskManager.loadTasks([task]);

      // Mock the processor and prioritizer
      jest
        .spyOn(gtdProcessor, "process")
        .mockImplementation((task, projectsMap) => {
          task.status = TaskStatus.NEXT_ACTION;
          task.isActionable = true;
          return Promise.resolve();
        });

      jest
        .spyOn(eisenhowerPrioritizer, "prioritize")
        .mockImplementation((task) => {
          task.eisenhowerQuadrant = EisenhowerQuadrant.DO;
          return Promise.resolve();
        });

      // Run the workflow
      await taskManager.runWorkflow();

      // Verify the task was processed correctly
      const processedTask = taskManager.getAllTasks()[0];
      expect(processedTask.status).toBe(TaskStatus.NEXT_ACTION);
      expect(processedTask.isActionable).toBe(true);
      expect(processedTask.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO);
    });
  });
});
