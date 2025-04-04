/**
 * Core Storage Interfaces
 * 
 * This file defines the interfaces related to storage
 */

/**
 * Generic interface for persistent storage
 */
export interface IStorageService {
  /**
   * Saves data to storage
   * @param key The key to store the data under
   * @param data The data to store
   * @returns A promise that resolves when the save is complete
   */
  save<T>(key: string, data: T): Promise<void>;
  
  /**
   * Loads data from storage
   * @param key The key to load the data from
   * @returns A promise that resolves with the loaded data, or null if not found
   */
  load<T>(key: string): Promise<T | null>;
  
  /**
   * Deletes data from storage
   * @param key The key to delete
   * @returns A promise that resolves when the delete is complete
   */
  delete(key: string): Promise<void>;
  
  /**
   * Lists all keys in storage
   * @returns A promise that resolves with an array of keys
   */
  listKeys(): Promise<string[]>;
}
