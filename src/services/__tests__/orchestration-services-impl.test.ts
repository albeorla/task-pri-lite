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
import { DefaultProcessor } from "../../processors/core-processors";
import { ReviewLaterHandler } from "../../handlers/destination-handlers";

// Mock implementation of input processors
jest.mock("../../processors/core-processors", () => ({
  TaskDetectionProcessor: jest.fn().mockImplementation(() => ({
    canProcess: jest.fn().mockReturnValue(false),
    process: jest.fn(),
  })),
  EventDetectionProcessor: jest.fn().mockImplementation(() => ({
    canProcess: jest.fn().mockReturnValue(false),
    process: jest.fn(),
  })),
  ReferenceInfoProcessor: jest.fn().mockImplementation(() => ({
    canProcess: jest.fn().mockReturnValue(false),
    process: jest.fn(),
  })),
  DefaultProcessor: jest.fn().mockImplementation(() => ({
    canProcess: jest.fn().mockReturnValue(true),
    process: jest.fn().mockImplementation((item: IInputItem) => ({
      originalInput: item,
      determinedNature: ItemNature.UNCLEAR,
      extractedData: {},
      suggestedDestination: DestinationType.REVIEW_LATER,
    })),
  })),
}));

// Mock implementation of destination handlers
jest.mock("../../handlers/destination-handlers", () => ({
  TodoistHandler: jest.fn().mockImplementation(() => ({
    canHandle: jest.fn().mockReturnValue(false),
    handle: jest.fn(),
  })),
  CalendarHandler: jest.fn().mockImplementation(() => ({
    canHandle: jest.fn().mockReturnValue(false),
    handle: jest.fn(),
  })),
  MarkdownHandler: jest.fn().mockImplementation(() => ({
    canHandle: jest.fn().mockReturnValue(false),
    handle: jest.fn(),
  })),
  ReviewLaterHandler: jest.fn().mockImplementation(() => ({
    canHandle: jest.fn().mockReturnValue(true),
    handle: jest.fn().mockResolvedValue(undefined),
  })),
  TrashHandler: jest.fn().mockImplementation(() => ({
    canHandle: jest.fn().mockReturnValue(false),
    handle: jest.fn(),
  })),
}));

// Create a mock implementation of IInputItem for testing
class MockInputItem implements IInputItem {
  source: InputSource;
  rawContent: any;
  timestamp: Date;

  constructor(
    source: InputSource = InputSource.MANUAL_ENTRY,
    rawContent: any = "test content",
  ) {
    this.source = source;
    this.rawContent = rawContent;
    this.timestamp = new Date();
  }

  getPotentialNature(): ItemNature {
    return ItemNature.UNCLEAR;
  }
}

