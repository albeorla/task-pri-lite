/**
 * Core Interfaces for Input Processing System
 * 
 * This file defines the fundamental interfaces and types that form the
 * foundation of the input processing system, following SOLID principles.
 */

/**
 * Represents the source of an input
 */
export enum InputSource {
  EMAIL = 'EMAIL',
  MEETING_NOTES = 'MEETING_NOTES',
  VOICE_MEMO = 'VOICE_MEMO',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  OTHER = 'OTHER'
}

/**
 * Represents the nature/type of an item
 */
export enum ItemNature {
  UNKNOWN = 'UNKNOWN',
  ACTIONABLE_TASK = 'ACTIONABLE_TASK',
  POTENTIAL_EVENT = 'POTENTIAL_EVENT',
  REFERENCE_INFO = 'REFERENCE_INFO',
  PROJECT_IDEA = 'PROJECT_IDEA',
  UNCLEAR = 'UNCLEAR',
  TRASH = 'TRASH'
}

/**
 * Represents the destination type for a processed item
 */
export enum DestinationType {
  TODOIST = 'TODOIST',
  CALENDAR = 'CALENDAR',
  MARKDOWN = 'MARKDOWN',
  REVIEW_LATER = 'REVIEW_LATER',
  NONE = 'NONE'
}

/**
 * Represents a raw piece of input data
 */
export interface IInputItem {
  /**
   * The source of the input
   */
  source: InputSource;
  
  /**
   * The raw content of the input (could be string, file path, etc.)
   */
  rawContent: any;
  
  /**
   * The timestamp when the input was received
   */
  timestamp: Date;
  
  /**
   * Guesses the potential nature of the item based on source/content
   */
  getPotentialNature(): ItemNature;
}

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
