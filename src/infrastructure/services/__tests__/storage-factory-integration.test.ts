import { StorageFactory, StorageType } from "../storage-factory";
import { FileStorageService } from "../../storage/file-storage";
import { ExternalDataSourceService } from "../../storage/external-data-source";
import { IStorageService } from "../../../core/interfaces/storage";
import * as fs from "fs";
import * as path from "path";

// Mock the loader classes used by ExternalDataSourceService
jest.mock("../../storage/todoist-loader", () => {
  return {
    TodoistLoader: jest.fn().mockImplementation(() => ({
      load: jest.fn().mockResolvedValue({
        tasks: [],
        projects: [],
      }),
    })),
  };
});

jest.mock("../../storage/calendar-loader", () => {
  return {
    GoogleCalendarLoader: jest.fn().mockImplementation(() => ({
      load: jest.fn().mockResolvedValue({
        tasks: [],
        events: [],
      }),
    })),
  };
});

// Integration tests for StorageFactory
// These tests verify that the storage services created by the factory
// actually implement the IStorageService interface correctly

describe("StorageFactory Integration", () => {
  // Use temporary test directories
  const testDataDir = path.join(process.cwd(), "test-data");
  const testOutputDir = path.join(process.cwd(), "test-output");

  // Clean up test directories before and after tests
  beforeAll(() => {
    // Create test directories if they don't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test data (uncomment if you want to remove test data after tests)
    // if (fs.existsSync(testDataDir)) {
    //   fs.rmSync(testDataDir, { recursive: true, force: true });
    // }
    // if (fs.existsSync(testOutputDir)) {
    //   fs.rmSync(testOutputDir, { recursive: true, force: true });
    // }
  });

  describe("FILE storage type", () => {
    let storage: IStorageService;

    beforeEach(() => {
      storage = StorageFactory.createStorage({
        storageType: StorageType.FILE,
        fileStorageDir: testDataDir,
      });
    });

    test("should create a valid FileStorageService instance", () => {
      expect(storage).toBeInstanceOf(FileStorageService);
    });

    test("should implement save and load methods", async () => {
      const testKey = "test-key";
      const testData = { message: "Hello, world!" };

      // Save data
      await storage.save(testKey, testData);

      // Load data
      const loadedData = await storage.load(testKey);

      // Verify data was saved and loaded correctly
      expect(loadedData).toEqual(testData);

      // Verify file was created in the correct location
      const filePath = path.join(testDataDir, `${testKey}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up
      await storage.delete(testKey);
    });

    test("should implement delete method", async () => {
      const testKey = "test-delete";
      const testData = { message: "Delete me!" };

      // Save data first
      await storage.save(testKey, testData);

      // Verify file exists
      const filePath = path.join(testDataDir, `${testKey}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      // Delete the data
      await storage.delete(testKey);

      // Verify file was deleted
      expect(fs.existsSync(filePath)).toBe(false);

      // Verify data cannot be loaded
      const loadedData = await storage.load(testKey);
      expect(loadedData).toBeNull();
    });

    test("should implement listKeys method", async () => {
      // Save multiple keys
      await storage.save("key1", { data: 1 });
      await storage.save("key2", { data: 2 });
      await storage.save("key3", { data: 3 });

      // List keys
      const keys = await storage.listKeys();

      // Verify all our keys are in the list
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");

      // Clean up
      await storage.delete("key1");
      await storage.delete("key2");
      await storage.delete("key3");
    });
  });

  describe("EXTERNAL storage type", () => {
    let storage: IStorageService;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      // Create an external storage with the test output directory
      storage = StorageFactory.createStorage({
        storageType: StorageType.EXTERNAL,
        outputDir: testOutputDir,
      });

      // Spy on console.log to suppress output
      consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test("should create a valid ExternalDataSourceService instance", () => {
      expect(storage).toBeInstanceOf(ExternalDataSourceService);
    });

    // Since ExternalDataSourceService doesn't actually implement save/delete,
    // we'll test the behavior of those methods calling console.warn

    test("save method should log a warning", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await storage.save("testKey", { data: "test" });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "ExternalDataSourceService is read-only, save operation not implemented",
      );

      consoleWarnSpy.mockRestore();
    });

    test("delete method should log a warning", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await storage.delete("testKey");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "ExternalDataSourceService is read-only, delete operation not implemented",
      );

      consoleWarnSpy.mockRestore();
    });

    test("load method should return null for non-existent key", async () => {
      // With our mocked loaders, the service won't fail but will return null for unknown keys
      const result = await storage.load("non-existent-key");
      expect(result).toBeNull();
    });

    test("listKeys method should return an array", async () => {
      const keys = await storage.listKeys();
      expect(Array.isArray(keys)).toBe(true);
    });
  });
});
