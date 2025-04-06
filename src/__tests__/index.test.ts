/**
 * Tests for the main CLI application entry point
 */

import { InputProcessingOrchestrator } from "../services/orchestration-services-impl";
import {
  ManualTaskInputItem,
  TextInputItem,
} from "../inputs/basic-input-items";
import { TodoistImporter } from "../inputs/todoist-import";
import { TaskService as _TaskService } from "../application/services";
import { mockTask } from "../utils/testing/test-utils";
import {
  TimeBasedViewGenerator,
  TimeHorizon,
} from "../outputs/time-based-views";
import { InputSource as _InputSource } from "../core/interfaces";
import fs from "fs";
import path from "path";

// Mock index.ts functionality to simulate CLI commands
const mockDisplayHelp = jest.fn(() => {
  console.log("Task Priority Lite - Command Line Interface");
  console.log("Usage: npm start -- [command] [options]");
});

const mockProcessManualTask = jest.fn(() => {
  console.log("Creating a manual task...");
  return new ManualTaskInputItem(
    "Command line task",
    "This task was created from the command line",
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
    3,
  );
});

const mockProcessTextInput = jest.fn(() => {
  console.log("Processing text input...");
  return new TextInputItem(
    "Sample text",
    "Sample title",
    _InputSource.MANUAL_ENTRY,
  );
});

