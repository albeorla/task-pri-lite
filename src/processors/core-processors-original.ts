/**
 * Core Input Processors for Input Processing System
 * 
 * This file implements the core input processors that are part of the MVP.
 */

import { 
  BaseInputProcessor,
  BaseProcessedItem
} from '../abstracts/abstract-base-classes';
import {
  IInputItem,
  IProcessedItem,
  ItemNature,
  DestinationType
} from '../core/core-interfaces';
import { TextInputItem, ManualTaskInputItem } from '../inputs/basic-input-items';

/**
 * Processor for detecting actionable tasks in text content
 * Priority: P0
 */
export class TaskDetectionProcessor extends BaseInputProcessor {
  /**
   * Determines if this processor can process the given input
   * @param input The input item to check
   * @returns True if this processor can process the input, false otherwise
   */
  public canProcess(input: IInputItem): boolean {
    // Can process any TextInputItem
    if (input instanceof TextInputItem) {
      return true;
    }
    
    // Can also process ManualTaskInputItem, but it's usually pre-classified
    if (input instanceof ManualTaskInputItem) {
      return true;
    }
    
    // For other input types, check if the potential nature is ACTIONABLE_TASK
    return input.getPotentialNature() === ItemNature.ACTIONABLE_TASK;
  }
  
  /**
   * Processes the input item to extract task information
   * @param input The input item to process
   * @returns The processed item with task details
   */
  public process(input: IInputItem): IProcessedItem {
    // For ManualTaskInputItem, we can directly use the provided information
    if (input instanceof ManualTaskInputItem) {
      return new BaseProcessedItem(
        input,
        ItemNature.ACTIONABLE_TASK,
        DestinationType.TODOIST,
        {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          priority: input.priority
        }
      );
    }
    
    // For TextInputItem, we need to extract task information
    if (input instanceof TextInputItem) {
      const text = input.text;
      
      // Extract title (first line or first sentence)
      const title = this.extractTitle(text);
      
      // Extract due date if present
      const dueDate = this.extractDueDate(text);
      
      // Extract priority if present
      const priority = this.extractPriority(text);
      
      // Use the rest as description
      const description = this.extractDescription(text, title);
      
      return new BaseProcessedItem(
        input,
        ItemNature.ACTIONABLE_TASK,
        DestinationType.TODOIST,
        {
          title,
          description,
          dueDate,
          priority
        }
      );
    }
    
    // For other input types, create a generic task
    return new BaseProcessedItem(
      input,
      ItemNature.ACTIONABLE_TASK,
      DestinationType.TODOIST,
      {
        title: "Task from " + input.source,
        description: JSON.stringify(input.rawContent),
        dueDate: null,
        priority: 4
      }
    );
  }
  
  /**
   * Extracts the title from text content
   * @param text The text to extract from
   * @returns The extracted title
   */
  private extractTitle(text: string): string {
    // Try to get the first line
    const firstLine = text.split('\n')[0].trim();
    if (firstLine && firstLine.length <= 100) {
      return firstLine;
    }
    
    // If first line is too long, try to get the first sentence
    const firstSentence = text.split(/[.!?]/)[0].trim();
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence;
    }
    
