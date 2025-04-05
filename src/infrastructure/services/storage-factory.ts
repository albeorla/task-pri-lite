/**
 * Storage Factory
 *
 * Factory for creating storage services
 */

import { IStorageService } from "../../core/interfaces/storage";
import { FileStorageService, ExternalDataSourceService } from "../storage";

export enum StorageType {
  FILE = "file",
  EXTERNAL = "external",
}

export interface StorageFactoryOptions {
  storageType: StorageType;
  fileStorageDir?: string;
  outputDir?: string;
}

/**
 * Factory for creating storage services
 */
export class StorageFactory {
  /**
   * Creates a storage service based on the specified type
   */
  static createStorage(options: StorageFactoryOptions): IStorageService {
    switch (options.storageType) {
      case StorageType.FILE:
        return new FileStorageService(options.fileStorageDir || "./data");

      case StorageType.EXTERNAL:
        return new ExternalDataSourceService({
          outputDir: options.outputDir || "./output",
        });

      default:
        console.warn(
          `Unknown storage type: ${options.storageType}, falling back to FileStorageService`,
        );
        return new FileStorageService(options.fileStorageDir || "./data");
    }
  }
}
