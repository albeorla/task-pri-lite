/**
 * Orchestration Services for Input Processing System
 *
 * This file defines the service classes that orchestrate the processing
 * and handling of input items, following SOLID principles.
 */

import {
  IInputItem,
  IProcessedItem,
  IInputProcessor,
  IDestinationHandler,
} from "../core/interfaces";

/**
 * Service responsible for processing input items
 */
export class InputProcessingService {
  private processors: IInputProcessor[] = [];

  /**
   * Constructs a new InputProcessingService
   * @param processors Optional array of input processors to initialize with
   */
  constructor(processors: IInputProcessor[] = []) {
    this.processors = processors;
  }

  /**
   * Adds a processor to the service
   * @param processor The processor to add
   */
  public addProcessor(processor: IInputProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Processes an input item using the first processor that can handle it
   * @param item The input item to process
   * @returns The processed item
   * @throws Error if no processor can handle the input
   */
  public processInput(item: IInputItem): IProcessedItem {
    for (const processor of this.processors) {
      if (processor.canProcess(item)) {
        return processor.process(item);
      }
    }

    throw new Error("No processor found that can handle the input");
  }
}

/**
 * Service responsible for handling processed items
 */
export class OutputHandlingService {
  private handlers: IDestinationHandler[] = [];

  /**
   * Constructs a new OutputHandlingService
   * @param handlers Optional array of destination handlers to initialize with
   */
  constructor(handlers: IDestinationHandler[] = []) {
    this.handlers = handlers;
  }

  /**
   * Adds a handler to the service
   * @param handler The handler to add
   */
  public addHandler(handler: IDestinationHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Handles a processed item using the first handler that can handle it
   * @param item The processed item to handle
   * @returns A promise that resolves when the handling is complete
   * @throws Error if no handler can handle the processed item
   */
  public async handleOutput(item: IProcessedItem): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.canHandle(item)) {
        await handler.handle(item);
        return;
      }
    }

    throw new Error("No handler found that can handle the processed item");
  }
}