    // If all else fails, truncate the text
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  }
  
  /**
   * Extracts the due date from text content
   * @param text The text to extract from
   * @returns The extracted due date or null if not found
   */
  private extractDueDate(text: string): Date | null {
    // Look for common date patterns
    const datePatterns = [
      // "due by January 15, 2023"
      /due\s+by\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
      // "due on 15/01/2023"
      /due\s+on\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      // "deadline: 2023-01-15"
      /deadline:?\s+(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
      // "by tomorrow"
      /by\s+(tomorrow)/i,
      // "by next week"
      /by\s+(next\s+week)/i,
      // "by Friday"
      /by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          // For simple relative dates, calculate the actual date
          if (match[1].toLowerCase() === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          }
          
          if (match[1].toLowerCase() === 'next week') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
          }
          
          // For day names, calculate the next occurrence
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayIndex = dayNames.indexOf(match[1].toLowerCase());
          if (dayIndex !== -1) {
            const today = new Date();
            const currentDay = today.getDay();
            const daysUntil = (dayIndex + 7 - currentDay) % 7;
            const nextDay = new Date();
            nextDay.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
            return nextDay;
          }
          
          // For explicit dates, parse them
          return new Date(match[1]);
        } catch (e) {
          // If date parsing fails, continue to the next pattern
          continue;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extracts the priority from text content
   * @param text The text to extract from
   * @returns The extracted priority (1-4, where 1 is highest) or 4 if not found
   */
  private extractPriority(text: string): number {
    // Look for common priority patterns
    const priorityPatterns = [
      // "priority: high"
      { pattern: /priority:?\s+(high|urgent|important)/i, value: 1 },
      // "high priority"
      { pattern: /(high|urgent|important)\s+priority/i, value: 1 },
      // "priority: medium"
      { pattern: /priority:?\s+(medium|normal)/i, value: 2 },
      // "medium priority"
      { pattern: /(medium|normal)\s+priority/i, value: 2 },
      // "priority: low"
      { pattern: /priority:?\s+(low)/i, value: 3 },
      // "low priority"
      { pattern: /(low)\s+priority/i, value: 3 },
      // "p1", "p2", "p3", "p4"
      { pattern: /\b(p[1-4])\b/i, value: 0 }
    ];
    
    for (const { pattern, value } of priorityPatterns) {
      const match = text.match(pattern);
      if (match) {
        // For p1-p4 notation, extract the number
        if (match[1] && match[1].toLowerCase().startsWith('p')) {
          const priorityNumber = parseInt(match[1].substring(1));
          if (priorityNumber >= 1 && priorityNumber <= 4) {
            return priorityNumber;
          }
        }
        
        return value;
      }
    }
    
    // Default priority is 4 (lowest)
    return 4;
  }
  
  /**
   * Extracts the description from text content
   * @param text The text to extract from
   * @param title The already extracted title
   * @returns The extracted description
   */
  private extractDescription(text: string, title: string): string {
    // Remove the title from the beginning of the text
    let description = text;
    if (text.startsWith(title)) {
      description = text.substring(title.length).trim();
      
      // Remove any leading punctuation
      description = description.replace(/^[.!?:;,\s]+/, '');
    }
    
    return description;
  }
}

/**
 * Processor for detecting potential calendar events in text content
 * Priority: P0
 */
export class EventDetectionProcessor extends BaseInputProcessor {
  /**
   * Determines if this processor can process the given input
   * @param input The input item to check
   * @returns True if this processor can process the input, false otherwise
   */
  public canProcess(input: IInputItem): boolean {
    // Can process any TextInputItem
    if (input instanceof TextInputItem) {
      return true;
    }
    
    // For other input types, check if the potential nature is POTENTIAL_EVENT
    return input.getPotentialNature() === ItemNature.POTENTIAL_EVENT;
  }
  
  /**
   * Processes the input item to extract event information
   * @param input The input item to process
   * @returns The processed item with event details
   */
  public process(input: IInputItem): IProcessedItem {
    // For TextInputItem, we need to extract event information
    if (input instanceof TextInputItem) {
      const text = input.text;
      
      // Extract title (first line or first sentence)
      const title = this.extractTitle(text);
      
      // Extract start date/time if present
      const startDateTime = this.extractStartDateTime(text);
      
      // Extract end date/time if present
      const endDateTime = this.extractEndDateTime(text, startDateTime);
      
      // Extract location if present
      const location = this.extractLocation(text);
      
      // Extract attendees if present
      const attendees = this.extractAttendees(text);
      
      // Use the rest as description
      const description = this.extractDescription(text, title);
      
      // Only classify as an event if we have at least a start date/time
      if (startDateTime) {
        return new BaseProcessedItem(
          input,
          ItemNature.POTENTIAL_EVENT,
          DestinationType.CALENDAR,
          {
            title,
            description,
            startDateTime,
            endDateTime,
            location,
            attendees
          }
        );
      }
    }
    
    // If we couldn't extract event information or it's not a TextInputItem,
    // return a processed item with UNCLEAR nature
    return new BaseProcessedItem(
      input,
      ItemNature.UNCLEAR,
      DestinationType.REVIEW_LATER,
      {
        content: input instanceof TextInputItem ? input.text : JSON.stringify(input.rawContent)
      }
    );
  }
  
  /**
   * Extracts the title from text content
   * @param text The text to extract from
   * @returns The extracted title
   */
  private extractTitle(text: string): string {
    // Try to get the first line
    const firstLine = text.split('\n')[0].trim();
    if (firstLine && firstLine.length <= 100) {
      return firstLine;
    }
    
    // If first line is too long, try to get the first sentence
    const firstSentence = text.split(/[.!?]/)[0].trim();
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence;
    }
    
    // If all else fails, truncate the text
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  }
  
  /**
   * Extracts the start date/time from text content
   * @param text The text to extract from
   * @returns The extracted start date/time or null if not found
   */
  private extractStartDateTime(text: string): Date | null {
    // Look for common date/time patterns
    const dateTimePatterns = [
      // "meeting on January 15, 2023 at 2:30 PM"
      /(?:meeting|event|call)\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      // "scheduled for 15/01/2023 at 14:30"
      /scheduled\s+for\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      // "starts at 2:30 PM on Friday"
      /starts\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)\s+on\s+(\w+)/i,
      // "tomorrow at 2:30 PM"
      /tomorrow\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      // "at 2:30 PM"
      /at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i
    ];
    
    for (const pattern of dateTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Different patterns have different group structures
          if (match[1] && match[2]) {
            // Pattern with date and time
            const dateStr = match[1];
            const timeStr = match[2];
            
            // Try to parse the date
            const date = new Date(dateStr);
            
            // Try to parse the time
            const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]);
              const ampm = timeParts[3] ? timeParts[3].toLowerCase() : null;
              
              // Adjust hours for AM/PM
              if (ampm === 'pm' && hours < 12) {
                hours += 12;
              } else if (ampm === 'am' && hours === 12) {
                hours = 0;
              }
              
              date.setHours(hours, minutes, 0, 0);
              return date;
            }
          } else if (match[1] && match[1].toLowerCase() === 'tomorrow') {
            // "tomorrow" pattern
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          } else if (match[1] && /^\d{1,2}:\d{2}/.test(match[1])) {
            // Time-only pattern, assume today
            const today = new Date();
            
            // Try to parse the time
            const timeParts = match[1].match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]);
              const ampm = timeParts[3] ? timeParts[3].toLowerCase() : null;
              
              // Adjust hours for AM/PM
              if (ampm === 'pm' && hours < 12) {
                hours += 12;
              } else if (ampm === 'am' && hours === 12) {
                hours = 0;
              }
              
              today.setHours(hours, minutes, 0, 0);
              return today;
            }
          }
        } catch (e) {
          // If date/time parsing fails, continue to the next pattern
          continue;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extracts the end date/time from text content
   * @param text The text to extract from
   * @param startDateTime The already extracted start date/time
   * @returns The extracted end date/time or null if not found
   */
  private extractEndDateTime(text: string, startDateTime: Date | null): Date | null {
    if (!startDateTime) {
      return null;
    }
    
    // Look for common end time patterns
    const endTimePatterns = [
      // "ends at 3:30 PM"
      /ends\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      // "until 3:30 PM"
      /until\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      // "from 2:30 PM to 3:30 PM"
      /from\s+\d{1,2}:\d{2}\s*(?:am|pm)?\s+to\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i
    ];
    
    for (const pattern of endTimePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          // Try to parse the time
          const timeParts = match[1].match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
          if (timeParts) {
            // Create a copy of the start date/time
            const endDateTime = new Date(startDateTime.getTime());
            
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            const ampm = timeParts[3] ? timeParts[3].toLowerCase() : null;
            
            // Adjust hours for AM/PM
            if (ampm === 'pm' && hours < 12) {
              hours += 12;
            } else if (ampm === 'am' && hours === 12) {
              hours = 0;
            }
            
            endDateTime.setHours(hours, minutes, 0, 0);
            
            // Ensure end time is after start time
            if (endDateTime <= startDateTime) {
              endDateTime.setDate(endDateTime.getDate() + 1);
            }
            
            return endDateTime;
          }
        } catch (e) {
          // If time parsing fails, continue to the next pattern
          continue;
        }
      }
    }
    
    // If no end time is specified, default to 1 hour after start time
    const endDateTime = new Date(startDateTime.getTime());
    endDateTime.setHours(endDateTime.getHours() + 1);
    return endDateTime;
  }
  
  /**
   * Extracts the location from text content
   * @param text The text to extract from
   * @returns The extracted location or empty string if not found
   */
  private extractLocation(text: string): string {
    // Look for common location patterns
    const locationPatterns = [
      // "location: Conference Room A"
      /location:?\s+([^,.]+)/i,
      // "at Conference Room A"
      /at\s+([^,.]+(?:room|office|building|center|centre|hall))/i,
      // "in Conference Room A"
      /in\s+([^,.]+(?:room|office|building|center|centre|hall))/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  /**
   * Extracts attendees from text content
   * @param text The text to extract from
   * @returns The extracted attendees or empty array if not found
   */
  private extractAttendees(text: string): string[] {
    // Look for common attendee patterns
    const attendeePatterns = [
      // "attendees: John, Jane, Bob"
      /attendees:?\s+([^.]+)/i,
      // "with John, Jane, and Bob"
      /with\s+([^.]+)/i,
      // "participants: John, Jane, Bob"
      /participants:?\s+([^.]+)/i
    ];
    
    for (const pattern of attendeePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Split by commas and "and"
        return match[1]
          .split(/,|\sand\s/)
          .map(name => name.trim())
          .filter(name => name.length > 0);
      }
    }
    
    return [];
  }
  
  /**
   * Extracts the description from text content
   * @param text The text to extract from
   * @param title The already extracted title
   * @returns The extracted description
   */
  private extractDescription(text: string, title: string): string {
    // Remove the title from the beginning of the text
    let description = text;
    if (text.startsWith(title)) {
      description = text.substring(title.length).trim();
      
      // Remove any leading punctuation
      description = description.replace(/^[.!?:;,\s]+/, '');
    }
    
    return description;
  }
}

