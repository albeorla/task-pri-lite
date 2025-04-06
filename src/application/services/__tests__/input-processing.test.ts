import { InputProcessingService } from "../input-processing";
import {
  IInputItem,
  IInputProcessor,
  IProcessedItem,
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

describe("InputProcessingService", () => {
  // Mock console.log to avoid cluttering test output
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

  let service: InputProcessingService;

  beforeEach(() => {
    service = new InputProcessingService();
  });

  describe("constructor", () => {
    test("should initialize with empty processors array by default", () => {
      expect((service as any).processors).toEqual([]);
    });

    test("should initialize with provided processors", () => {
      const processor1: IInputProcessor = {
        canProcess: jest.fn(),
        process: jest.fn(),
      };

      const processor2: IInputProcessor = {
        canProcess: jest.fn(),
        process: jest.fn(),
      };

      const serviceWithProcessors = new InputProcessingService([
        processor1,
        processor2,
      ]);
      expect((serviceWithProcessors as any).processors).toHaveLength(2);
      expect((serviceWithProcessors as any).processors[0]).toBe(processor1);
      expect((serviceWithProcessors as any).processors[1]).toBe(processor2);
    });
  });

  describe("addProcessor", () => {
    test("should add a processor to the chain", () => {
      const processor: IInputProcessor = {
        canProcess: jest.fn(),
        process: jest.fn(),
      };

      service.addProcessor(processor);
      expect((service as any).processors).toHaveLength(1);
      expect((service as any).processors[0]).toBe(processor);
    });

    test("should add multiple processors in the correct order", () => {
      const processor1: IInputProcessor = {
        canProcess: jest.fn(),
        process: jest.fn(),
      };

      const processor2: IInputProcessor = {
        canProcess: jest.fn(),
        process: jest.fn(),
      };

      service.addProcessor(processor1);
      service.addProcessor(processor2);

      expect((service as any).processors).toHaveLength(2);
      expect((service as any).processors[0]).toBe(processor1);
      expect((service as any).processors[1]).toBe(processor2);
    });
  });

  describe("processInput", () => {
    test("should use the first processor that can handle the input", () => {
      // Create test input
      const inputItem = new MockInputItem();

      // Create processors
      const processor1: IInputProcessor = {
        canProcess: jest.fn().mockReturnValue(false),
        process: jest.fn(),
      };

      const processor2: IInputProcessor = {
        canProcess: jest.fn().mockReturnValue(true),
        process: jest.fn().mockReturnValue({
          originalInput: inputItem,
          determinedNature: ItemNature.ACTIONABLE_TASK,
          extractedData: { title: "Test Task" },
          suggestedDestination: DestinationType.TODOIST,
        }),
      };

      const processor3: IInputProcessor = {
        canProcess: jest.fn().mockReturnValue(true),
        process: jest.fn(),
      };

      // Add processors to service
      service.addProcessor(processor1);
      service.addProcessor(processor2);
      service.addProcessor(processor3);

      // Process input
      const result = service.processInput(inputItem);

      // Verify
      expect(processor1.canProcess).toHaveBeenCalledWith(inputItem);
      expect(processor2.canProcess).toHaveBeenCalledWith(inputItem);
      expect(processor3.canProcess).not.toHaveBeenCalled();

      expect(processor1.process).not.toHaveBeenCalled();
      expect(processor2.process).toHaveBeenCalledWith(inputItem);
      expect(processor3.process).not.toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result?.determinedNature).toBe(ItemNature.ACTIONABLE_TASK);
      expect(result?.suggestedDestination).toBe(DestinationType.TODOIST);
    });

    test("should return null when no processor can handle the input", () => {
      // Create test input
      const inputItem = new MockInputItem();

      // Create processor that cannot handle the input
      const processor: IInputProcessor = {
        canProcess: jest.fn().mockReturnValue(false),
        process: jest.fn(),
      };

      // Add processor to service
      service.addProcessor(processor);

      // Process input
      const result = service.processInput(inputItem);

      // Verify
      expect(processor.canProcess).toHaveBeenCalledWith(inputItem);
      expect(processor.process).not.toHaveBeenCalled();
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "No processor found that can process the input",
      );
    });

    test("should log input processing", () => {
      // Create test input
      const inputItem = new MockInputItem(
        InputSource.EMAIL,
        "Test email content",
      );

      // Process input (will return null since no processors)
      service.processInput(inputItem);

      // Verify logging
      expect(console.log).toHaveBeenCalledWith(
        "Processing input: Test email content",
      );
    });
  });
});
