/**
 * Direct tests for the TaskStore module
 *
 * These tests directly import and test the actual singleton taskStore instance,
 * ensuring we get proper code coverage metrics.
 */

import * as fs from "fs";
import * as path from "path";
import { taskStore, TaskItem } from "../task-store";
import {
  ItemNature,
  InputSource,
  DestinationType,
} from "../../core/types/enums";
import { IProcessedItem, IInputItem } from "../../core/interfaces";

// Use a dedicated test output path for these direct tests
const TEST_OUTPUT_PATH = path.join(
  process.cwd(),
  "test-output/direct-task-store",
);
const TEST_FILE_PATH = path.join(TEST_OUTPUT_PATH, "tasks.json");

// Helper to create a mock IProcessedItem
const createMockProcessedItem = (
  title: string = "Test Task",
  description: string = "Test Description",
  dueDate: Date | null = new Date("2023-12-31"),
  priority: number = 1,
): IProcessedItem => {
  const mockInputItem: IInputItem = {
    source: InputSource.MANUAL_ENTRY,
    rawContent: "Raw content",
    timestamp: new Date(),
    getPotentialNature: () => ItemNature.ACTIONABLE_TASK,
  };

  return {
    originalInput: mockInputItem,
    determinedNature: ItemNature.ACTIONABLE_TASK,
    extractedData: {
      title,
      description,
      dueDate,
      priority,
    },
    suggestedDestination: DestinationType.TODOIST,
  };
};

// Helper to create a TaskItem directly
const createTaskItem = (
  id: string = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  title: string = "Test Task",
  description: string = "Test Description",
  dueDate: Date | null = new Date("2023-12-31"),
  priority: number = 1,
  completed: boolean = false,
): TaskItem => ({
  id,
  title,
  description,
  dueDate,
  priority,
  completed,
  labels: [],
});

describe("TaskStore Direct Tests", () => {
  // Set up test directory and clean any existing files
  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_OUTPUT_PATH)) {
      fs.mkdirSync(TEST_OUTPUT_PATH, { recursive: true });
    }

    // Monitor console.error calls
    jest.spyOn(console, "error").mockImplementation();
  });

  // Clean up between tests
  beforeEach(() => {
    // Clear any existing tasks
    taskStore.clear();
  });

  // Clean up after all tests
  afterAll(() => {
    // Restore console mocks
    jest.restoreAllMocks();

    // Remove the test directory
    if (fs.existsSync(TEST_OUTPUT_PATH)) {
      fs.rmSync(TEST_OUTPUT_PATH, { recursive: true, force: true });
    }
  });

  describe("Basic functionality", () => {
    test("should add and retrieve tasks", () => {
      // Add a task
      const task = createTaskItem("direct-test-task");
      taskStore.addTask(task);

      // Verify it was added
      const allTasks = taskStore.getAllTasks();
      expect(allTasks.length).toBe(1);
      expect(allTasks[0].id).toBe("direct-test-task");

      // Retrieve by ID
      const retrievedTask = taskStore.getTaskById("direct-test-task");
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.title).toBe("Test Task");
    });

    test("should handle non-existent task IDs", () => {
      // Get a non-existent task
      const nonExistentTask = taskStore.getTaskById("non-existent-task");
      expect(nonExistentTask).toBeUndefined();
    });

    test("should update tasks", () => {
      // Add a task
      const task = createTaskItem("update-test-task");
      taskStore.addTask(task);

      // Update the task
      const updatedTask = {
        ...task,
        title: "Updated Title",
        description: "Updated Description",
      };
      taskStore.updateTask(updatedTask);

      // Verify it was updated
      const retrievedTask = taskStore.getTaskById("update-test-task");
      expect(retrievedTask?.title).toBe("Updated Title");
      expect(retrievedTask?.description).toBe("Updated Description");
    });

    test("should ignore updates for non-existent tasks", () => {
      // Create a task that doesn't exist in the store
      const nonExistentTask = createTaskItem("non-existent-task");

      // Try to update it
      taskStore.updateTask(nonExistentTask);

      // Verify the store is still empty
      expect(taskStore.getAllTasks().length).toBe(0);
    });

    test("should mark tasks as completed", () => {
      // Add a task
      const task = createTaskItem("complete-test-task");
      taskStore.addTask(task);

      // Complete the task
      taskStore.completeTask("complete-test-task");

      // Verify it was marked as completed
      const completedTask = taskStore.getTaskById("complete-test-task");
      expect(completedTask?.completed).toBe(true);
    });

    test("should create tasks from processed items", () => {
      // Create a processed item
      const processedItem = createMockProcessedItem("Processed Task");

      // Add task from processed item
      const task = taskStore.addFromProcessedItem(processedItem);

      // Verify task was created with correct properties
      expect(task.title).toBe("Processed Task");
      expect(task.description).toBe("Test Description");
      expect(task.completed).toBe(false);

      // Verify it was added to the store
      const allTasks = taskStore.getAllTasks();
      expect(allTasks.length).toBe(1);
      expect(allTasks[0].id).toBe(task.id);
    });

    test("should clear all tasks", () => {
      // Add multiple tasks
      taskStore.addTask(createTaskItem("task1"));
      taskStore.addTask(createTaskItem("task2"));

      // Verify tasks were added
      expect(taskStore.getAllTasks().length).toBe(2);

      // Clear all tasks
      taskStore.clear();

      // Verify all tasks were removed
      expect(taskStore.getAllTasks().length).toBe(0);
    });
  });
});