/**
 * Processor for detecting reference information in text content
 * Priority: P0
 */
export class ReferenceInfoProcessor extends BaseInputProcessor {
  /**
   * Determines if this processor can process the given input
   * @param input The input item to check
   * @returns True if this processor can process the input, false otherwise
   */
  public canProcess(input: IInputItem): boolean {
    // Can process any TextInputItem
    if (input instanceof TextInputItem) {
      return true;
    }
    
    // For other input types, check if the potential nature is REFERENCE_INFO
    return input.getPotentialNature() === ItemNature.REFERENCE_INFO;
  }
  
  /**
   * Processes the input item to extract reference information
   * @param input The input item to process
   * @returns The processed item with reference details
   */
  public process(input: IInputItem): IProcessedItem {
    // For TextInputItem, we need to extract reference information
    if (input instanceof TextInputItem) {
      const text = input.text;
      
      // Extract title (first line or first sentence)
      const title = this.extractTitle(text);
      
      // Extract URLs if present
      const urls = this.extractUrls(text);
      
      // Extract tags if present
      const tags = this.extractTags(text);
      
      // Use the rest as content
      const content = this.extractContent(text, title);
      
      // Check if this is likely reference information
      if (
        this.isLikelyReferenceInfo(text) ||
        urls.length > 0 ||
        tags.length > 0
      ) {
        return new BaseProcessedItem(
          input,
          ItemNature.REFERENCE_INFO,
          DestinationType.MARKDOWN,
          {
            title,
            content,
            urls,
            tags
          }
        );
      }
    }
    
    // If we couldn't extract reference information or it's not a TextInputItem,
    // return a processed item with UNCLEAR nature
    return new BaseProcessedItem(
      input,
      ItemNature.UNCLEAR,
      DestinationType.REVIEW_LATER,
      {
        content: input instanceof TextInputItem ? input.text : JSON.stringify(input.rawContent)
      }
    );
  }
  
