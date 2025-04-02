/**
 * Implementation Examples for Input Processing System
 *
 * This file provides concrete examples of how to use the Input Processing System
 * in various scenarios.
 */

import {
  InputSource
} from '../core/interfaces';

import {
  ManualTaskInputItem,
  TextInputItem,
  MeetingNoteInputItem
} from '../inputs/basic-input-items';

import {
  InputProcessingOrchestrator
} from '../services/orchestration-services-impl';

/**
 * Example 1: Processing a Manual Task
 *
 * This example demonstrates how to create and process a manual task input.
 */
async function example1_manualTask() {
  console.log('=== Example 1: Processing a Manual Task ===');

  // Create the orchestrator
  const orchestrator = new InputProcessingOrchestrator();

  // Create a manual task input
  const taskItem = new ManualTaskInputItem(
    "Complete project proposal",
    "Draft the initial proposal for the client meeting",
    new Date("2025-04-15"),
    2 // Medium priority
  );

  // Process and handle the input
  try {
    await orchestrator.processAndHandle(taskItem);
    console.log('Manual task processed successfully');
  } catch (error) {
    console.error('Error processing manual task:', error);
  }

  console.log('=== End of Example 1 ===\n');
}

/**
 * Example 2: Processing Text with Task Information
 *
 * This example demonstrates how to process text that contains task information.
 */
async function example2_textWithTaskInfo() {
  console.log('=== Example 2: Processing Text with Task Information ===');

  // Create the orchestrator
  const orchestrator = new InputProcessingOrchestrator();

  // Create a text input with task information
  const textItem = new TextInputItem(
    "Please review the marketing materials by Friday. Priority: high",
    "Marketing Review Task",
    InputSource.EMAIL
  );

  // Process and handle the input
  try {
    await orchestrator.processAndHandle(textItem);
    console.log('Text with task information processed successfully');
  } catch (error) {
    console.error('Error processing text with task information:', error);
  }

  console.log('=== End of Example 2 ===\n');
}

/**
 * Example 3: Processing Text with Event Information
 *
 * This example demonstrates how to process text that contains event information.
 */
async function example3_textWithEventInfo() {
  console.log('=== Example 3: Processing Text with Event Information ===');

  // Create the orchestrator
  const orchestrator = new InputProcessingOrchestrator();

  // Create a text input with event information
  const textItem = new TextInputItem(
    "Team meeting tomorrow at 2:30 PM in Conference Room A. We'll discuss the Q2 roadmap.",
    "Team Meeting",
    InputSource.SLACK_MESSAGE
  );

  // Process and handle the input
  try {
    await orchestrator.processAndHandle(textItem);
    console.log('Text with event information processed successfully');
  } catch (error) {
    console.error('Error processing text with event information:', error);
  }

  console.log('=== End of Example 3 ===\n');
}

/**
 * Example 4: Processing Text with Reference Information
 *
 * This example demonstrates how to process text that contains reference information.
 */
async function example4_textWithReferenceInfo() {
  console.log('=== Example 4: Processing Text with Reference Information ===');

  // Create the orchestrator
  const orchestrator = new InputProcessingOrchestrator();

  // Create a text input with reference information
  const textItem = new TextInputItem(
    "FYI, here's a useful article on TypeScript best practices: https://example.com/typescript-best-practices\n\nTags: typescript, programming, best-practices",
    "TypeScript Resources",
    InputSource.EMAIL
  );

  // Process and handle the input
  try {
    await orchestrator.processAndHandle(textItem);
    console.log('Text with reference information processed successfully');
  } catch (error) {
    console.error('Error processing text with reference information:', error);
  }

  console.log('=== End of Example 4 ===\n');
}

/**
 * Example 5: Processing Meeting Notes
 *
 * This example demonstrates how to process meeting notes that contain multiple types of information.
 */
async function example5_meetingNotes() {
  console.log('=== Example 5: Processing Meeting Notes ===');

  // Create the orchestrator
  const orchestrator = new InputProcessingOrchestrator();

  // Create a meeting note input
  const meetingNoteItem = new MeetingNoteInputItem(
    "Product Planning Meeting",
    "Meeting Date: April 1, 2025\n\nAttendees: John, Jane, Bob\n\nDiscussion:\n- Current project status review\n- Feature prioritization for Q2\n\nAction Items:\n1. John to update the roadmap by Friday\n2. Jane to prepare user research report\n3. Bob to coordinate with the design team\n\nNext Meeting: April 8, 2025 at 10:00 AM in Conference Room B",
    ["John", "Jane", "Bob"],
    new Date("2025-04-01")
  );

  // Process and handle the input
  try {
    await orchestrator.processAndHandle(meetingNoteItem);
    console.log('Meeting notes processed successfully');
  } catch (error) {
    console.error('Error processing meeting notes:', error);
  }

  console.log('=== End of Example 5 ===\n');
}

/**
 * Example 6: Processing Unclear Text
 *
 * This example demonstrates how the system handles text that doesn't clearly fit into a category.
 */
async function example6_unclearText() {
  console.log('=== Example 6: Processing Unclear Text ===');

  // Create the orchestrator
  const orchestrator = new InputProcessingOrchestrator();

  // Create a text input with unclear information
  const textItem = new TextInputItem(
    "Just thinking about the project. Lots of interesting possibilities.",
    "Random Thoughts",
    InputSource.MANUAL_ENTRY
  );

  // Process and handle the input
  try {
    await orchestrator.processAndHandle(textItem);
    console.log('Unclear text processed successfully');
  } catch (error) {
    console.error('Error processing unclear text:', error);
  }

  console.log('=== End of Example 6 ===\n');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('Running all examples...\n');

  await example1_manualTask();
  await example2_textWithTaskInfo();
  await example3_textWithEventInfo();
  await example4_textWithReferenceInfo();
  await example5_meetingNotes();
  await example6_unclearText();

  console.log('All examples completed.');
}

// Uncomment to run all examples
// runAllExamples();

// Export examples for individual use
export {
  example1_manualTask,
  example2_textWithTaskInfo,
  example3_textWithEventInfo,
  example4_textWithReferenceInfo,
  example5_meetingNotes,
  example6_unclearText,
  runAllExamples
};
