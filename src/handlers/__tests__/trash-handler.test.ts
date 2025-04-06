import { TrashHandler } from "../destination-handlers";
import { IProcessedItem, IInputItem } from "../../core/interfaces";
import {
  DestinationType,
  ItemNature,
  InputSource,
} from "../../core/types/enums";

describe("TrashHandler", () => {
  // Mock console.log to avoid cluttering test output
  const originalConsoleLog = console.log;

  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  let handler: TrashHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TrashHandler();
  });

  describe("constructor", () => {
    test("should initialize with correct destination type", () => {
      // Access the protected destinationType property for testing
      expect((handler as any).destinationType).toBe(DestinationType.NONE);
    });
  });

  describe("canHandle", () => {
    test("should return true for processed items with NONE destination", () => {
      // Create a mock processed item with NONE destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.TRASH,
        extractedData: {},
        suggestedDestination: DestinationType.NONE,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(true);
    });

    test("should return false for processed items with non-NONE destination", () => {
      // Create a mock processed item with Todoist destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {},
        suggestedDestination: DestinationType.TODOIST,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(false);
    });
  });

  describe("handle", () => {
    test("should process a trash item with title", async () => {
      // Create a mock processed item with title
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.TRASH,
        extractedData: {
          title: "Trash Item",
        },
        suggestedDestination: DestinationType.NONE,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Item Ignored");
      expect(logOutput).toContain("Trash Item");
      expect(logOutput).toContain(
        "This item has been classified as not requiring any action",
      );
    });

    test("should handle a trash item with undefined title", async () => {
      // Create a processed item with undefined title
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.TRASH,
        extractedData: {},
        suggestedDestination: DestinationType.NONE,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for fallback title
      expect(logOutput).toContain("Untitled Item");
    });

    test("should resolve immediately without user interaction", async () => {
      // Create a mock processed item
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.TRASH,
        extractedData: {
          title: "Ignored Item",
        },
        suggestedDestination: DestinationType.NONE,
      };

      // Create a promise that resolves when handle completes
      const handlePromise = handler.handle(mockProcessedItem);

      // Verify that the promise resolves without error
      await expect(handlePromise).resolves.toBeUndefined();
    });

    test("should not have a simulateUserInteraction method", () => {
      // Verify that the handler doesn't have this method (unlike other handlers)
      expect((handler as any).simulateUserInteraction).toBeUndefined();
    });
  });
});

// Helper function to create a mock input item
function createMockInputItem(): IInputItem {
  return {
    source: InputSource.MANUAL_ENTRY,
    rawContent: "test content",
    timestamp: new Date(),
    getPotentialNature: () => ItemNature.TRASH,
  };
}
