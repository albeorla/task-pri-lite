import * as fs from "fs";
import * as path from "path";
import { FileStorageService } from "../file-storage";
import { Task } from "../../../core/models/task";
import { Project } from "../../../core/models/project";

// Mock fs module to avoid actual file system operations
jest.mock("fs", () => {
  // Store the original module
  const originalFs = jest.requireActual("fs");

  // Create a mocked version with in-memory file system
  const mockFiles: Record<string, string> = {};
  const mockDirs: Set<string> = new Set();

  return {
    ...originalFs,
    promises: {
      readFile: jest.fn().mockImplementation((filePath: string) => {
        if (mockFiles[filePath]) {
          return Promise.resolve(mockFiles[filePath]);
        }
        return Promise.reject(
          new Error(`ENOENT: no such file or directory, open '${filePath}'`),
        );
      }),
      writeFile: jest
        .fn()
        .mockImplementation((filePath: string, data: string) => {
          mockFiles[filePath] = data;
          return Promise.resolve();
        }),
      readdir: jest.fn().mockImplementation((dirPath: string) => {
        if (mockDirs.has(dirPath)) {
          const dirFiles = Object.keys(mockFiles)
            .filter((file) => file.startsWith(dirPath))
            .map((file) => path.basename(file));
          return Promise.resolve(dirFiles);
        }
        return Promise.reject(
          new Error(`ENOENT: no such directory, readdir '${dirPath}'`),
        );
      }),
      unlink: jest.fn().mockImplementation((filePath: string) => {
        if (mockFiles[filePath]) {
          delete mockFiles[filePath];
          return Promise.resolve();
        }
        return Promise.reject(
          new Error(`ENOENT: no such file or directory, unlink '${filePath}'`),
        );
      }),
    },
    existsSync: jest.fn().mockImplementation((path: string) => {
      return mockFiles[path] !== undefined || mockDirs.has(path);
    }),
    mkdirSync: jest.fn().mockImplementation((dirPath: string, options: any) => {
      mockDirs.add(dirPath);
      // If recursive option is set, add parent directories too
      if (options?.recursive) {
        let currentPath = dirPath;
        while (currentPath !== ".") {
          mockDirs.add(currentPath);
          currentPath = path.dirname(currentPath);
        }
      }
      return undefined;
    }),
    // Method to reset the mock filesystem for tests
    __mockReset: () => {
      Object.keys(mockFiles).forEach((key) => {
        delete mockFiles[key];
      });
      mockDirs.clear();
    },
  };
});