  /**
   * Extracts the title from text content
   * @param text The text to extract from
   * @returns The extracted title
   */
  private extractTitle(text: string): string {
    // Try to get the first line
    const firstLine = text.split('\n')[0].trim();
    if (firstLine && firstLine.length <= 100) {
      return firstLine;
    }
    
    // If first line is too long, try to get the first sentence
    const firstSentence = text.split(/[.!?]/)[0].trim();
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence;
    }
    
    // If all else fails, truncate the text
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  }
  
  /**
   * Extracts URLs from text content
   * @param text The text to extract from
   * @returns The extracted URLs
   */
  private extractUrls(text: string): string[] {
    // Simple URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Find all matches
    const matches = text.match(urlRegex);
    
    // Return matches or empty array
    return matches || [];
  }
  
  /**
   * Extracts tags from text content
   * @param text The text to extract from
   * @returns The extracted tags
   */
  private extractTags(text: string): string[] {
    // Look for hashtags and "tags:" sections
    const tagPatterns = [
      // #tag
      /#([a-zA-Z0-9_]+)/g,
      // tags: tag1, tag2, tag3
      /tags:?\s+([^.]+)/i
    ];
    
    const tags = new Set<string>();
    
    // Extract hashtags
    const hashtagMatches = text.match(tagPatterns[0]);
    if (hashtagMatches) {
      for (const match of hashtagMatches) {
        tags.add(match.substring(1));
      }
    }
    
    // Extract tags from "tags:" section
    const tagsMatch = text.match(tagPatterns[1]);
    if (tagsMatch && tagsMatch[1]) {
      const tagList = tagsMatch[1].split(',').map(tag => tag.trim());
      for (const tag of tagList) {
        if (tag) {
          tags.add(tag);
        }
      }
    }
    
    return Array.from(tags);
  }
  
  /**
   * Extracts the content from text content
   * @param text The text to extract from
   * @param title The already extracted title
   * @returns The extracted content
   */
  private extractContent(text: string, title: string): string {
    // Remove the title from the beginning of the text
    let content = text;
    if (text.startsWith(title)) {
      content = text.substring(title.length).trim();
      
      // Remove any leading punctuation
      content = content.replace(/^[.!?:;,\s]+/, '');
    }
    
    return content;
  }
  
  /**
   * Determines if the text is likely reference information
   * @param text The text to check
   * @returns True if the text is likely reference information, false otherwise
   */
  private isLikelyReferenceInfo(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for reference indicators
    return (
      lowerText.includes('fyi') ||
      lowerText.includes('reference') ||
      lowerText.includes('information') ||
      lowerText.includes('note that') ||
      lowerText.includes('article') ||
      lowerText.includes('documentation') ||
      lowerText.includes('resource')
    );
  }
}

