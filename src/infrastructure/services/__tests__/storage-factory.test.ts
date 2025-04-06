import {
  StorageFactory,
  StorageType,
  StorageFactoryOptions,
} from "../storage-factory";
import { FileStorageService } from "../../storage/file-storage";
import { ExternalDataSourceService } from "../../storage/external-data-source";
import { IStorageService } from "../../../core/interfaces/storage";

jest.mock("../../storage/file-storage");
jest.mock("../../storage/external-data-source");

describe("StorageFactory", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock implementations to verify constructor parameters
    (FileStorageService as jest.Mock).mockImplementation((storageDir) => ({
      _storageDir: storageDir,
      _mockedFileStorage: true,
    }));

    (ExternalDataSourceService as jest.Mock).mockImplementation((options) => ({
      _options: options,
      _mockedExternalStorage: true,
    }));
  });

  describe("createStorage", () => {
    test("should create FileStorageService when type is FILE", () => {
      const options: StorageFactoryOptions = {
        storageType: StorageType.FILE,
        fileStorageDir: "./custom-data",
      };

      const storage = StorageFactory.createStorage(options);

      expect(FileStorageService).toHaveBeenCalledTimes(1);
      expect(FileStorageService).toHaveBeenCalledWith("./custom-data");
      expect(ExternalDataSourceService).not.toHaveBeenCalled();
      expect(storage).toHaveProperty("_mockedFileStorage", true);
      expect(storage).toHaveProperty("_storageDir", "./custom-data");
    });

    test("should create FileStorageService with default dir when not specified", () => {
      const options: StorageFactoryOptions = {
        storageType: StorageType.FILE,
      };

      const storage = StorageFactory.createStorage(options);

      expect(FileStorageService).toHaveBeenCalledTimes(1);
      expect(FileStorageService).toHaveBeenCalledWith("./data");
      expect(storage).toHaveProperty("_storageDir", "./data");
    });

    test("should create ExternalDataSourceService when type is EXTERNAL", () => {
      const options: StorageFactoryOptions = {
        storageType: StorageType.EXTERNAL,
        outputDir: "./custom-output",
      };

      const storage = StorageFactory.createStorage(options);

      expect(ExternalDataSourceService).toHaveBeenCalledTimes(1);
      expect(ExternalDataSourceService).toHaveBeenCalledWith({
        outputDir: "./custom-output",
      });
      expect(FileStorageService).not.toHaveBeenCalled();
      expect(storage).toHaveProperty("_mockedExternalStorage", true);
      expect((storage as any)._options).toEqual({
        outputDir: "./custom-output",
      });
    });

    test("should create ExternalDataSourceService with default options when not specified", () => {
      const options: StorageFactoryOptions = {
        storageType: StorageType.EXTERNAL,
      };

      const storage = StorageFactory.createStorage(options);

      expect(ExternalDataSourceService).toHaveBeenCalledTimes(1);
      expect(ExternalDataSourceService).toHaveBeenCalledWith({
        outputDir: "./output",
      });
      expect((storage as any)._options).toEqual({ outputDir: "./output" });
    });

    test("should fall back to FileStorageService for unknown storage type", () => {
      // Using "as any" to bypass TypeScript checking for testing invalid type
      const options: StorageFactoryOptions = {
        storageType: "unknown" as any,
        fileStorageDir: "./fallback-data",
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const storage = StorageFactory.createStorage(options);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unknown storage type: unknown, falling back to FileStorageService",
      );
      expect(FileStorageService).toHaveBeenCalledTimes(1);
      expect(FileStorageService).toHaveBeenCalledWith("./fallback-data");
      expect(storage).toHaveProperty("_mockedFileStorage", true);
      expect(storage).toHaveProperty("_storageDir", "./fallback-data");

      consoleSpy.mockRestore();
    });

    test("should fall back to FileStorageService with default dir for unknown type without dir", () => {
      const options: StorageFactoryOptions = {
        storageType: "invalid" as any,
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const storage = StorageFactory.createStorage(options);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unknown storage type: invalid, falling back to FileStorageService",
      );
      expect(FileStorageService).toHaveBeenCalledTimes(1);
      expect(FileStorageService).toHaveBeenCalledWith("./data");
      expect(storage).toHaveProperty("_storageDir", "./data");

      consoleSpy.mockRestore();
    });
  });

  // Test type exports
  describe("StorageType enum", () => {
    test("should define FILE storage type", () => {
      expect(StorageType.FILE).toBe("file");
    });

    test("should define EXTERNAL storage type", () => {
      expect(StorageType.EXTERNAL).toBe("external");
    });
  });
});