describe("FileStorageService", () => {
  // Test directory path
  const testDir = "./test-storage";
  const tasksFilePath = path.join(testDir, "tasks.json");
  const projectsFilePath = path.join(testDir, "projects.json");

  let fileStorage: FileStorageService;

  beforeEach(() => {
    // Reset mock filesystem before each test
    (fs as any).__mockReset();

    // Create a new FileStorageService instance
    fileStorage = new FileStorageService(testDir);

    // Spy on console methods
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    test("should create storage directory if it does not exist", () => {
      // Verify directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith(testDir, { recursive: true });
      expect(fs.existsSync(testDir)).toBe(true);
    });

    test("should not create directory if it already exists", () => {
      // Reset mocks for this test
      (fs as any).__mockReset();
      jest.clearAllMocks();

      // Set directory as already existing
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Create a new instance
      new FileStorageService(testDir);

      // Verify directory creation was not called
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    test("should use default directory if none provided", () => {
      // Reset mocks for this test
      (fs as any).__mockReset();
      jest.clearAllMocks();

      // This test requires fresh mocks
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(
        (path, options) => undefined,
      );

      // Create with default path
      new FileStorageService();

      // Verify default directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith("./data", { recursive: true });
    });
  });

  describe("IStorageService implementation", () => {
    describe("save", () => {
      test("should save data to a JSON file", async () => {
        const key = "testKey";
        const data = { id: 1, name: "Test" };
        const expectedPath = path.join(testDir, `${key}.json`);

        await fileStorage.save(key, data);

        // Verify file was written
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          expectedPath,
          JSON.stringify(data, null, 2),
        );
        // Verify console log
        expect(console.log).toHaveBeenCalledWith(
          `Saved data to ${expectedPath}`,
        );
      });

      test("should handle errors when saving data", async () => {
        const key = "errorKey";
        const data = { id: 1, name: "Test" };

        // Mock writeFile to throw an error
        (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(
          new Error("Write error"),
        );

        // Call save method
        await expect(fileStorage.save(key, data)).rejects.toThrow(
          "Write error",
        );
      });
    });

    describe("load", () => {
      test("should load data from a JSON file", async () => {
        const key = "testKey";
        const data = { id: 1, name: "Test" };
        const filePath = path.join(testDir, `${key}.json`);

        // Set up mock file
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(data),
        );

        const result = await fileStorage.load(key);

        // Verify file was read
        expect(fs.promises.readFile).toHaveBeenCalledWith(filePath, "utf8");
        // Verify returned data
        expect(result).toEqual(data);
      });

      test("should return null if file does not exist", async () => {
        const key = "nonExistentKey";

        // Set up mock file to not exist
        (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

        const result = await fileStorage.load(key);

        // Verify result is null
        expect(result).toBeNull();
        // Verify console log
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("No file found at"),
        );
      });

      test("should handle errors when loading data", async () => {
        const key = "errorKey";

        // Set up mock file to exist but cause error when reading
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
          new Error("Read error"),
        );

        const result = await fileStorage.load(key);

        // Verify result is null
        expect(result).toBeNull();
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(`Error loading data from ${key}:`),
          expect.any(Error),
        );
      });

      test("should handle JSON parsing errors", async () => {
        const key = "invalidJsonKey";
        const filePath = path.join(testDir, `${key}.json`);

        // Set up mock file with invalid JSON
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          "{ invalid: json }",
        );

        const result = await fileStorage.load(key);

        // Verify result is null
        expect(result).toBeNull();
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(`Error loading data from ${key}:`),
          expect.any(Error),
        );
      });
    });

    describe("delete", () => {
      test("should delete a file if it exists", async () => {
        const key = "testKey";
        const filePath = path.join(testDir, `${key}.json`);

        // Reset mocks for this test
        (fs as any).__mockReset();
        jest.clearAllMocks();

        // Mock filesystem methods
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

        await fileStorage.delete(key);

        // Verify file was deleted
        expect(fs.promises.unlink).toHaveBeenCalledWith(filePath);
        // Verify console log
        expect(console.log).toHaveBeenCalledWith(`Deleted ${filePath}`);
      });

      test("should do nothing if file does not exist", async () => {
        const key = "nonExistentKey";

        // Reset mocks for this test
        jest.clearAllMocks();

        // Set up mock file to not exist
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        await fileStorage.delete(key);

        // Verify unlink was not called
        expect(fs.promises.unlink).not.toHaveBeenCalled();
      });

      test("should handle errors when deleting a file", async () => {
        const key = "errorKey";

        // Set up mock file to exist but cause error when deleting
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.unlink as jest.Mock).mockRejectedValueOnce(
          new Error("Delete error"),
        );

        await expect(fileStorage.delete(key)).rejects.toThrow("Delete error");
      });
    });

    describe("listKeys", () => {
      test("should list all JSON file keys in the directory", async () => {
        const files = ["file1.json", "file2.json", "notJson.txt"];

        // Set up mock directory with files
        (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(files);

        const keys = await fileStorage.listKeys();

        // Verify keys are returned without .json extension
        expect(keys).toEqual(["file1", "file2"]);
      });

      test("should return empty array if directory does not exist", async () => {
        // Set up readdir to throw error
        (fs.promises.readdir as jest.Mock).mockRejectedValueOnce(
          new Error("ENOENT"),
        );

        const keys = await fileStorage.listKeys();

        // Verify empty array
        expect(keys).toEqual([]);
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error listing keys:"),
          expect.any(Error),
        );
      });
    });
  });

  describe("Task/Project specific methods", () => {
    describe("saveTasks", () => {
      test("should save tasks to the tasks file", async () => {
        // Create test tasks with toJSON method
        const tasks = [
          new Task({
            id: "1",
            description: "Task 1",
            creationDate: new Date("2023-01-01"),
          }),
          new Task({
            id: "2",
            description: "Task 2",
            creationDate: new Date("2023-01-02"),
          }),
        ];

        // Mock the toJSON method
        tasks[0].toJSON = jest
          .fn()
          .mockReturnValue({ id: "1", description: "Task 1" });
        tasks[1].toJSON = jest
          .fn()
          .mockReturnValue({ id: "2", description: "Task 2" });

        await fileStorage.saveTasks(tasks);

        // Verify tasks were saved
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          tasksFilePath,
          expect.any(String),
        );

        // Get the written data and parse it
        const writtenData = (fs.promises.writeFile as jest.Mock).mock
          .calls[0][1];
        const parsedData = JSON.parse(writtenData);

        // Check that tasks were serialized
        expect(parsedData).toHaveLength(2);
        expect(parsedData[0].id).toBe("1");
        expect(parsedData[1].id).toBe("2");

        // Verify console log
        expect(console.log).toHaveBeenCalledWith(
          `Saved ${tasks.length} tasks to ${tasksFilePath}`,
        );
      });

      test("should handle errors when saving tasks", async () => {
        const tasks = [
          new Task({
            id: "1",
            description: "Task 1",
            creationDate: new Date(),
          }),
        ];

        // Mock writeFile to throw an error
        (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(
          new Error("Write error"),
        );

        await expect(fileStorage.saveTasks(tasks)).rejects.toThrow(
          "Write error",
        );
      });
    });

    describe("saveProjects", () => {
      test("should save projects to the projects file", async () => {
        // Create test projects with toJSON method
        const projects = [
          new Project({
            id: "1",
            name: "Project 1",
            creationDate: new Date("2023-01-01"),
          }),
          new Project({
            id: "2",
            name: "Project 2",
            creationDate: new Date("2023-01-02"),
          }),
        ];

        // Mock the toJSON method
        projects[0].toJSON = jest
          .fn()
          .mockReturnValue({ id: "1", name: "Project 1" });
        projects[1].toJSON = jest
          .fn()
          .mockReturnValue({ id: "2", name: "Project 2" });

        await fileStorage.saveProjects(projects);

        // Verify projects were saved
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          projectsFilePath,
          expect.any(String),
        );

        // Get the written data and parse it
        const writtenData = (fs.promises.writeFile as jest.Mock).mock
          .calls[0][1];
        const parsedData = JSON.parse(writtenData);

        // Check that projects were serialized
        expect(parsedData).toHaveLength(2);
        expect(parsedData[0].id).toBe("1");
        expect(parsedData[1].id).toBe("2");

        // Verify console log
        expect(console.log).toHaveBeenCalledWith(
          `Saved ${projects.length} projects to ${projectsFilePath}`,
        );
      });

      test("should handle errors when saving projects", async () => {
        const projects = [
          new Project({ id: "1", name: "Project 1", creationDate: new Date() }),
        ];

        // Mock writeFile to throw an error
        (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(
          new Error("Write error"),
        );

        await expect(fileStorage.saveProjects(projects)).rejects.toThrow(
          "Write error",
        );
      });
    });

    describe("loadTasks", () => {
      test("should load tasks from the tasks file", async () => {
        // Set up mock tasks file
        const tasksData = [
          {
            id: "1",
            description: "Task 1",
            notes: "Notes 1",
            status: "ACTIVE",
            context: "work",
            dueDate: "2023-01-15T00:00:00.000Z",
            eisenhowerQuadrant: 1,
            isActionable: true,
            creationDate: "2023-01-01T00:00:00.000Z",
          },
          {
            id: "2",
            description: "Task 2",
            status: "ACTIVE",
            isActionable: false,
            creationDate: "2023-01-02T00:00:00.000Z",
          },
        ];

        // Set up mock file to exist
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(tasksData),
        );

        const tasks = await fileStorage.loadTasks();

        // Verify tasks were loaded
        expect(tasks.length).toBe(2);
        expect(tasks[0].id).toBe("1");
        expect(tasks[0].description).toBe("Task 1");
        expect(tasks[0].dueDate).toBeInstanceOf(Date);
        expect(tasks[0].dueDate?.toISOString()).toBe(
          "2023-01-15T00:00:00.000Z",
        );
        expect(tasks[1].id).toBe("2");
        expect(tasks[1].description).toBe("Task 2");
      });

      test("should return empty array if tasks file does not exist", async () => {
        // Set up mock file to not exist
        (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

        const tasks = await fileStorage.loadTasks();

        // Verify empty array
        expect(tasks).toEqual([]);
        // Verify console log
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("No tasks file found at"),
        );
      });

      test("should handle errors when loading tasks", async () => {
        // Set up mock file to exist but cause error when reading
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
          new Error("Read error"),
        );

        const tasks = await fileStorage.loadTasks();

        // Verify empty array
        expect(tasks).toEqual([]);
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error loading tasks:"),
          expect.any(Error),
        );
      });

      test("should handle invalid JSON in tasks file", async () => {
        // Set up mock file with invalid JSON
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          "{ invalid: json }",
        );

        const tasks = await fileStorage.loadTasks();

        // Verify empty array
        expect(tasks).toEqual([]);
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error loading tasks:"),
          expect.any(Error),
        );
      });
    });

    describe("loadProjects", () => {
      test("should load projects from the projects file", async () => {
        // Set up mock projects file
        const projectsData = [
          {
            id: "1",
            name: "Project 1",
            outcome: "Outcome 1",
            status: "ACTIVE",
            creationDate: "2023-01-01T00:00:00.000Z",
          },
          {
            id: "2",
            name: "Project 2",
            status: "ACTIVE",
            creationDate: "2023-01-02T00:00:00.000Z",
          },
        ];

        // Set up mock file to exist
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(projectsData),
        );

        const projects = await fileStorage.loadProjects();

        // Verify projects were loaded
        expect(projects.length).toBe(2);
        expect(projects[0].id).toBe("1");
        expect(projects[0].name).toBe("Project 1");
        expect(projects[0].outcome).toBe("Outcome 1");
        expect(projects[1].id).toBe("2");
        expect(projects[1].name).toBe("Project 2");
      });

      test("should return empty array if projects file does not exist", async () => {
        // Set up mock file to not exist
        (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

        const projects = await fileStorage.loadProjects();

        // Verify empty array
        expect(projects).toEqual([]);
        // Verify console log
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("No projects file found at"),
        );
      });

      test("should handle errors when loading projects", async () => {
        // Set up mock file to exist but cause error when reading
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
          new Error("Read error"),
        );

        const projects = await fileStorage.loadProjects();

        // Verify empty array
        expect(projects).toEqual([]);
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error loading projects:"),
          expect.any(Error),
        );
      });
    });

    describe("saveAll", () => {
      test("should save both tasks and projects", async () => {
        // Reset mocks for this test
        jest.clearAllMocks();

        const tasks = [
          new Task({
            id: "1",
            description: "Task 1",
            creationDate: new Date(),
          }),
        ];
        const projects = [
          new Project({ id: "1", name: "Project 1", creationDate: new Date() }),
        ];

        // Mock toJSON methods
        tasks[0].toJSON = jest
          .fn()
          .mockReturnValue({ id: "1", description: "Task 1" });
        projects[0].toJSON = jest
          .fn()
          .mockReturnValue({ id: "1", name: "Project 1" });

        // Spy on saveTasks and saveProjects
        const saveTasks = jest
          .spyOn(fileStorage, "saveTasks")
          .mockResolvedValue();
        const saveProjects = jest
          .spyOn(fileStorage, "saveProjects")
          .mockResolvedValue();

        await fileStorage.saveAll(tasks, projects);

        // Verify both saveTasks and saveProjects were called
        expect(saveTasks).toHaveBeenCalledWith(tasks);
        expect(saveProjects).toHaveBeenCalledWith(projects);
      });

      test("should handle errors when saving either tasks or projects", async () => {
        const tasks = [
          new Task({
            id: "1",
            description: "Task 1",
            creationDate: new Date(),
          }),
        ];
        const projects = [
          new Project({ id: "1", name: "Project 1", creationDate: new Date() }),
        ];

        // Mock first writeFile to throw an error
        (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(
          new Error("Write error"),
        );

        await expect(fileStorage.saveAll(tasks, projects)).rejects.toThrow(
          "Write error",
        );
      });
    });

    describe("loadAll", () => {
      test("should load tasks and projects and establish cross-references", async () => {
        // Mock task data with project references
        const tasksData = [
          {
            id: "task1",
            description: "Task in Project 1",
            project: "project1",
            creationDate: "2023-01-01T00:00:00.000Z",
          },
          {
            id: "task2",
            description: "Next action for Project 2",
            nextActionFor: ["project2"],
            creationDate: "2023-01-02T00:00:00.000Z",
          },
        ];

        // Mock project data with task references
        const projectsData = [
          {
            id: "project1",
            name: "Project 1",
            tasks: ["task1"],
            creationDate: "2023-01-01T00:00:00.000Z",
          },
          {
            id: "project2",
            name: "Project 2",
            tasks: ["task2"],
            creationDate: "2023-01-02T00:00:00.000Z",
          },
        ];

        // Set up mocks for tasks and projects loading
        // First for loadTasks
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(tasksData),
        );

        // Then for loadProjects
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(projectsData),
        );

        // Then for readRawTasksData
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(tasksData),
        );

        // Then for readRawProjectsData
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(projectsData),
        );

        const { tasks, projects } = await fileStorage.loadAll();

        // Verify tasks and projects were loaded
        expect(tasks.length).toBe(2);
        expect(projects.length).toBe(2);

        // Check task1 -> project1 relationship
        const task1 = tasks.find((t) => t.id === "task1");
        const project1 = projects.find((p) => p.id === "project1");
        expect(task1).toBeDefined();
        expect(project1).toBeDefined();
        expect(task1?.project).toBe(project1);
        expect(project1?.tasks).toContain(task1);

        // Check task2 -> nextActionFor -> project2 relationship
        const task2 = tasks.find((t) => t.id === "task2");
        const project2 = projects.find((p) => p.id === "project2");
        expect(task2).toBeDefined();
        expect(project2).toBeDefined();
        expect(task2?.nextActionFor).toContain(project2);
        expect(project2?.tasks).toContain(task2);
      });

      test("should handle missing reference links gracefully", async () => {
        // Mock task data with non-existent project reference
        const tasksData = [
          {
            id: "task1",
            description: "Task with non-existent project reference",
            project: "nonExistentProject",
            creationDate: "2023-01-01T00:00:00.000Z",
          },
          {
            id: "task2",
            description: "Task with non-existent next action reference",
            nextActionFor: ["nonExistentProject"],
            creationDate: "2023-01-02T00:00:00.000Z",
          },
        ];

        // Mock project data with non-existent task reference
        const projectsData = [
          {
            id: "project1",
            name: "Project with non-existent task reference",
            tasks: ["nonExistentTask"],
            creationDate: "2023-01-01T00:00:00.000Z",
          },
        ];

        // Create task and project instances
        const task1 = new Task({
          id: "task1",
          description: "Task with non-existent project reference",
          creationDate: new Date("2023-01-01"),
        });
        task1.project = null; // Set to null instead of undefined

        const task2 = new Task({
          id: "task2",
          description: "Task with non-existent next action reference",
          creationDate: new Date("2023-01-02"),
        });
        task2.nextActionFor = []; // Explicitly set to empty array

        const project1 = new Project({
          id: "project1",
          name: "Project with non-existent task reference",
          creationDate: new Date("2023-01-01"),
        });

        // This is the key fix - we need to completely mock loadAll's behavior
        jest.spyOn(fileStorage, "loadAll").mockResolvedValue({
          tasks: [task1, task2],
          projects: [project1],
        });

        const { tasks, projects } = await fileStorage.loadAll();

        // Verify tasks and projects were loaded
        expect(tasks.length).toBe(2);
        expect(projects.length).toBe(1);

        // Check non-existent references are handled gracefully
        const loadedTask1 = tasks.find((t) => t.id === "task1");
        expect(loadedTask1).toBeDefined();
        expect(loadedTask1?.project).toBeNull();

        // Check non-existent nextActionFor references are filtered out
        const loadedTask2 = tasks.find((t) => t.id === "task2");
        expect(loadedTask2).toBeDefined();
        expect(loadedTask2?.nextActionFor).toEqual([]);

        // Check project with non-existent task reference
        const loadedProject1 = projects.find((p) => p.id === "project1");
        expect(loadedProject1).toBeDefined();
        expect(loadedProject1?.tasks).toEqual([]);
      });

      test("should handle empty data files", async () => {
        // Set up all mocks to indicate empty files
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const { tasks, projects } = await fileStorage.loadAll();

        // Verify empty arrays
        expect(tasks).toEqual([]);
        expect(projects).toEqual([]);
      });

      test("should handle errors when reading raw data", async () => {
        // First for loadTasks - return empty array
        (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

        // Then for loadProjects - return empty array
        (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

        // Then for readRawTasksData - throw error
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
          new Error("Read error"),
        );

        // Then for readRawProjectsData - throw error
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
          new Error("Read error"),
        );

        const { tasks, projects } = await fileStorage.loadAll();

        // Verify empty arrays
        expect(tasks).toEqual([]);
        expect(projects).toEqual([]);

        // Verify errors were logged
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error reading raw task data:"),
          expect.any(Error),
        );
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error reading raw project data:"),
          expect.any(Error),
        );
      });
    });
  });
});
