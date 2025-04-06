import { ReviewLaterHandler } from "../destination-handlers";
import { IProcessedItem, IInputItem } from "../../core/interfaces";
import {
  DestinationType,
  ItemNature,
  InputSource,
} from "../../core/types/enums";

describe("ReviewLaterHandler", () => {
  // Mock console.log to avoid cluttering test output
  const originalConsoleLog = console.log;

  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  let handler: ReviewLaterHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ReviewLaterHandler();
  });

  describe("constructor", () => {
    test("should initialize with correct destination type", () => {
      // Access the protected destinationType property for testing
      expect((handler as any).destinationType).toBe(
        DestinationType.REVIEW_LATER,
      );
    });
  });

  describe("canHandle", () => {
    test("should return true for processed items with ReviewLater destination", () => {
      // Create a mock processed item with ReviewLater destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(true);
    });

    test("should return false for processed items with non-ReviewLater destination", () => {
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
    test("should process an unclear item with all properties", async () => {
      // Create a complete mock processed item
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {
          title: "Unclear Item",
          content: "This is an unclear item that needs review",
        },
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Mock simulateUserInteraction to test it's called
      const simulateUserInteractionSpy = jest
        .spyOn(handler as any, "simulateUserInteraction")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Item for Review");
      expect(logOutput).toContain("Unclear Item");
      expect(logOutput).toContain("This is an unclear item that needs review");
      expect(logOutput).toContain(
        "This item couldn't be automatically classified",
      );

      // Verify that simulateUserInteraction was called
      expect(simulateUserInteractionSpy).toHaveBeenCalled();
    });

    test("should handle an unclear item with minimal properties", async () => {
      // Create a minimal mock processed item (only title)
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {
          title: "Minimal Unclear Item",
        },
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Item for Review");
      expect(logOutput).toContain("Minimal Unclear Item");
      expect(logOutput).not.toContain("### Content"); // No content
    });

    test("should handle an unclear item with undefined title", async () => {
      // Create a processed item with undefined title
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {
          content: "Some content without a title",
        },
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for fallback title
      expect(logOutput).toContain("Untitled Item");
    });

    test("should handle an unclear item with undefined content", async () => {
      // Create a processed item with undefined content
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {
          title: "No Content Item",
        },
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check that there's no content section
      expect(logOutput).not.toContain("### Content");
    });

    test("should handle completely empty extracted data", async () => {
      // Create a processed item with empty extractedData
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.UNCLEAR,
        extractedData: {},
        suggestedDestination: DestinationType.REVIEW_LATER,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted notification
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for fallback title and no content
      expect(logOutput).toContain("Untitled Item");
      expect(logOutput).not.toContain("### Content");
    });
  });

  describe("simulateUserInteraction", () => {
    test("should return a resolved promise", async () => {
      // Access the private method using type assertion
      const result = await (handler as any).simulateUserInteraction("test");

      // It should resolve with undefined
      expect(result).toBeUndefined();
    });
  });
});

// Helper function to create a mock input item
function createMockInputItem(): IInputItem {
  return {
    source: InputSource.MANUAL_ENTRY,
    rawContent: "test content",
    timestamp: new Date(),
    getPotentialNature: () => ItemNature.UNCLEAR,
  };
}
