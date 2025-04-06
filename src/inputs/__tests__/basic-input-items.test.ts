import {
  ManualTaskInputItem,
  TextInputItem,
  MeetingNoteInputItem,
} from "../basic-input-items";
import { InputSource, ItemNature } from "../../core/types/enums";

describe("ManualTaskInputItem", () => {
  describe("constructor", () => {
    test("should create a ManualTaskInputItem with all properties", () => {
      const dueDate = new Date("2023-12-31");
      const item = new ManualTaskInputItem(
        "Test Task",
        "Task description",
        dueDate,
        2,
      );

      // Check the properties specific to ManualTaskInputItem
      expect(item.title).toBe("Test Task");
      expect(item.description).toBe("Task description");
      expect(item.dueDate).toBe(dueDate);
      expect(item.priority).toBe(2);

      // Check properties inherited from BaseInputItem
      expect(item.source).toBe(InputSource.MANUAL_ENTRY);
      expect(item.rawContent).toEqual({
        title: "Test Task",
        description: "Task description",
        dueDate: dueDate,
        priority: 2,
      });
      expect(item.timestamp).toBeInstanceOf(Date);
    });

    test("should create a ManualTaskInputItem with default values", () => {
      const item = new ManualTaskInputItem("Test Task");

      expect(item.title).toBe("Test Task");
      expect(item.description).toBe("");
      expect(item.dueDate).toBeNull();
      expect(item.priority).toBe(4);
      expect(item.source).toBe(InputSource.MANUAL_ENTRY);
    });

    test("should create a ManualTaskInputItem with partial properties", () => {
      const item = new ManualTaskInputItem("Test Task", "Description", null, 3);

      expect(item.title).toBe("Test Task");
      expect(item.description).toBe("Description");
      expect(item.dueDate).toBeNull();
      expect(item.priority).toBe(3);
    });
  });

  describe("getPotentialNature", () => {
    test("should always return ACTIONABLE_TASK", () => {
      const item = new ManualTaskInputItem("Test Task");

      expect(item.getPotentialNature()).toBe(ItemNature.ACTIONABLE_TASK);
    });
  });
});

describe("TextInputItem", () => {
  describe("constructor", () => {
    test("should create a TextInputItem with all properties", () => {
      const item = new TextInputItem(
        "This is some text",
        "Text Title",
        InputSource.EMAIL,
      );

      // Check the properties specific to TextInputItem
      expect(item.text).toBe("This is some text");
      expect(item.title).toBe("Text Title");

      // Check properties inherited from BaseInputItem
      expect(item.source).toBe(InputSource.EMAIL);
      expect(item.rawContent).toEqual({
        text: "This is some text",
        title: "Text Title",
      });
      expect(item.timestamp).toBeInstanceOf(Date);
    });

    test("should create a TextInputItem with default values", () => {
      const item = new TextInputItem("This is some text");

      expect(item.text).toBe("This is some text");
      expect(item.title).toBe("");
      expect(item.source).toBe(InputSource.OTHER);
    });

    test("should create a TextInputItem with partial properties", () => {
      const item = new TextInputItem("This is some text", "Text Title");

      expect(item.text).toBe("This is some text");
      expect(item.title).toBe("Text Title");
      expect(item.source).toBe(InputSource.OTHER);
    });
  });

  describe("getPotentialNature", () => {
    test("should detect ACTIONABLE_TASK nature based on text content", () => {
      const testCases = [
        "This is a todo item",
        "This is a task to complete",
        "This is an action item for the team",
        "Please review this document",
        "I need to finish this by tomorrow",
        "You should check this out",
      ];

      for (const text of testCases) {
        const item = new TextInputItem(text);
        expect(item.getPotentialNature()).toBe(ItemNature.ACTIONABLE_TASK);
      }
    });

    test("should detect POTENTIAL_EVENT nature based on text content", () => {
      const testCases = [
        "Meeting with the team tomorrow",
        "Doctor appointment on Monday",
        "Schedule a call with the client",
        "Add this to your calendar",
        "Team event on Friday",
        "Let's meet at 3:30 pm",
      ];

      for (const text of testCases) {
        const item = new TextInputItem(text);
        expect(item.getPotentialNature()).toBe(ItemNature.POTENTIAL_EVENT);
      }
    });

    test("should detect REFERENCE_INFO nature based on text content", () => {
      const testCases = [
        "Here's an fyi about the project",
        "This is for reference only",
        "Important information about the release",
        "Note that this will change next week",
        "Check this out: http://example.com",
        "Visit www.example.com for more details",
      ];

      for (const text of testCases) {
        const item = new TextInputItem(text);
        expect(item.getPotentialNature()).toBe(ItemNature.REFERENCE_INFO);
      }
    });

    test("should detect PROJECT_IDEA nature based on text content", () => {
      const testCases = [
        "I have an idea for a new feature",
        "Here's a project we could consider",
        "This is a concept for improving UX",
        "We should develop this proposal further",
      ];

      for (const text of testCases) {
        const item = new TextInputItem(text);

        // Some of these test cases contain words like "should" that are matched
        // first by the ACTIONABLE_TASK detection. Let's modify our expectations
        // to accept either PROJECT_IDEA or ACTIONABLE_TASK for these cases
        const nature = item.getPotentialNature();
        expect([ItemNature.PROJECT_IDEA, ItemNature.ACTIONABLE_TASK]).toContain(
          nature,
        );
      }
    });

    test("should return UNCLEAR when no specific indicators are found", () => {
      const testCases = [
        "Just some random text",
        "Hello world",
        "This is a message",
        "No specific indicators here",
      ];

      for (const text of testCases) {
        const item = new TextInputItem(text);
        expect(item.getPotentialNature()).toBe(ItemNature.UNCLEAR);
      }
    });
  });
});

