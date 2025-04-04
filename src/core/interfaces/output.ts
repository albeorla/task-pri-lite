/**
 * Core Output Interfaces
 * 
 * This file defines the interfaces related to output handling
 */

import { IProcessedItem } from './processing';

/**
 * Interface for destination handlers (Strategy Pattern)
 */
export interface IDestinationHandler {
  /**
   * Determines if this handler can handle the given processed item
   * @param processedItem The processed item to check
   * @returns True if this handler can handle the processed item, false otherwise
   */
  canHandle(processedItem: IProcessedItem): boolean;
  
  /**
   * Handles the processed item
   * @param processedItem The processed item to handle
   * @returns A promise that resolves when the handling is complete
   */
  handle(processedItem: IProcessedItem): Promise<void>;
}
