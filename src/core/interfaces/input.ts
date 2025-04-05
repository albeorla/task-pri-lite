/**
 * Core Input Interfaces
 *
 * This file defines the interfaces related to input handling
 */

import { InputSource, ItemNature } from "../types/enums";

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