/**
 * Default processor for unclassified inputs
 * Priority: P0
 */
export class DefaultProcessor extends BaseInputProcessor {
  /**
   * Determines if this processor can process the given input
   * @param input The input item to check
   * @returns Always returns true (fallback processor)
   */
  public canProcess(input: IInputItem): boolean {
    // This is the fallback processor, so it can process any input
    return true;
  }
  
  /**
   * Processes the input item as an unclassified item
   * @param input The input item to process
   * @returns The processed item with UNCLEAR nature
   */
  public process(input: IInputItem): IProcessedItem {
    // For TextInputItem, use the text as content
    if (input instanceof TextInputItem) {
      return new BaseProcessedItem(
        input,
        ItemNature.UNCLEAR,
        DestinationType.REVIEW_LATER,
        {
          title: input.title || this.generateTitle(input),
          content: input.text
        }
      );
    }
    
    // For other input types, use the raw content
    return new BaseProcessedItem(
      input,
      ItemNature.UNCLEAR,
      DestinationType.REVIEW_LATER,
      {
        title: this.generateTitle(input),
        content: JSON.stringify(input.rawContent)
      }
    );
  }
  
  /**
   * Generates a title for the input item
   * @param input The input item
   * @returns A generated title
   */
  private generateTitle(input: IInputItem): string {
    // Generate a title based on the input source and timestamp
    const date = input.timestamp.toLocaleDateString();
    const time = input.timestamp.toLocaleTimeString();
    
    return `Unclassified ${input.source} from ${date} ${time}`;
  }
}