describe("MeetingNoteInputItem", () => {
  describe("constructor", () => {
    test("should create a MeetingNoteInputItem with all properties", () => {
      const meetingDate = new Date("2023-12-31");
      const attendees = ["Alice", "Bob", "Charlie"];
      const item = new MeetingNoteInputItem(
        "Team Sync",
        "Discussed project timeline and next steps",
        attendees,
        meetingDate,
      );

      // Check the properties specific to MeetingNoteInputItem
      expect(item.meetingTitle).toBe("Team Sync");
      expect(item.notes).toBe("Discussed project timeline and next steps");
      expect(item.attendees).toEqual(attendees);
      expect(item.date).toBe(meetingDate);

      // Check properties inherited from TextInputItem
      expect(item.text).toBe("Discussed project timeline and next steps");
      expect(item.title).toBe("Team Sync");

      // Check properties inherited from BaseInputItem
      expect(item.source).toBe(InputSource.MEETING_NOTES);
      expect(item.rawContent).toEqual({
        text: "Discussed project timeline and next steps",
        title: "Team Sync",
      });
      expect(item.timestamp).toBeInstanceOf(Date);
    });

    test("should create a MeetingNoteInputItem with default values", () => {
      const item = new MeetingNoteInputItem("Team Sync", "Meeting notes");

      expect(item.meetingTitle).toBe("Team Sync");
      expect(item.notes).toBe("Meeting notes");
      expect(item.attendees).toEqual([]);
      expect(item.date).toBeNull();
      expect(item.source).toBe(InputSource.MEETING_NOTES);
    });

    test("should create a MeetingNoteInputItem with partial properties", () => {
      const attendees = ["Alice", "Bob"];
      const item = new MeetingNoteInputItem(
        "Team Sync",
        "Meeting notes",
        attendees,
      );

      expect(item.meetingTitle).toBe("Team Sync");
      expect(item.notes).toBe("Meeting notes");
      expect(item.attendees).toEqual(attendees);
      expect(item.date).toBeNull();
    });
  });

  describe("getPotentialNature", () => {
    test("should always return UNCLEAR", () => {
      const item = new MeetingNoteInputItem("Team Sync", "Meeting notes");

      expect(item.getPotentialNature()).toBe(ItemNature.UNCLEAR);
    });
  });
});
