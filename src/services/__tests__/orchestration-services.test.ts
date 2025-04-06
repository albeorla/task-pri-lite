/**
 * Tests for Orchestration Services
 *
 * This file contains tests for the orchestration services that are responsible
 * for processing inputs and directing outputs.
 */

import {
  InputProcessingService,
  OutputHandlingService,
  InputProcessingOrchestrator,
} from "../orchestration-services-impl";

import {
  IInputItem,
  IProcessedItem,
  IInputProcessor,
  IDestinationHandler,
  InputSource,
  ItemNature,
  DestinationType,
} from "../../core/interfaces";

// Mock input processor
class MockInputProcessor implements IInputProcessor {
  canProcessResult: boolean;
  processItem: IProcessedItem;

  constructor(canProcessResult: boolean, processItem: IProcessedItem) {
    this.canProcessResult = canProcessResult;
    this.processItem = processItem;
  }

  canProcess(_item: IInputItem): boolean {
    return this.canProcessResult;
  }

  process(_item: IInputItem): IProcessedItem {
    return this.processItem;
  }
}

// Mock destination handler
class MockDestinationHandler implements IDestinationHandler {
  canHandleResult: boolean;
  handleCalled: boolean = false;

  constructor(canHandleResult: boolean) {
    this.canHandleResult = canHandleResult;
  }

  canHandle(_item: IProcessedItem): boolean {
    return this.canHandleResult;
  }

  async handle(_item: IProcessedItem): Promise<void> {
    this.handleCalled = true;
    return Promise.resolve();
  }
}

// Mock input item
class MockInputItem implements IInputItem {
  source: InputSource;
  rawContent: any;
  timestamp: Date = new Date();

  constructor(source: InputSource, content: any) {
    this.source = source;
    this.rawContent = content;
  }

  getPotentialNature(): ItemNature {
    return ItemNature.ACTIONABLE_TASK;
  }
}

// Create mock items for testing
const mockInputItem = new MockInputItem(
  InputSource.MANUAL_ENTRY,
  "Test content",
);

// Mock processed item
const mockProcessedItem: IProcessedItem = {
  originalInput: mockInputItem,
  determinedNature: ItemNature.ACTIONABLE_TASK,
  suggestedDestination: DestinationType.TODOIST,
  extractedData: {
    title: "Test Task",
    description: "This is a test task",
  },
};

describe("Orchestration Services", () => {
  // Mock console methods to prevent test output noise
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("InputProcessingService", () => {
    let inputService: InputProcessingService;

    beforeEach(() => {
      // Create a new service instance
      inputService = new InputProcessingService();

      // Clear default processors by resetting the processors array
      (inputService as any).processors = [];

      jest.clearAllMocks();
    });

    test("should add processor correctly", () => {
      // Arrange
      const processor = new MockInputProcessor(true, mockProcessedItem);

      // Act
      inputService.addProcessor(processor);

      // Assert - indirectly testing by calling processInput
      const result = inputService.processInput(mockInputItem);
      expect(result).toBe(mockProcessedItem);
    });

    test("should process input with first compatible processor", () => {
      // Arrange
      const processor1 = new MockInputProcessor(false, mockProcessedItem);
      const processor2 = new MockInputProcessor(true, mockProcessedItem);
      const processor3 = new MockInputProcessor(true, {
        ...mockProcessedItem,
        determinedNature: ItemNature.REFERENCE_INFO,
      });

      inputService.addProcessor(processor1);
      inputService.addProcessor(processor2);
      inputService.addProcessor(processor3);

      // Act
      const result = inputService.processInput(mockInputItem);

      // Assert
      expect(result).toBe(mockProcessedItem);
      expect(result.determinedNature).toBe(ItemNature.ACTIONABLE_TASK);
    });

    test("should throw error when no processor can handle input", () => {
      // Arrange
      const processor = new MockInputProcessor(false, mockProcessedItem);

      inputService.addProcessor(processor);

      // Act & Assert
      expect(() => inputService.processInput(mockInputItem)).toThrow(
        "No processor found that can handle the input",
      );
    });
  });

  describe("OutputHandlingService", () => {
    let outputService: OutputHandlingService;

    beforeEach(() => {
      // Create a new service instance
      outputService = new OutputHandlingService();

      // Clear default handlers by resetting the handlers array
      (outputService as any).handlers = [];

      jest.clearAllMocks();
    });

    test("should add handler correctly", async () => {
      // Arrange
      const handler = new MockDestinationHandler(true);

      // Act
      outputService.addHandler(handler);
      await outputService.handleOutput(mockProcessedItem);

      // Assert
      expect(handler.handleCalled).toBe(true);
    });

    test("should handle output with first compatible handler", async () => {
      // Arrange
      const handler1 = new MockDestinationHandler(false);
      const handler2 = new MockDestinationHandler(true);
      const handler3 = new MockDestinationHandler(true);

      outputService.addHandler(handler1);
      outputService.addHandler(handler2);
      outputService.addHandler(handler3);

      // Act
      await outputService.handleOutput(mockProcessedItem);

      // Assert
      expect(handler1.handleCalled).toBe(false);
      expect(handler2.handleCalled).toBe(true);
      expect(handler3.handleCalled).toBe(false);
    });

    test("should throw error when no handler can handle output", async () => {
      // Arrange
      const handler = new MockDestinationHandler(false);

      outputService.addHandler(handler);

      // Act & Assert
      await expect(
        outputService.handleOutput(mockProcessedItem),
      ).rejects.toThrow("No handler found that can handle the processed item");
    });
  });

  describe("InputProcessingOrchestrator", () => {
    test("should coordinate process and handle workflow", async () => {
      // Setup
      const mockInputItem = new MockInputItem(InputSource.EMAIL, {
        text: "Test content",
      });

      const mockProcessedItem: IProcessedItem = {
        originalInput: mockInputItem,
        determinedNature: ItemNature.ACTIONABLE_TASK,
        suggestedDestination: DestinationType.TODOIST,
        extractedData: {},
      };

      const mockInputService = {
        processInput: jest.fn().mockReturnValue(mockProcessedItem),
      };

      const mockOutputService = {
        handleOutput: jest.fn().mockResolvedValue(undefined),
      };

      const orchestrator = new InputProcessingOrchestrator(
        mockInputService as any,
        mockOutputService as any,
      );

      // Execute
      await orchestrator.processAndHandle(mockInputItem);

      // Verify
      expect(mockInputService.processInput).toHaveBeenCalledWith(mockInputItem);
      expect(mockOutputService.handleOutput).toHaveBeenCalledWith(
        mockProcessedItem,
      );
    });

    test("should propagate errors in the workflow", async () => {
      // Setup
      const testError = new Error("Test error");
      const mockInputService = {
        processInput: jest.fn().mockImplementation(() => {
          throw testError;
        }),
      };

      const mockOutputService = {
        handleOutput: jest.fn(),
      };

      const orchestrator = new InputProcessingOrchestrator(
        mockInputService as any,
        mockOutputService as any,
      );

      const mockInputItem = new MockInputItem(InputSource.EMAIL, {
        text: "Test content",
      });

      // Execute & Verify
      await expect(
        orchestrator.processAndHandle(mockInputItem),
      ).rejects.toThrow(testError);
      expect(mockInputService.processInput).toHaveBeenCalledWith(mockInputItem);
      expect(mockOutputService.handleOutput).not.toHaveBeenCalled();
    });
  });
});
