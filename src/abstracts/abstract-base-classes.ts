/**
 * Abstract Base Classes for Input Processing System
 * 
 * This file defines abstract base classes that provide common functionality
 * for concrete implementations of the core interfaces.
 */

import { 
  IInputItem, 
  IProcessedItem, 
  IInputProcessor, 
  IDestinationHandler,
  InputSource,
  ItemNature,
  DestinationType
} from '../core/core-interfaces';

/**
 * Abstract base class for input items
 */
export abstract class BaseInputItem implements IInputItem {
  public source: InputSource;
  public rawContent: any;
  public timestamp: Date;
  
  /**
   * Constructs a new BaseInputItem
   * @param source The source of the input
   * @param rawContent The raw content of the input
   * @param timestamp Optional timestamp (defaults to current time)
   */
  constructor(source: InputSource, rawContent: any, timestamp?: Date) {
    this.source = source;
    this.rawContent = rawContent;
    this.timestamp = timestamp || new Date();
  }
  
  /**
   * Abstract method to be implemented by subclasses
   */
  public abstract getPotentialNature(): ItemNature;
}

/**
 * Base class for processed items
 */
export class BaseProcessedItem implements IProcessedItem {
  public originalInput: IInputItem;
  public determinedNature: ItemNature;
  public extractedData: Record<string, any>;
  public suggestedDestination: DestinationType;
  
  /**
   * Constructs a new BaseProcessedItem
   * @param originalInput The original input item
   * @param determinedNature The determined nature of the item
   * @param suggestedDestination The suggested destination for the item
   * @param extractedData Optional extracted data
   */
  constructor(
    originalInput: IInputItem,
    determinedNature: ItemNature,
    suggestedDestination: DestinationType,
    extractedData: Record<string, any> = {}
  ) {
    this.originalInput = originalInput;
    this.determinedNature = determinedNature;
    this.suggestedDestination = suggestedDestination;
    this.extractedData = extractedData;
  }
}

/**
 * Abstract base class for input processors
 */
export abstract class BaseInputProcessor implements IInputProcessor {
  /**
   * Abstract method to be implemented by subclasses
   * @param input The input item to check
   */
  public abstract canProcess(input: IInputItem): boolean;
  
  /**
   * Abstract method to be implemented by subclasses
   * @param input The input item to process
   */
  public abstract process(input: IInputItem): IProcessedItem;
}

/**
 * Abstract base class for destination handlers
 */
export abstract class BaseDestinationHandler implements IDestinationHandler {
  /**
   * The destination type this handler is responsible for
   */
  protected destinationType: DestinationType;
  
  /**
   * Constructs a new BaseDestinationHandler
   * @param destinationType The destination type this handler is responsible for
   */
  constructor(destinationType: DestinationType) {
    this.destinationType = destinationType;
  }
  
  /**
   * Determines if this handler can handle the given processed item
   * @param processedItem The processed item to check
   * @returns True if this handler can handle the processed item, false otherwise
   */
  public canHandle(processedItem: IProcessedItem): boolean {
    return processedItem.suggestedDestination === this.destinationType;
  }
  
  /**
   * Abstract method to be implemented by subclasses
   * @param processedItem The processed item to handle
   */
  public abstract handle(processedItem: IProcessedItem): Promise<void>;
}
