import { BaseDestinationHandler } from "../destination-handlers";
import { DestinationType } from "../../core/types/enums";

// Create a concrete implementation of BaseDestinationHandler for testing
class TestDestinationHandler extends BaseDestinationHandler {
  constructor(destinationType: DestinationType) {
    super(destinationType);
  }

  // Add a method to expose the protected destinationType property
  public getDestinationType(): DestinationType {
    return this.destinationType;
  }
}

describe("BaseDestinationHandler", () => {
  describe("constructor", () => {
    test("should initialize with provided destination type", () => {
      const todoist = new TestDestinationHandler(DestinationType.TODOIST);
      const calendar = new TestDestinationHandler(DestinationType.CALENDAR);
      const markdown = new TestDestinationHandler(DestinationType.MARKDOWN);
      const reviewLater = new TestDestinationHandler(
        DestinationType.REVIEW_LATER,
      );
      const none = new TestDestinationHandler(DestinationType.NONE);

      // Verify that the destination type is correctly stored
      expect(todoist.getDestinationType()).toBe(DestinationType.TODOIST);
      expect(calendar.getDestinationType()).toBe(DestinationType.CALENDAR);
      expect(markdown.getDestinationType()).toBe(DestinationType.MARKDOWN);
      expect(reviewLater.getDestinationType()).toBe(
        DestinationType.REVIEW_LATER,
      );
      expect(none.getDestinationType()).toBe(DestinationType.NONE);
    });
  });
});
