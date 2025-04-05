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
} from "../../core/interfaces";
import {
  InputSource,
  ItemNature,
  DestinationType,
} from "../../core/types/enums";

// Create a mock implementation of IInputItem for testing
class MockInputItem implements IInputItem {
  source: InputSource;
  rawContent: any;
  timestamp: Date;

  constructor(
    source: InputSource,
    rawContent: any,
    timestamp: Date = new Date(),
  ) {
    this.source = source;
    this.rawContent = rawContent;
    this.timestamp = timestamp;
  }

  // Implementation of the required method
  getPotentialNature(): ItemNature {
    return ItemNature.UNCLEAR;
  }
}

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

    // Mock processor that always returns true for canProcess
    const mockProcessor: IInputProcessor = {
      canProcess: jest.fn().mockReturnValue(true),
      process: jest.fn().mockImplementation((item) => ({
        originalInput: item,
        determinedNature: ItemNature.ACTIONABLE_TASK,
        suggestedDestination: DestinationType.TODOIST,
        extractedData: {},
      })),
    };

    // Mock processor that always returns false for canProcess
    const mockNonMatchingProcessor: IInputProcessor = {
      canProcess: jest.fn().mockReturnValue(false),
      process: jest.fn(),
    };

    beforeEach(() => {
      inputService = new InputProcessingService();
      jest.clearAllMocks();
    });

    test("should use first processor that can handle the input", () => {
      // Setup
      const mockInput = new MockInputItem(InputSource.EMAIL, {
        text: "Test content",
      });

      inputService.addProcessor(mockNonMatchingProcessor);
      inputService.addProcessor(mockProcessor);

      // Execute
      const result = inputService.processInput(mockInput);

      // Verify
      expect(mockNonMatchingProcessor.canProcess).toHaveBeenCalledWith(
        mockInput,
      );
      expect(mockProcessor.canProcess).toHaveBeenCalledWith(mockInput);
      expect(mockNonMatchingProcessor.process).not.toHaveBeenCalled();
      expect(mockProcessor.process).toHaveBeenCalledWith(mockInput);
      expect(result.determinedNature).toBe(ItemNature.ACTIONABLE_TASK);
    });

    test("should throw error when no processor can handle input", () => {
      // Setup
      const mockInput = new MockInputItem(InputSource.EMAIL, {
        text: "Test content",
      });

      inputService.addProcessor(mockNonMatchingProcessor);

      // Execute & Verify
      expect(() => inputService.processInput(mockInput)).toThrow(
        "No processor found that can handle the input",
      );
    });
  });

  describe("OutputHandlingService", () => {
    let outputService: OutputHandlingService;

    // Mock handler that always returns true for canHandle
    const mockHandler: IDestinationHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };

    // Mock handler that always returns false for canHandle
    const mockNonMatchingHandler: IDestinationHandler = {
      canHandle: jest.fn().mockReturnValue(false),
      handle: jest.fn(),
    };

    beforeEach(() => {
      outputService = new OutputHandlingService();
      jest.clearAllMocks();
    });

    test("should use first handler that can handle the output", async () => {
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

      outputService.addHandler(mockNonMatchingHandler);
      outputService.addHandler(mockHandler);

      // Execute
      await outputService.handleOutput(mockProcessedItem);

      // Verify
      expect(mockNonMatchingHandler.canHandle).toHaveBeenCalledWith(
        mockProcessedItem,
      );
      expect(mockHandler.canHandle).toHaveBeenCalledWith(mockProcessedItem);
      expect(mockNonMatchingHandler.handle).not.toHaveBeenCalled();
      expect(mockHandler.handle).toHaveBeenCalledWith(mockProcessedItem);
    });

    test("should throw error when no handler can handle output", async () => {
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

      outputService.addHandler(mockNonMatchingHandler);

      // Execute & Verify
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
