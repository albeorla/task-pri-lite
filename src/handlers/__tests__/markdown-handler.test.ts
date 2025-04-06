import { MarkdownHandler } from "../destination-handlers";
import { IProcessedItem, IInputItem } from "../../core/interfaces";
import {
  DestinationType,
  ItemNature,
  InputSource,
} from "../../core/types/enums";

describe("MarkdownHandler", () => {
  // Mock console.log to avoid cluttering test output
  const originalConsoleLog = console.log;

  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  let handler: MarkdownHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new MarkdownHandler();
  });

  describe("constructor", () => {
    test("should initialize with correct destination type", () => {
      // Access the protected destinationType property for testing
      expect((handler as any).destinationType).toBe(DestinationType.MARKDOWN);
    });
  });

  describe("canHandle", () => {
    test("should return true for processed items with Markdown destination", () => {
      // Create a mock processed item with Markdown destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {},
        suggestedDestination: DestinationType.MARKDOWN,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(true);
    });

    test("should return false for processed items with non-Markdown destination", () => {
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
    test("should process a reference with all properties", async () => {
      // Create a complete mock processed item
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {
          title: "Test Reference",
          content: "This is a test reference content",
          urls: ["https://example.com/doc1", "https://example.com/doc2"],
          tags: ["reference", "documentation", "test"],
        },
        suggestedDestination: DestinationType.MARKDOWN,
      };

      // Mock simulateUserInteraction to test it's called
      const simulateUserInteractionSpy = jest
        .spyOn(handler as any, "simulateUserInteraction")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted markdown output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("# Test Reference");
      expect(logOutput).toContain("## Content");
      expect(logOutput).toContain("This is a test reference content");
      expect(logOutput).toContain("### URLs");
      expect(logOutput).toContain(
        "[https://example.com/doc1](https://example.com/doc1)",
      );
      expect(logOutput).toContain(
        "[https://example.com/doc2](https://example.com/doc2)",
      );
      expect(logOutput).toContain("### Tags");
      expect(logOutput).toContain("#reference #documentation #test");

      // Verify that simulateUserInteraction was called
      expect(simulateUserInteractionSpy).toHaveBeenCalled();
    });

    test("should handle a reference with minimal properties", async () => {
      // Create a minimal mock processed item (only title)
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {
          title: "Minimal Reference",
        },
        suggestedDestination: DestinationType.MARKDOWN,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted markdown output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("# Minimal Reference");
      expect(logOutput).not.toContain("## Content"); // No content
      expect(logOutput).not.toContain("### URLs"); // No URLs
      expect(logOutput).not.toContain("### Tags"); // No tags
    });

    test("should handle a reference with undefined title", async () => {
      // Create a processed item with undefined title
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {
          content: "Some content without a title",
        },
        suggestedDestination: DestinationType.MARKDOWN,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted markdown output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for fallback title
      expect(logOutput).toContain("# Untitled Reference");
    });

    test("should format URLs as markdown links", async () => {
      // Create a processed item with URLs
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {
          title: "URL Test",
          urls: ["https://example.com", "https://test.org/path?query=param"],
        },
        suggestedDestination: DestinationType.MARKDOWN,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify links are formatted correctly
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      expect(logOutput).toContain("[https://example.com](https://example.com)");
      expect(logOutput).toContain(
        "[https://test.org/path?query=param](https://test.org/path?query=param)",
      );
    });

    test("should format tags with hash symbols", async () => {
      // Create a processed item with tags
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {
          title: "Tag Test",
          tags: ["tag1", "tag2", "complex-tag"],
        },
        suggestedDestination: DestinationType.MARKDOWN,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify tags are formatted correctly
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      expect(logOutput).toContain("#tag1 #tag2 #complex-tag");
    });

    test("should handle empty arrays for URLs and tags", async () => {
      // Create a processed item with empty arrays
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.REFERENCE_INFO,
        extractedData: {
          title: "Empty Arrays Test",
          urls: [],
          tags: [],
        },
        suggestedDestination: DestinationType.MARKDOWN,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify no URL or tag sections
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      expect(logOutput).not.toContain("### URLs");
      expect(logOutput).not.toContain("### Tags");
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
    getPotentialNature: () => ItemNature.REFERENCE_INFO,
  };
}