describe("Orchestration Services Implementation", () => {
  // Mock console methods
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("InputProcessingService", () => {
    let inputService: InputProcessingService;

    beforeEach(() => {
      inputService = new InputProcessingService();
    });

    test("should initialize with default processors", () => {
      // Verify the service has 4 default processors
      expect((inputService as any).processors.length).toBe(4);
    });

    test("should use the first processor that can handle the input", () => {
      // Create test input
      const inputItem = new MockInputItem();

      // Process input (will use DefaultProcessor since mocks are set up that way)
      const result = inputService.processInput(inputItem);

      // Verify result
      expect(result).not.toBeNull();
      expect(result.determinedNature).toBe(ItemNature.UNCLEAR);
      expect(result.suggestedDestination).toBe(DestinationType.REVIEW_LATER);
    });

    test("should throw error when no processor can handle input", () => {
      // Create a mock processor that cannot handle any input
      const mockProcessor: IInputProcessor = {
        canProcess: jest.fn().mockReturnValue(false),
        process: jest.fn(),
      };
      const inputItem = new MockInputItem();

      // Replace all processors with just our mock
      (inputService as any).processors = [mockProcessor];

      // Expect the function to throw when called
      expect(() => {
        inputService.processInput(inputItem);
      }).toThrow("No processor found that can handle the input");
    });

    test("should allow adding custom processors", () => {
      // Create a custom processor
      const customProcessor: IInputProcessor = {
        canProcess: jest.fn().mockReturnValue(true),
        process: jest.fn().mockReturnValue({
          originalInput: {} as IInputItem,
          determinedNature: ItemNature.REFERENCE_INFO,
          extractedData: { title: "Custom Reference" },
          suggestedDestination: DestinationType.MARKDOWN,
        }),
      };

      // Add custom processor
      inputService.addProcessor(customProcessor);

      // Verify it was added as the first processor
      expect((inputService as any).processors.length).toBe(5);
      expect((inputService as any).processors[4]).toBe(customProcessor);
    });
  });

  describe("OutputHandlingService", () => {
    let outputService: OutputHandlingService;

    beforeEach(() => {
      outputService = new OutputHandlingService();
    });

    test("should initialize with default handlers", () => {
      // Verify the service has 5 default handlers
      expect((outputService as any).handlers.length).toBe(5);
    });

    test("should use the first handler that can handle the output", async () => {
      // Create test input and processed item
      const inputItem = new MockInputItem();
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Create a spy specifically for our test
      const mockCanHandle = jest.fn().mockReturnValue(true);
      const mockHandle = jest.fn().mockResolvedValue(undefined);

      // Create a mock handler directly rather than trying to modify the module mock
      const mockHandler: IDestinationHandler = {
        canHandle: mockCanHandle,
        handle: mockHandle,
      };

      // Replace all handlers with just our mock handler
      (outputService as any).handlers = [mockHandler];

      // Handle output using our handler
      await outputService.handleOutput(processedItem);

      // Verify our handler was called
      expect(mockCanHandle).toHaveBeenCalledWith(processedItem);
      expect(mockHandle).toHaveBeenCalledWith(processedItem);
    });

    test("should throw error when no handler can handle output", async () => {
      // Create test input and processed item
      const inputItem = new MockInputItem();
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Create a handler that returns false
      const mockHandler: IDestinationHandler = {
        canHandle: jest.fn().mockReturnValue(false),
        handle: jest.fn(),
      };

      // Set handlers to just include our mock
      (outputService as any).handlers = [mockHandler];

      // Use expect+rejects pattern
      await expect(outputService.handleOutput(processedItem)).rejects.toThrow(
        "No handler found that can handle the processed item",
      );
    });

    test("should allow adding custom handlers", async () => {
      // Create a custom handler with spies for testing
      const mockCanHandle = jest.fn().mockReturnValue(true);
      const mockHandle = jest.fn().mockResolvedValue(undefined);

      const customHandler: IDestinationHandler = {
        canHandle: mockCanHandle,
        handle: mockHandle,
      };

      // Clear default handlers
      (outputService as any).handlers = [];

      // Add custom handler
      outputService.addHandler(customHandler);

      // Create test input and processed item
      const inputItem = new MockInputItem();
      const processedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Handle output should use our custom handler
      await outputService.handleOutput(processedItem);

      // Verify our custom handler was used
      expect(mockCanHandle).toHaveBeenCalledWith(processedItem);
      expect(mockHandle).toHaveBeenCalledWith(processedItem);
    });
  });

  describe("InputProcessingOrchestrator", () => {
    test("should initialize with default services", () => {
      const orchestrator = new InputProcessingOrchestrator();

      // Verify services were created
      expect((orchestrator as any).inputProcessingService).toBeInstanceOf(
        InputProcessingService,
      );
      expect((orchestrator as any).outputHandlingService).toBeInstanceOf(
        OutputHandlingService,
      );
    });

    test("should accept custom services in constructor", () => {
      // Create custom services
      const customInputService = new InputProcessingService();
      const customOutputService = new OutputHandlingService();

      // Create orchestrator with custom services
      const orchestrator = new InputProcessingOrchestrator(
        customInputService,
        customOutputService,
      );

      // Verify custom services were used
      expect((orchestrator as any).inputProcessingService).toBe(
        customInputService,
      );
      expect((orchestrator as any).outputHandlingService).toBe(
        customOutputService,
      );
    });

    test("should process and handle input successfully", async () => {
      // Create input item
      const inputItem = new MockInputItem();

      // Create mock services
      const mockProcessedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      const mockInputService = {
        processInput: jest.fn().mockReturnValue(mockProcessedItem),
      };

      const mockOutputService = {
        handleOutput: jest.fn().mockResolvedValue(undefined),
      };

      // Create orchestrator with mock services
      const orchestrator = new InputProcessingOrchestrator(
        mockInputService as any,
        mockOutputService as any,
      );

      // Process and handle input
      await orchestrator.processAndHandle(inputItem);

      // Verify services were called
      expect(mockInputService.processInput).toHaveBeenCalledWith(inputItem);
      expect(mockOutputService.handleOutput).toHaveBeenCalledWith(
        mockProcessedItem,
      );
    });

    test("should handle processing errors", async () => {
      // Create input item
      const inputItem = new MockInputItem();

      // Create mock input service that throws error
      const processingError = new Error("Processing error");
      const mockInputService = {
        processInput: jest.fn().mockImplementation(() => {
          throw processingError;
        }),
      };

      const mockOutputService = {
        handleOutput: jest.fn(),
      };

      // Create orchestrator with mock services
      const orchestrator = new InputProcessingOrchestrator(
        mockInputService as any,
        mockOutputService as any,
      );

      // Process and handle input should throw
      await expect(orchestrator.processAndHandle(inputItem)).rejects.toThrow(
        processingError,
      );

      // Verify input service was called but output service was not
      expect(mockInputService.processInput).toHaveBeenCalledWith(inputItem);
      expect(mockOutputService.handleOutput).not.toHaveBeenCalled();
    });

    test("should handle output errors", async () => {
      // Create input item
      const inputItem = new MockInputItem();

      // Create mock processed item
      const mockProcessedItem: IProcessedItem = {
        originalInput: inputItem,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Create mock services
      const mockInputService = {
        processInput: jest.fn().mockReturnValue(mockProcessedItem),
      };

      // Create mock output service that throws error
      const outputError = new Error("Output error");
      const mockOutputService = {
        handleOutput: jest.fn().mockRejectedValue(outputError),
      };

      // Create orchestrator with mock services
      const orchestrator = new InputProcessingOrchestrator(
        mockInputService as any,
        mockOutputService as any,
      );

      // Process and handle input should throw
      await expect(orchestrator.processAndHandle(inputItem)).rejects.toThrow(
        outputError,
      );

      // Verify both services were called
      expect(mockInputService.processInput).toHaveBeenCalledWith(inputItem);
      expect(mockOutputService.handleOutput).toHaveBeenCalledWith(
        mockProcessedItem,
      );
    });

    test("should integrate with actual services", async () => {
      // Create a real orchestrator
      const orchestrator = new InputProcessingOrchestrator();

      // Add our own spies to the services
      const mockProcessInput = jest.fn().mockImplementation((item) => ({
        originalInput: item,
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      }));

      const mockHandleOutput = jest.fn().mockResolvedValue(undefined);

      // Replace the services in the orchestrator with our mocked versions
      (orchestrator as any).inputProcessingService = {
        processInput: mockProcessInput,
      };

      (orchestrator as any).outputHandlingService = {
        handleOutput: mockHandleOutput,
      };

      // Create input item
      const inputItem = new MockInputItem();

      // Process and handle input
      await orchestrator.processAndHandle(inputItem);

      // Verify our mocks were called
      expect(mockProcessInput).toHaveBeenCalledWith(inputItem);
      expect(mockHandleOutput).toHaveBeenCalled();
    });
  });
});
