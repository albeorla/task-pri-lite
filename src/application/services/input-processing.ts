/**
 * Input Processing Service
 *
 * Orchestrates the processing of input items
 */

import {
  IInputItem,
  IProcessedItem,
  IInputProcessor,
} from "../../core/interfaces";

export class InputProcessingService {
  private processors: IInputProcessor[] = [];

  constructor(processors: IInputProcessor[] = []) {
    this.processors = processors;
  }

  /**
   * Adds a processor to the chain
   */
  addProcessor(processor: IInputProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Processes an input item using the first processor that can handle it
   */
  processInput(inputItem: IInputItem): IProcessedItem | null {
    console.log(`Processing input: ${inputItem.rawContent}`);

    for (const processor of this.processors) {
      if (processor.canProcess(inputItem)) {
        return processor.process(inputItem);
      }
    }

    console.warn("No processor found that can process the input");
    return null;
  }
}
