/**
 * Core Type Enumerations
 * 
 * This file defines the fundamental enums that form the
 * foundation of the input processing system.
 */

/**
 * Represents the source of an input
 */
export enum InputSource {
  EMAIL = 'EMAIL',
  MEETING_NOTES = 'MEETING_NOTES',
  VOICE_MEMO = 'VOICE_MEMO',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  OTHER = 'OTHER'
}

/**
 * Represents the nature/type of an item
 */
export enum ItemNature {
  UNKNOWN = 'UNKNOWN',
  ACTIONABLE_TASK = 'ACTIONABLE_TASK',
  POTENTIAL_EVENT = 'POTENTIAL_EVENT',
  REFERENCE_INFO = 'REFERENCE_INFO',
  PROJECT_IDEA = 'PROJECT_IDEA',
  UNCLEAR = 'UNCLEAR',
  TRASH = 'TRASH'
}

/**
 * Represents the destination type for a processed item
 */
export enum DestinationType {
  TODOIST = 'TODOIST',
  CALENDAR = 'CALENDAR',
  MARKDOWN = 'MARKDOWN',
  REVIEW_LATER = 'REVIEW_LATER',
  NONE = 'NONE'
}
