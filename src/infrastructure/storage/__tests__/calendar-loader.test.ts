/**
 * Tests for GoogleCalendarLoader
 */

import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GoogleCalendarLoader } from "../calendar-loader";
import _path from "path";

// Mock fs and validator modules
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

jest.mock("../schema-validator", () => ({
  validateFile: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// Import mocked modules
import { validateFile } from "../schema-validator";

describe("GoogleCalendarLoader", () => {
  // Test data
  const mockEventsData = [
    {
      id: "event1",
      summary: "Test Event 1",
      description: "Description for Test Event 1",
      status: "confirmed",
      start: {
        dateTime: "2025-04-10T10:00:00Z",
      },
      end: {
        dateTime: "2025-04-10T11:00:00Z",
      },
      created: "2025-04-03T17:20:46.055102Z",
      updated: "2025-04-03T17:20:46.055102Z",
      iCalUID: "ical123",
      sequence: 0,
    },
    {
      id: "event2",
      summary: "Test Event 2",
      status: "confirmed",
      start: {
        date: "2025-04-15",
      },
      end: {
        date: "2025-04-16",
      },
      created: "2025-04-03T17:20:46.055102Z",
      updated: "2025-04-03T17:20:46.055102Z",
      iCalUID: "ical456",
      sequence: 0,
    },
  ];

  const mockTasksData = [
    {
      id: "task1",
      title: "Test Task 1",
      notes: "Description for Test Task 1",
      due: "2025-04-10",
      status: "needsAction",
      priority: 3,
      created: "2025-04-03T17:20:46.055102Z",
      updated: "2025-04-03T17:20:46.055102Z",
    },
    {
      id: "task2",
      title: "Test Task 2",
      status: "completed",
      priority: 2,
      created: "2025-04-03T17:20:46.055102Z",
      updated: "2025-04-03T17:20:46.055102Z",
    },
  ];

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the readFile implementation for events
    (fs.promises.readFile as jest.Mock).mockImplementation((path) => {
      if (path.includes("events")) {
        return Promise.resolve(JSON.stringify(mockEventsData));
      } else if (path.includes("tasks")) {
        return Promise.resolve(JSON.stringify(mockTasksData));
      }
      return Promise.reject(new Error("Unknown file"));
    });
  });

  it("should create a GoogleCalendarLoader instance with the default file paths", () => {
    const loader = new GoogleCalendarLoader();
    expect(loader).toBeInstanceOf(GoogleCalendarLoader);
  });

  it("should create a GoogleCalendarLoader instance with custom file paths", () => {
    const eventsPath = "/custom/path/calendar_events.json";
    const tasksPath = "/custom/path/calendar_tasks.json";
    const loader = new GoogleCalendarLoader(eventsPath, tasksPath);
    expect(loader).toBeInstanceOf(GoogleCalendarLoader);
  });

  it("should validate files before loading data", async () => {
    const loader = new GoogleCalendarLoader(
      "/test/events.json",
      "/test/tasks.json",
    );
    await loader.loadEventsData();
    await loader.loadTasksData();

    expect(validateFile).toHaveBeenCalledWith(
      "/test/events.json",
      "calendar_schema",
    );
  });

  it("should throw an error if events validation fails", async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({
      valid: false,
      errors: ["Test error"],
    });
    const loader = new GoogleCalendarLoader();

    await expect(loader.loadEventsData()).rejects.toThrow(
      "Calendar events validation failed: Test error",
    );
  });

  it("should handle tasks file not existing", async () => {
    // Mock existsSync for this test only
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    const loader = new GoogleCalendarLoader();

    const result = await loader.loadTasksData();
    expect(result).toEqual([]);
  });

  it("should load and parse events data from file", async () => {
    const loader = new GoogleCalendarLoader();
    const data = await loader.loadEventsData();

    expect(fs.promises.readFile).toHaveBeenCalled();
    expect(data).toEqual(mockEventsData);
  });

  it("should load and parse tasks data from file", async () => {
    const loader = new GoogleCalendarLoader();
    const data = await loader.loadTasksData();

    expect(fs.promises.readFile).toHaveBeenCalled();
    expect(data).toEqual(mockTasksData);
  });

  it("should throw an error if file reading fails", async () => {
    (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
      new Error("File read error"),
    );
    const loader = new GoogleCalendarLoader();

    await expect(loader.loadEventsData()).rejects.toThrow(
      "Error loading calendar events data: File read error",
    );
  });

  it("should map Calendar data to core domain Tasks", async () => {
    const loader = new GoogleCalendarLoader();
    const result = await loader.load();

    // Check that we got tasks
    expect(result).toHaveProperty("tasks");

    // Check that we have the correct number of tasks
    // 2 from events + 2 from tasks = 4 tasks
    expect(result.tasks.length).toBe(4);

    // Check that the first task is properly mapped
    const firstTask = result.tasks[0];
    expect(firstTask.description).toBe("Test Event 1");
    expect(firstTask.dueDate).toBeInstanceOf(Date);
  });

  it("should handle empty data", async () => {
    (fs.promises.readFile as jest.Mock).mockImplementation(() =>
      Promise.resolve("[]"),
    );

    const loader = new GoogleCalendarLoader();
    const result = await loader.load();

    expect(result.tasks.length).toBe(0);
  });
});
