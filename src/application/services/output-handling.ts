/**
 * Output Handling Service
 *
 * Orchestrates the handling of processed items to appropriate destinations
 */

import { IProcessedItem, IDestinationHandler } from "../../core/interfaces";

export class OutputHandlingService {
  private handlers: IDestinationHandler[] = [];

  constructor(handlers: IDestinationHandler[] = []) {
    this.handlers = handlers;
  }

  /**
   * Adds a destination handler to the chain
   */
  addHandler(handler: IDestinationHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Handles a processed item by routing it to the appropriate destination handler
   */
  async handleOutput(processedItem: IProcessedItem): Promise<boolean> {
    console.log(
      `Handling output for item: ${processedItem.originalInput.rawContent}`,
    );

    for (const handler of this.handlers) {
      if (handler.canHandle(processedItem)) {
        await handler.handle(processedItem);
        return true;
      }
    }

    console.warn("No handler found that can handle the processed item");
    return false;
  }
}
