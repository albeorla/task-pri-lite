/**
 * Orchestration Services Implementation for Input Processing System
 *
 * This file implements the orchestration services that connect all components
 * of the input processing system, following SOLID principles.
 */

import {
  IInputItem,
  IProcessedItem,
  IInputProcessor,
  IDestinationHandler
} from '../core/interfaces';

import {
  TaskDetectionProcessor,
  EventDetectionProcessor,
  ReferenceInfoProcessor,
  DefaultProcessor
} from '../processors/core-processors';

import {
  TodoistHandler,
  CalendarHandler,
  MarkdownHandler,
  ReviewLaterHandler,
  TrashHandler
} from '../handlers/destination-handlers';

/**
 * Service responsible for processing input items
 */
export class InputProcessingService {
  private processors: IInputProcessor[] = [];

  /**
   * Constructs a new InputProcessingService with default processors
   */
  constructor() {
    // Initialize with default processors in priority order
    this.addProcessor(new TaskDetectionProcessor());
    this.addProcessor(new EventDetectionProcessor());
    this.addProcessor(new ReferenceInfoProcessor());
    this.addProcessor(new DefaultProcessor()); // Fallback processor
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
    console.log(`Processing input from ${item.source}...`);

    for (const processor of this.processors) {
      if (processor.canProcess(item)) {
        console.log(`Using ${processor.constructor.name} to process input`);
        return processor.process(item);
      }
    }

    throw new Error('No processor found that can handle the input');
  }
}

/**
 * Service responsible for handling processed items
 */
export class OutputHandlingService {
  private handlers: IDestinationHandler[] = [];

  /**
   * Constructs a new OutputHandlingService with default handlers
   */
  constructor() {
    // Initialize with default handlers
    this.addHandler(new TodoistHandler());
    this.addHandler(new CalendarHandler());
    this.addHandler(new MarkdownHandler());
    this.addHandler(new ReviewLaterHandler());
    this.addHandler(new TrashHandler());
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
    console.log(`Handling output with destination ${item.suggestedDestination}...`);

    for (const handler of this.handlers) {
      if (handler.canHandle(item)) {
        console.log(`Using ${handler.constructor.name} to handle output`);
        await handler.handle(item);
        return;
      }
    }

    throw new Error('No handler found that can handle the processed item');
  }
}

/**
 * Main orchestration service that coordinates the entire process
 */
export class InputProcessingOrchestrator {
  private inputProcessingService: InputProcessingService;
  private outputHandlingService: OutputHandlingService;

  /**
   * Constructs a new InputProcessingOrchestrator
   * @param inputProcessingService Optional custom input processing service
   * @param outputHandlingService Optional custom output handling service
   */
  constructor(
    inputProcessingService?: InputProcessingService,
    outputHandlingService?: OutputHandlingService
  ) {
    this.inputProcessingService = inputProcessingService || new InputProcessingService();
    this.outputHandlingService = outputHandlingService || new OutputHandlingService();
  }

  /**
   * Processes an input item and handles the result
   * @param item The input item to process
   * @returns A promise that resolves when the processing and handling are complete
   */
  public async processAndHandle(item: IInputItem): Promise<void> {
    try {
      console.log('Starting processing and handling workflow...');

      // Process the input
      const processedItem = this.inputProcessingService.processInput(item);

      console.log('Input processed successfully:', {
        nature: processedItem.determinedNature,
        destination: processedItem.suggestedDestination
      });

      // Handle the processed item
      await this.outputHandlingService.handleOutput(processedItem);

      console.log('Output handled successfully');
    } catch (error) {
      console.error('Error in processing and handling workflow:', error);
      throw error;
    }
  }
}