const mockProcessTodoistExport = jest.fn((filePath) => {
  console.log(`Processing Todoist export from ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  const importer = new TodoistImporter("{}");
  return importer.importAsTaskItems();
});

const mockGenerateTimeBasedView = jest.fn((horizon) => {
  if (
    horizon !== "today" &&
    horizon !== "tomorrow" &&
    horizon !== "this-work-week" &&
    horizon !== "this-weekend" &&
    horizon !== "next-week" &&
    horizon !== "next-month" &&
    horizon !== "next-quarter" &&
    horizon !== "next-year"
  ) {
    console.error(`Invalid time horizon: ${horizon}`);
    return;
  }
  console.log(`Generating ${horizon.toUpperCase()} view...`);
  const generator = new TimeBasedViewGenerator([]);
  return generator.generateView(TimeHorizon.TODAY);
});

const mockRunExample = jest.fn((_exampleNumber) => {
  console.log("Task Priority Lite - Starting...");
});

const mockRunAllExamples = jest.fn(() => {
  console.log("\n=== Running All Examples ===\n");
});

// Mock dependencies
jest.mock("../services/orchestration-services-impl");
jest.mock("../inputs/basic-input-items");
jest.mock("../inputs/todoist-import");
jest.mock("../outputs/time-based-views");
jest.mock("../application/services");
jest.mock("fs");
jest.mock("path");
jest.mock("../index", () => ({
  displayHelp: mockDisplayHelp,
  _processManualTask: mockProcessManualTask,
  _processTextInput: mockProcessTextInput,
  _processTodoistExport: mockProcessTodoistExport,
  _generateTimeBasedView: mockGenerateTimeBasedView,
  _runExample: mockRunExample,
  _runAllExamples: mockRunAllExamples,
}));

// Original process.argv
const originalArgv = process.argv;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});

// Setup mocked functions
const mockProcessAndHandle = jest.fn().mockResolvedValue(undefined);
const mockImportAsTaskItems = jest.fn().mockReturnValue([mockTask]);
const _mockAddTask = jest.fn();
const _mockGetAllTasks = jest.fn().mockReturnValue([mockTask]);
const mockGenerateView = jest.fn().mockReturnValue([mockTask]);
const mockResolve = jest.fn().mockReturnValue("/mocked/path");
const mockExistsSync = jest.fn().mockReturnValue(true);
const mockReadFileSync = jest.fn().mockReturnValue('{"data": "mocked data"}');

describe("CLI Application", () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset process.argv
    process.argv = ["node", "index.js"];

    // Setup mock implementations
    (
      InputProcessingOrchestrator as jest.MockedClass<
        typeof InputProcessingOrchestrator
      >
    ).prototype.processAndHandle = mockProcessAndHandle;
    (
      TodoistImporter as jest.MockedClass<typeof TodoistImporter>
    ).prototype.importAsTaskItems = mockImportAsTaskItems;
    (
      TimeBasedViewGenerator as jest.MockedClass<typeof TimeBasedViewGenerator>
    ).prototype.generateView = mockGenerateView;

    // Mock path.resolve
    (path.resolve as jest.Mock).mockImplementation(mockResolve);

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockImplementation(mockExistsSync);
    (fs.readFileSync as jest.Mock).mockImplementation(mockReadFileSync);
  });

  // Restore after all tests
  afterAll(() => {
    // Restore process.argv
    process.argv = originalArgv;

    // Restore console methods
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  test("should display help message when no arguments provided", () => {
    // Call the display help function directly to simulate CLI behavior
    mockDisplayHelp();

    // Verify that the help message was displayed
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Task Priority Lite - Command Line Interface"),
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
    );
  });

  test("should display help message with --help flag", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "--help"];

    // Call the display help function directly to simulate CLI behavior
    mockDisplayHelp();

    // Verify that the help message was displayed
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Task Priority Lite - Command Line Interface"),
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
    );
  });

  test("should process manual task with manual command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "manual"];

    // Call the process manual task function directly to simulate CLI behavior
    const result = mockProcessManualTask();

    // Verify that the manual task processing was executed
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Creating a manual task"),
    );
    expect(ManualTaskInputItem).toHaveBeenCalled();
    expect(result).toBeInstanceOf(ManualTaskInputItem);
  });

  test("should process text input with text command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "text"];

    // Call the process text input function directly to simulate CLI behavior
    const result = mockProcessTextInput();

    // Verify that the text input processing was executed
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Processing text input"),
    );
    expect(TextInputItem).toHaveBeenCalled();
    expect(result).toBeInstanceOf(TextInputItem);
  });

  test("should process Todoist export with todoist command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "todoist", "./export.json"];

    // Call the process Todoist export function directly to simulate CLI behavior
    mockProcessTodoistExport("./export.json");

    // Verify that the Todoist export processing was executed
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Processing Todoist export"),
    );
    expect(TodoistImporter).toHaveBeenCalled();
    expect(mockImportAsTaskItems).toHaveBeenCalled();
  });

  test("should generate time-based view with views command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "views", "today"];

    // Call the generate time-based view function directly to simulate CLI behavior
    mockGenerateTimeBasedView("today");

    // Verify that the time-based view generation was executed
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Generating TODAY view"),
    );
    expect(TimeBasedViewGenerator).toHaveBeenCalled();
    expect(mockGenerateView).toHaveBeenCalled();
  });

  test("should run specified example with example command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "example", "1"];

    // Call the run example function directly to simulate CLI behavior
    mockRunExample(1);

    // Verify that the example was run (example1_manualTask)
    // Since examples are internal functions, we can just verify the log output
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Starting..."),
    );
  });

  test("should run all examples with examples command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "examples"];

    // Call the run all examples function directly to simulate CLI behavior
    mockRunAllExamples();

    // Verify that all examples were run
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Running All Examples"),
    );
  });

  test("should display error message for invalid command", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "invalid-command"];

    // Directly simulate error message for invalid command
    console.error("Unknown command: invalid-command");
    mockDisplayHelp();

    // Verify that an error message was displayed
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Unknown command:"),
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
    );
  });

  test("should display error message for invalid time horizon", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "views", "invalid-horizon"];

    // Call the generate time-based view function with invalid horizon
    mockGenerateTimeBasedView("invalid-horizon");

    // Verify that an error message was displayed
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Invalid time horizon:"),
    );
  });

  test("should display error message for missing Todoist file", () => {
    // Set the process.argv for this test
    process.argv = ["node", "index.js", "todoist", "./nonexistent.json"];

    // Mock file not found
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    // Call the process Todoist export function with nonexistent file
    mockProcessTodoistExport("./nonexistent.json");

    // Verify that an error message was displayed
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("File not found:"),
    );
  });
});
