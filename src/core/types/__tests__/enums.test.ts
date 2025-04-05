/**
 * Tests for core type enumerations
 */

import { TaskStatus, EisenhowerQuadrant } from '../../models/task';
import { DestinationType, InputSource, ItemNature } from '../enums';

describe('Core Type Enumerations', () => {
  describe('TaskStatus Enum', () => {
    test('should have all expected values', () => {
      expect(Object.keys(TaskStatus)).toHaveLength(7);
      
      expect(TaskStatus.INBOX).toBe('Inbox');
      expect(TaskStatus.NEXT_ACTION).toBe('Next Action');
      expect(TaskStatus.PROJECT_TASK).toBe('Project Task');
      expect(TaskStatus.WAITING_FOR).toBe('Waiting For');
      expect(TaskStatus.SOMEDAY_MAYBE).toBe('Someday/Maybe');
      expect(TaskStatus.REFERENCE).toBe('Reference');
      expect(TaskStatus.DONE).toBe('Done');
    });
  });
  
  describe('EisenhowerQuadrant Enum', () => {
    test('should have all expected values', () => {
      expect(Object.keys(EisenhowerQuadrant)).toHaveLength(4);
      
      expect(EisenhowerQuadrant.DO).toBe('Urgent / Important');
      expect(EisenhowerQuadrant.DECIDE).toBe('Not Urgent / Important');
      expect(EisenhowerQuadrant.DELEGATE).toBe('Urgent / Not Important');
      expect(EisenhowerQuadrant.DELETE).toBe('Not Urgent / Not Important');
    });
  });
  
  describe('DestinationType Enum', () => {
    test('should have all expected values', () => {
      expect(Object.keys(DestinationType)).toHaveLength(5);
      
      expect(DestinationType.TODOIST).toBe('TODOIST');
      expect(DestinationType.CALENDAR).toBe('CALENDAR');
      expect(DestinationType.MARKDOWN).toBe('MARKDOWN');
      expect(DestinationType.REVIEW_LATER).toBe('REVIEW_LATER');
      expect(DestinationType.NONE).toBe('NONE');
    });
  });
  
  describe('InputSource Enum', () => {
    test('should have all expected values', () => {
      expect(Object.keys(InputSource)).toHaveLength(6);
      
      expect(InputSource.EMAIL).toBe('EMAIL');
      expect(InputSource.MEETING_NOTES).toBe('MEETING_NOTES');
      expect(InputSource.VOICE_MEMO).toBe('VOICE_MEMO');
      expect(InputSource.MANUAL_ENTRY).toBe('MANUAL_ENTRY');
      expect(InputSource.SLACK_MESSAGE).toBe('SLACK_MESSAGE');
      expect(InputSource.OTHER).toBe('OTHER');
    });
  });
  
  describe('ItemNature Enum', () => {
    test('should have all expected values', () => {
      expect(Object.keys(ItemNature)).toHaveLength(7);
      
      expect(ItemNature.UNKNOWN).toBe('UNKNOWN');
      expect(ItemNature.ACTIONABLE_TASK).toBe('ACTIONABLE_TASK');
      expect(ItemNature.POTENTIAL_EVENT).toBe('POTENTIAL_EVENT');
      expect(ItemNature.REFERENCE_INFO).toBe('REFERENCE_INFO');
      expect(ItemNature.PROJECT_IDEA).toBe('PROJECT_IDEA');
      expect(ItemNature.UNCLEAR).toBe('UNCLEAR');
      expect(ItemNature.TRASH).toBe('TRASH');
    });
  });
  
  describe('Enum Serialization', () => {
    test('should serialize and deserialize enums correctly', () => {
      // Create a simple object with enum values
      const obj = {
        status: TaskStatus.NEXT_ACTION,
        quadrant: EisenhowerQuadrant.DO,
        destination: DestinationType.TODOIST,
        source: InputSource.MANUAL_ENTRY,
        nature: ItemNature.ACTIONABLE_TASK
      };
      
      // Serialize to JSON and back
      const json = JSON.stringify(obj);
      const parsed = JSON.parse(json);
      
      // Check if values are preserved
      expect(parsed.status).toBe(TaskStatus.NEXT_ACTION);
      expect(parsed.quadrant).toBe(EisenhowerQuadrant.DO);
      expect(parsed.destination).toBe(DestinationType.TODOIST);
      expect(parsed.source).toBe(InputSource.MANUAL_ENTRY);
      expect(parsed.nature).toBe(ItemNature.ACTIONABLE_TASK);
    });
  });
}); 