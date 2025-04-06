import { OutputHandlingService } from "../output-handling";
import {
  IInputItem,
  IProcessedItem,
  IDestinationHandler,
} from "../../../core/interfaces";
import {
  InputSource,
  ItemNature,
  DestinationType,
} from "../../../core/types/enums";

// Create a mock implementation of IInputItem for testing
class MockInputItem implements IInputItem {
  source: InputSource;
  rawContent: any;
  timestamp: Date;

  constructor(
    source: InputSource = InputSource.MANUAL_ENTRY,
    rawContent: any = "test",
  ) {
    this.source = source;
    this.rawContent = rawContent;
    this.timestamp = new Date();
  }

  getPotentialNature(): ItemNature {
    return ItemNature.UNCLEAR;
  }
}

describe("OutputHandlingService", () => {
  // Mock console methods to avoid cluttering test output
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  let service: OutputHandlingService;

  beforeEach(() => {
    service = new OutputHandlingService();
  });

  describe("constructor", () => {
    test("should initialize with empty handlers array by default", () => {
      expect((service as any).handlers).toEqual([]);
    });

    test("should initialize with provided handlers", () => {
      const handler1: IDestinationHandler = {
        canHandle: jest.fn(),
        handle: jest.fn(),
      };

      const handler2: IDestinationHandler = {
        canHandle: jest.fn(),
        handle: jest.fn(),
      };

      const serviceWithHandlers = new OutputHandlingService([
        handler1,
        handler2,
      ]);
      expect((serviceWithHandlers as any).handlers).toHaveLength(2);
      expect((serviceWithHandlers as any).handlers[0]).toBe(handler1);
      expect((serviceWithHandlers as any).handlers[1]).toBe(handler2);
    });
  });

  describe("addHandler", () => {
    test("should add a handler to the chain", () => {
      const handler: IDestinationHandler = {
        canHandle: jest.fn(),
        handle: jest.fn(),
      };

      service.addHandler(handler);
      expect((service as any).handlers).toHaveLength(1);
      expect((service as any).handlers[0]).toBe(handler);
    });

    test("should add multiple handlers in the correct order", () => {
      const handler1: IDestinationHandler = {
        canHandle: jest.fn(),
        handle: jest.fn(),
      };

      const handler2: IDestinationHandler = {
        canHandle: jest.fn(),
        handle: jest.fn(),
      };

      service.addHandler(handler1);
      service.addHandler(handler2);

      expect((service as any).handlers).toHaveLength(2);
      expect((service as any).handlers[0]).toBe(handler1);
      expect((service as any).handlers[1]).toBe(handler2);
    });
  });

  describe("handleOutput", () => {
    test("should use the first handler that can handle the processed item", async () => {
      // Create test input and processed item
      const inputItem = new MockInputItem();
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: { title: "Test Task" },
        suggestedDestination: DestinationType.TODOIST,
      };

      // Create handlers
      const handler1: IDestinationHandler = {
        canHandle: jest.fn().mockReturnValue(false),
        handle: jest.fn().mockResolvedValue(undefined),
      };

      const handler2: IDestinationHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockResolvedValue(undefined),
      };

      const handler3: IDestinationHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockResolvedValue(undefined),
      };

      // Add handlers to service
      service.addHandler(handler1);
      service.addHandler(handler2);
      service.addHandler(handler3);

      // Handle output
      const result = await service.handleOutput(processedItem);

      // Verify
      expect(handler1.canHandle).toHaveBeenCalledWith(processedItem);
      expect(handler2.canHandle).toHaveBeenCalledWith(processedItem);
      expect(handler3.canHandle).not.toHaveBeenCalled();

      expect(handler1.handle).not.toHaveBeenCalled();
      expect(handler2.handle).toHaveBeenCalledWith(processedItem);
      expect(handler3.handle).not.toHaveBeenCalled();

      expect(result).toBe(true);
    });

    test("should return false when no handler can handle the processed item", async () => {
      // Create test input and processed item
      const inputItem = new MockInputItem();
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Create handler that cannot handle the input
      const handler: IDestinationHandler = {
        canHandle: jest.fn().mockReturnValue(false),
        handle: jest.fn().mockResolvedValue(undefined),
      };

      // Add handler to service
      service.addHandler(handler);

      // Handle output
      const result = await service.handleOutput(processedItem);

      // Verify
      expect(handler.canHandle).toHaveBeenCalledWith(processedItem);
      expect(handler.handle).not.toHaveBeenCalled();
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        "No handler found that can handle the processed item",
      );
    });

    test("should log output handling", async () => {
      // Create test input and processed item
      const inputItem = new MockInputItem(
        InputSource.EMAIL,
        "Test email content",
      );
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {},
        suggestedDestination: DestinationType.TODOIST,
      };

      // Handle output (will return false since no handlers)
      await service.handleOutput(processedItem);

      // Verify logging
      expect(console.log).toHaveBeenCalledWith(
        "Handling output for item: Test email content",
      );
    });

    test("should propagate errors from handlers", async () => {
      // Create test input and processed item
      const inputItem = new MockInputItem();
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {},
        suggestedDestination: DestinationType.TODOIST,
      };

      // Create handler that throws an error
      const error = new Error("Handler error");
      const handler: IDestinationHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockRejectedValue(error),
      };

      // Add handler to service
      service.addHandler(handler);

      // Handle output
      await expect(service.handleOutput(processedItem)).rejects.toThrow(
        "Handler error",
      );
    });
  });
});
