/**
 * Basic Input Item Classes for Input Processing System
 *
 * This file implements the basic input item classes that are part of the MVP.
 */

import { BaseInputItem } from "../abstracts/base-classes";
import { InputSource, ItemNature } from "../core/types/enums";

/**
 * Input item for manual task entry
 * Priority: P0
 */
export class ManualTaskInputItem extends BaseInputItem {
  /**
   * Constructs a new ManualTaskInputItem
   * @param title The task title
   * @param description Optional task description
   * @param dueDate Optional due date
   * @param priority Optional priority (1-4, where 1 is highest)
   */
  constructor(
    public title: string,
    public description: string = "",
    public dueDate: Date | null = null,
    public priority: number = 4,
  ) {
    super(InputSource.MANUAL_ENTRY, {
      title,
      description,
      dueDate,
      priority,
    });
  }

  /**
   * Gets the potential nature of this item
   * @returns Always returns ACTIONABLE_TASK for manual task items
   */
  public getPotentialNature(): ItemNature {
    return ItemNature.ACTIONABLE_TASK;
  }
}

/**
 * Input item for generic text content
 * Priority: P0
 */
export class TextInputItem extends BaseInputItem {
  /**
   * Constructs a new TextInputItem
   * @param text The text content
   * @param title Optional title for the text
   * @param source The source of the text (defaults to OTHER)
   */
  constructor(
    public text: string,
    public title: string = "",
    source: InputSource = InputSource.OTHER,
  ) {
    super(source, {
      text,
      title,
    });
  }

  /**
   * Gets the potential nature of this item
   * @returns A guess at the nature based on text content
   */
  public getPotentialNature(): ItemNature {
    // Simple heuristic for guessing nature based on text content
    const lowerText = this.text.toLowerCase();

    // Check for task indicators
    if (
      lowerText.includes("todo") ||
      lowerText.includes("task") ||
      lowerText.includes("action item") ||
      lowerText.includes("please") ||
      lowerText.includes("need to") ||
      lowerText.includes("should")
    ) {
      return ItemNature.ACTIONABLE_TASK;
    }

    // Check for event indicators
    if (
      lowerText.includes("meeting") ||
      lowerText.includes("appointment") ||
      lowerText.includes("schedule") ||
      lowerText.includes("calendar") ||
      lowerText.includes("event") ||
      (lowerText.includes("at") &&
        /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(lowerText))
    ) {
      return ItemNature.POTENTIAL_EVENT;
    }

    // Check for reference indicators
    if (
      lowerText.includes("fyi") ||
      lowerText.includes("reference") ||
      lowerText.includes("information") ||
      lowerText.includes("note that") ||
      lowerText.includes("http") ||
      lowerText.includes("www")
    ) {
      return ItemNature.REFERENCE_INFO;
    }

    // Check for project idea indicators
    if (
      lowerText.includes("idea") ||
      lowerText.includes("project") ||
      lowerText.includes("concept") ||
      lowerText.includes("proposal")
    ) {
      return ItemNature.PROJECT_IDEA;
    }

    // Default to UNCLEAR if no specific indicators are found
    return ItemNature.UNCLEAR;
  }
}

/**
 * Input item for meeting notes
 * Priority: P1 (not part of initial MVP)
 */
export class MeetingNoteInputItem extends TextInputItem {
  /**
   * Constructs a new MeetingNoteInputItem
   * @param meetingTitle The title of the meeting
   * @param notes The meeting notes
   * @param attendees Optional list of attendees
   * @param date Optional meeting date
   */
  constructor(
    public meetingTitle: string,
    public notes: string,
    public attendees: string[] = [],
    public date: Date | null = null,
  ) {
    super(notes, meetingTitle, InputSource.MEETING_NOTES);
  }

  /**
   * Gets the potential nature of this item
   * @returns A guess at the nature based on meeting notes content
   */
  public getPotentialNature(): ItemNature {
    // Meeting notes could contain multiple types of items
    // For simplicity, we'll return UNCLEAR and let processors handle the details
    return ItemNature.UNCLEAR;
  }
}
