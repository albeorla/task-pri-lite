/**
 * Abstract Base Classes
 *
 * This file defines abstract base classes for the application
 */

import {
  IInputItem,
  IProcessedItem,
  IInputProcessor,
} from "../core/interfaces";
import { ItemNature, DestinationType } from "../core/types/enums";

/**
 * Abstract base class for input processors
 */
export abstract class BaseInputProcessor implements IInputProcessor {
  /**
   * Determines if this processor can process the given input
   * @param input The input item to check
   * @returns True if this processor can process the input, false otherwise
   */
  public abstract canProcess(input: IInputItem): boolean;

  /**
   * Processes the input item
   * @param input The input item to process
   * @returns The processed item
   */
  public abstract process(input: IInputItem): IProcessedItem;
}

/**
 * Base implementation of IProcessedItem
 */
export class BaseProcessedItem implements IProcessedItem {
  /**
   * The original input item
   */
  public originalInput: IInputItem;

  /**
   * The determined nature of the item
   */
  public determinedNature: ItemNature;

  /**
   * The suggested destination for the item
   */
  public suggestedDestination: DestinationType;

  /**
   * Extracted data from the input
   */
  public extractedData: Record<string, any>;

  /**
   * Constructs a new BaseProcessedItem
   * @param originalInput The original input item
   * @param determinedNature The determined nature of the item
   * @param suggestedDestination The suggested destination for the item
   * @param extractedData Extracted data from the input
   */
  constructor(
    originalInput: IInputItem,
    determinedNature: ItemNature,
    suggestedDestination: DestinationType,
    extractedData: Record<string, any> = {},
  ) {
    this.originalInput = originalInput;
    this.determinedNature = determinedNature;
    this.suggestedDestination = suggestedDestination;
    this.extractedData = extractedData;
  }
}
