import { CalendarHandler } from "../destination-handlers";
import { IProcessedItem, IInputItem } from "../../core/interfaces";
import {
  DestinationType,
  ItemNature,
  InputSource,
} from "../../core/types/enums";

describe("CalendarHandler", () => {
  // Mock console.log to avoid cluttering test output
  const originalConsoleLog = console.log;

  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  let handler: CalendarHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new CalendarHandler();
  });

  describe("constructor", () => {
    test("should initialize with correct destination type", () => {
      // Access the protected destinationType property for testing
      expect((handler as any).destinationType).toBe(DestinationType.CALENDAR);
    });
  });

  describe("canHandle", () => {
    test("should return true for processed items with Calendar destination", () => {
      // Create a mock processed item with Calendar destination
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.POTENTIAL_EVENT,
        extractedData: {},
        suggestedDestination: DestinationType.CALENDAR,
      };

      expect(handler.canHandle(mockProcessedItem)).toBe(true);
    });

    test("should return false for processed items with non-Calendar destination", () => {
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
    test("should process an event with all properties", async () => {
      // Create dates for testing
      const startDateTime = new Date("2023-12-31T14:00:00");
      const endDateTime = new Date("2023-12-31T15:30:00");

      // Create a complete mock processed item
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.POTENTIAL_EVENT,
        extractedData: {
          title: "Test Event",
          description: "This is a test event description",
          startDateTime,
          endDateTime,
          location: "Conference Room A",
          attendees: ["John Doe", "Jane Smith"],
        },
        suggestedDestination: DestinationType.CALENDAR,
      };

      // Mock private methods
      const simulateUserConfirmationSpy = jest
        .spyOn(handler as any, "simulateUserConfirmation")
        .mockResolvedValue(true);

      const createCalendarEventSpy = jest
        .spyOn(handler as any, "createCalendarEvent")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted event output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Event for Calendar");
      expect(logOutput).toContain("Test Event");
      expect(logOutput).toContain("This is a test event description");
      expect(logOutput).toContain(startDateTime.toLocaleString());
      expect(logOutput).toContain(endDateTime.toLocaleString());
      expect(logOutput).toContain("Conference Room A");
      expect(logOutput).toContain("John Doe, Jane Smith");

      // Verify that the private methods were called
      expect(simulateUserConfirmationSpy).toHaveBeenCalled();
      expect(createCalendarEventSpy).toHaveBeenCalledWith(
        "Test Event",
        "This is a test event description",
        startDateTime,
        endDateTime,
        "Conference Room A",
        ["John Doe", "Jane Smith"],
      );
    });

    test("should handle an event with minimal properties", async () => {
      // Create a minimal mock processed item (only title and start date)
      const startDateTime = new Date("2023-12-31T14:00:00");
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.POTENTIAL_EVENT,
        extractedData: {
          title: "Minimal Event",
          startDateTime,
        },
        suggestedDestination: DestinationType.CALENDAR,
      };

      // Mock private methods
      jest
        .spyOn(handler as any, "simulateUserConfirmation")
        .mockResolvedValue(true);
      jest
        .spyOn(handler as any, "createCalendarEvent")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted event output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for key elements in the formatted output
      expect(logOutput).toContain("## Event for Calendar");
      expect(logOutput).toContain("Minimal Event");
      expect(logOutput).toContain(startDateTime.toLocaleString());
      expect(logOutput).toContain("Not specified"); // End time
      expect(logOutput).not.toContain("### Location"); // No location
      expect(logOutput).toContain("None"); // No attendees
    });

    test("should handle an event with undefined title", async () => {
      // Create a processed item with undefined title but with start date
      const startDateTime = new Date("2023-12-31T14:00:00");
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.POTENTIAL_EVENT,
        extractedData: {
          startDateTime,
        },
        suggestedDestination: DestinationType.CALENDAR,
      };

      // Mock private methods
      jest
        .spyOn(handler as any, "simulateUserConfirmation")
        .mockResolvedValue(true);
      jest
        .spyOn(handler as any, "createCalendarEvent")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that console.log was called with formatted event output
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];

      // Check for fallback title
      expect(logOutput).toContain("Untitled Event");
    });

    test("should not create calendar event if user doesn't confirm", async () => {
      // Create a mock processed item
      const startDateTime = new Date("2023-12-31T14:00:00");
      const mockProcessedItem: IProcessedItem = {
        originalInput: createMockInputItem(),
        determinedNature: ItemNature.POTENTIAL_EVENT,
        extractedData: {
          title: "Test Event",
          startDateTime,
        },
        suggestedDestination: DestinationType.CALENDAR,
      };

      // Mock private methods
      jest
        .spyOn(handler as any, "simulateUserConfirmation")
        .mockResolvedValue(false);
      const createCalendarEventSpy = jest
        .spyOn(handler as any, "createCalendarEvent")
        .mockResolvedValue(undefined);

      // Handle the processed item
      await handler.handle(mockProcessedItem);

      // Verify that createCalendarEvent was not called
      expect(createCalendarEventSpy).not.toHaveBeenCalled();
    });

    test("should handle date/time formats correctly", async () => {
      // Create various date/time formats
      const testCases = [
        { dateTime: null, expected: "Not specified" },
        { dateTime: "2023-12-15T14:00:00", expected: "Not specified" }, // String dates not processed
        {
          dateTime: new Date("2023-12-15T14:00:00"),
          expected: new Date("2023-12-15T14:00:00").toLocaleString(),
        },
      ];

      for (const { dateTime, expected } of testCases) {
        // Reset mocks
        jest.clearAllMocks();

        // Create a mock processed item with the date/time
        const mockProcessedItem: IProcessedItem = {
          originalInput: createMockInputItem(),
          determinedNature: ItemNature.POTENTIAL_EVENT,
          extractedData: {
            title: "Date Test Event",
            startDateTime: dateTime,
            endDateTime: dateTime,
          },
          suggestedDestination: DestinationType.CALENDAR,
        };

        // Mock private methods to avoid side effects
        jest
          .spyOn(handler as any, "simulateUserConfirmation")
          .mockResolvedValue(false);

        // Handle the processed item
        await handler.handle(mockProcessedItem);

        // Verify output contains expected date/time format
        expect(console.log).toHaveBeenCalled();
        const logOutput = (console.log as jest.Mock).mock.calls[0][0];

        if (expected === "Not specified") {
          expect(logOutput).toContain(expected);
        } else {
          // For Date objects, just verify it contains a date string (ignore exact format)
          expect(logOutput).toContain(expected);
        }
      }
    });
  });

  describe("simulateUserConfirmation", () => {
    test("should return a resolved promise with true", async () => {
      // Access the private method using type assertion
      const result = await (handler as any).simulateUserConfirmation("test");

      // It should resolve with true
      expect(result).toBe(true);
    });
  });

  describe("createCalendarEvent", () => {
    test("should log event details and return a resolved promise", async () => {
      // Test data
      const title = "Test Event";
      const description = "Test Description";
      const startDateTime = new Date("2023-12-31T14:00:00");
      const endDateTime = new Date("2023-12-31T15:30:00");
      const location = "Test Location";
      const attendees = ["Person 1", "Person 2"];

      // Call the private method using type assertion
      await (handler as any).createCalendarEvent(
        title,
        description,
        startDateTime,
        endDateTime,
        location,
        attendees,
      );

      // Verify console.log was called with event details
      expect(console.log).toHaveBeenCalledWith(
        "Creating calendar event:",
        expect.objectContaining({
          title,
          description,
          startDateTime,
          endDateTime,
          location,
          attendees,
        }),
      );
    });
  });
});

// Helper function to create a mock input item
function createMockInputItem(): IInputItem {
  return {
    source: InputSource.MANUAL_ENTRY,
    rawContent: "test content",
    timestamp: new Date(),
    getPotentialNature: () => ItemNature.POTENTIAL_EVENT,
  };
}
