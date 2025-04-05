/**
 * Unit tests for ExternalDataSourceService
 */

import { ExternalDataSourceService } from "../external-data-source";
import { TodoistLoader } from "../todoist-loader";
import { GoogleCalendarLoader } from "../calendar-loader";
import { Task } from "../../../core/models/task";
import { Project } from "../../../core/models/project";

// Mock the loaders
jest.mock("../todoist-loader");
jest.mock("../calendar-loader");

describe("ExternalDataSourceService", () => {
  // Test data
  const mockTasks: Task[] = [
    new Task({
      id: "task1",
      description: "Task 1",
      status: "active" as any,
      creationDate: new Date(),
    }),
    new Task({
      id: "task2",
      description: "Task 2",
      status: "active" as any,
      creationDate: new Date(),
    }),
  ];

  const mockProjects: Project[] = [
    new Project({
      id: "project1",
      name: "Project 1",
      status: "active",
      creationDate: new Date(),
    }),
  ];

  // Mock the TodoistLoader implementation
  const mockTodoistLoad = jest.fn().mockResolvedValue({
    tasks: [mockTasks[0]],
    projects: mockProjects,
  });

  // Mock the GoogleCalendarLoader implementation
  const mockCalendarLoad = jest.fn().mockResolvedValue({
    tasks: [mockTasks[1]],
    projects: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up loader mocks
    (TodoistLoader as jest.Mock).mockImplementation(() => ({
      load: mockTodoistLoad,
    }));

    (GoogleCalendarLoader as jest.Mock).mockImplementation(() => ({
      load: mockCalendarLoad,
    }));
  });

  it("should create an ExternalDataSourceService instance with default options", () => {
    const service = new ExternalDataSourceService();
    expect(service).toBeInstanceOf(ExternalDataSourceService);
    expect(TodoistLoader).toHaveBeenCalled();
    expect(GoogleCalendarLoader).toHaveBeenCalled();
  });

  it("should create an ExternalDataSourceService instance with custom options", () => {
    const options = {
      todoistFilePath: "/custom/todoist.json",
      calendarEventsFilePath: "/custom/events.json",
      calendarTasksFilePath: "/custom/tasks.json",
      outputDir: "/custom/output",
    };

    const service = new ExternalDataSourceService(options);
    expect(service).toBeInstanceOf(ExternalDataSourceService);
    expect(TodoistLoader).toHaveBeenCalledWith(options.todoistFilePath);
    expect(GoogleCalendarLoader).toHaveBeenCalledWith(
      options.calendarEventsFilePath,
      options.calendarTasksFilePath,
    );
  });

  it("should load data from external sources", async () => {
    const service = new ExternalDataSourceService();
    const result = await service.loadFromExternalSources();

    expect(mockTodoistLoad).toHaveBeenCalled();
    expect(mockCalendarLoad).toHaveBeenCalled();

    expect(result.tasks).toHaveLength(2);
    expect(result.projects).toHaveLength(1);

    // Verify that tasks from both sources are combined
    expect(result.tasks).toContain(mockTasks[0]);
    expect(result.tasks).toContain(mockTasks[1]);
  });

  it("should handle errors when loading from external sources", async () => {
    mockTodoistLoad.mockRejectedValueOnce(new Error("Todoist load error"));

    const service = new ExternalDataSourceService();
    await expect(service.loadFromExternalSources()).rejects.toThrow(
      "Todoist load error",
    );
  });

  it("should implement the IStorageService load method", async () => {
    const service = new ExternalDataSourceService();

    // First call should load from sources
    const tasks = await service.load<Task[]>("tasks");

    expect(mockTodoistLoad).toHaveBeenCalled();
    expect(mockCalendarLoad).toHaveBeenCalled();
    expect(tasks).toHaveLength(2);

    // Reset mocks
    jest.clearAllMocks();

    // Second call should use cached data
    const cachedTasks = await service.load<Task[]>("tasks");

    expect(mockTodoistLoad).not.toHaveBeenCalled();
    expect(mockCalendarLoad).not.toHaveBeenCalled();
    expect(cachedTasks).toHaveLength(2);
  });

  it("should return null for unknown keys", async () => {
    const service = new ExternalDataSourceService();
    const result = await service.load<any>("unknown");

    expect(result).toBeNull();
  });

  it("should list available keys", async () => {
    const service = new ExternalDataSourceService();

    // Load data first
    await service.loadFromExternalSources();

    // Then list keys
    const keys = await service.listKeys();

    expect(keys).toContain("tasks");
    expect(keys).toContain("projects");
    expect(keys).toContain("combined");
  });

  it("should provide specialized methods for tasks and projects", async () => {
    const service = new ExternalDataSourceService();

    const tasks = await service.getTasks();
    const projects = await service.getProjects();
    const combined = await service.getCombinedData();

    expect(tasks).toHaveLength(2);
    expect(projects).toHaveLength(1);
    expect(combined.tasks).toHaveLength(2);
    expect(combined.projects).toHaveLength(1);
  });

  it("should warn when using save method", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const service = new ExternalDataSourceService();
    await service.save("key", { test: "data" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("read-only"),
    );

    consoleSpy.mockRestore();
  });

  it("should warn when using delete method", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const service = new ExternalDataSourceService();
    await service.delete("key");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("read-only"),
    );

    consoleSpy.mockRestore();
  });
});
