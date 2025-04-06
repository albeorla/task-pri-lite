import { TodoistHandler } from "../destination-handlers";
import { IProcessedItem, IInputItem } from "../../core/interfaces";
import {
  DestinationType,
  ItemNature,
  InputSource,
} from "../../core/types/enums";

describe("TodoistHandler", () => {
  // Mock console.log to avoid cluttering test output
  const originalConsoleLog = console.log;

  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  let handler: TodoistHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TodoistHandler();
  });

  describe("constructor", () => {
    test("should initialize with correct destination type", () => {
      // Access the protected destinationType property for testing
      expect((handler as any).destinationType).toBe(DestinationType.TODOIST);
    });
  });

  describe("canHandle", () => {
    test("should return true for processed items with Todoist destination", () => {
      // Create a mock processed item with Todoist destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {},
        suggestedDestination: DestinationType.TODOIST,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(true);
    });

    test("should return false for processed items with non-Todoist destination", () => {
      // Create a mock processed item with Calendar destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.POTENTIAL_EVENT,
        extractedData: {},
        suggestedDestination: DestinationType.CALENDAR,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(false);
    });
  });

  describe("handle", () => {
    test("should process a task with all properties", async () => {
      // Create a complete mock processed item
      const dueDate = new Date("2023-12-31");
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {
          title: "Test Task",
          description: "This is a test task description",
          dueDate,
          priority: 1, // High priority
        },
        suggestedDestination: DestinationType.TODOIST,
      };

      // Mock simulateUserInteraction to test it's called
      const simulateUserInteractionSpy = jest
        .spyOn(handler as any, "simulateUserInteraction")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted task output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Task for Todoist");
      expect(logOutput).toContain("Test Task");
      expect(logOutput).toContain("This is a test task description");
      expect(logOutput).toContain("2023-12-31"); // Due date
      expect(logOutput).toContain("High"); // Priority

      // Verify that simulateUserInteraction was called
      expect(simulateUserInteractionSpy).toHaveBeenCalled();
    });

    test("should handle a task with minimal properties", async () => {
      // Create a minimal mock processed item (only title)
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {
          title: "Minimal Task",
        },
        suggestedDestination: DestinationType.TODOIST,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted task output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Task for Todoist");
      expect(logOutput).toContain("Minimal Task");
      expect(logOutput).toContain("None"); // Default priority
      expect(logOutput).not.toContain("### Description"); // No description
      expect(logOutput).not.toContain("### Due Date"); // No due date
    });

    test("should handle a task with undefined title", async () => {
      // Create a processed item with undefined title
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {},
        suggestedDestination: DestinationType.TODOIST,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted task output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for fallback title
      expect(logOutput).toContain("Untitled Task");
    });

    test("should handle date formats properly", async () => {
      // Create a mock processed item with various date formats
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {
          title: "Date Test Task",
          dueDate: "2023-12-15", // String date
        },
        suggestedDestination: DestinationType.TODOIST,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify string date was handled correctly
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain("2023-12-15");
    });

    test("should handle priority mapping correctly", async () => {
      // Test all priority levels
      const priorities = [
        { level: 1, expected: "High" },
        { level: 2, expected: "Medium" },
        { level: 3, expected: "Low" },
        { level: 4, expected: "None" },
      ];

      for (const { level, expected } of priorities) {
        // Reset mocks
        jest.clearAllMocks();

        // Create a mock processed item with the priority
        const mockProcessedItem: IProcessedItem = {
          originalInput: createMockInputItem(),
          determinedNature: ItemNature.ACTIONABLE_TASK,
          extractedData: {
            title: `Priority ${level} Task`,
            priority: level,
          },
          suggestedDestination: DestinationType.TODOIST,
        };

        // Handle the processed item
        await handler.handle(mockProcessedItem);

        // Verify priority was mapped correctly
        expect(console.log).toHaveBeenCalled();
        const logOutput = (console.log as jest.Mock).mock.calls[0][0];
        expect(logOutput).toContain(expected);
      }
    });

    test("should handle invalid priority value", async () => {
      // Create a mock processed item with invalid priority
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.ACTIONABLE_TASK,
        extractedData: {
          title: "Invalid Priority Task",
          priority: 999, // Invalid value
        },
        suggestedDestination: DestinationType.TODOIST,
      };

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify fallback to "None"
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain("None");
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
    getPotentialNature: () => ItemNature.ACTIONABLE_TASK,
  };
}
