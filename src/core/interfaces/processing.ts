/**
 * Core Processing Interfaces
 * 
 * This file defines the interfaces related to processing inputs
 */

import { ItemNature, DestinationType } from '../types/enums';
import { IInputItem } from './input';

/**
 * Represents an input item after analysis and categorization
 */
export interface IProcessedItem {
  /**
   * The original input item
   */
  originalInput: IInputItem;
  
  /**
   * The determined nature of the item
   */
  determinedNature: ItemNature;
  
  /**
   * Extracted data from the input (e.g., title, description, due date, etc.)
   */
  extractedData: Record<string, any>;
  
  /**
   * The suggested destination for the item
   */
  suggestedDestination: DestinationType;
}

/**
 * Interface for input processors (Strategy Pattern)
 */
export interface IInputProcessor {
  /**
   * Determines if this processor can process the given input
   * @param input The input item to check
   * @returns True if this processor can process the input, false otherwise
   */
  canProcess(input: IInputItem): boolean;
  
  /**
   * Processes the input item
   * @param input The input item to process
   * @returns The processed item
   */
  process(input: IInputItem): IProcessedItem;
}
