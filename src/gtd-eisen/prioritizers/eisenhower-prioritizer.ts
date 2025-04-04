import { Task, TaskStatus, EisenhowerQuadrant } from '../models/task';
import { LLMService } from '../services';

export interface Prioritizer {
  prioritize(task: Task): Promise<void>;
}

export class EisenhowerPrioritizer implements Prioritizer {
  private llmService: LLMService | null;

  constructor(llmService: LLMService | null = null) {
    this.llmService = llmService;
  }

  async prioritize(task: Task): Promise<void> {
    console.log(`\n--- Prioritizing Task (Eisenhower): ${task.description} ---`);
    
    // Only prioritize actionable tasks that aren't deferred indefinitely
    if (!task.isActionable || task.status === TaskStatus.SOMEDAY_MAYBE || 
        task.status === TaskStatus.REFERENCE || task.status === TaskStatus.DONE) {
      console.log(`  Skipping prioritization: Task status is ${task.status}.`);
      task.eisenhowerQuadrant = null;
      return;
    }

    let urgent: boolean | null = null;
    let important: boolean | null = null;
    let rationale = 'N/A';

    // Check for due date first - strong indicator of urgency
    let isDueSoon = false;
    if (task.dueDate) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      // Consider 'due soon' if due today or tomorrow
      if (task.dueDate <= tomorrow) {
        isDueSoon = true;
        console.log(`  Task has a near-term due date (${task.dueDate.toISOString().split('T')[0]}).`);
      }
    }

    // Use LLM if available
    if (this.llmService) {
      const assessment = await this.llmService.getEisenhowerAssessment(task.description);
      
      if (assessment) {
        urgent = assessment.urgent;
        important = assessment.important;
        rationale = assessment.rationale || 'LLM provided no rationale.';
        
        console.log(`  LLM Assessment: Urgent=${urgent}, Important=${important}. Rationale: ${rationale}`);
        
        // Override LLM urgency if due date is near
        if (isDueSoon && urgent === false) {
          console.log('  Overriding LLM: Task marked URGENT due to near-term due date.');
          urgent = true;
          rationale += ' (Urgency set based on due date).';
        }
      }
    } else {
      console.log('  LLM Service not available. Using simple prioritization.');
      // Simple prioritization based on due date and keywords
      
      if (isDueSoon) {
        urgent = true;
        console.log('  Task marked URGENT due to near-term due date.');
      } else {
        // Check for urgency keywords
        const urgentKeywords = ['urgent', 'immediate', 'asap', 'emergency', 'deadline', 'critical'];
        urgent = urgentKeywords.some(keyword => task.description.toLowerCase().includes(keyword));
      }
      
      // Simple check for importance keywords
      const importantKeywords = ['important', 'priority', 'significant', 'essential', 'crucial'];
      important = importantKeywords.some(keyword => task.description.toLowerCase().includes(keyword));
      
      rationale = 'Simple keyword-based assessment.';
    }

    // Assign quadrant based on final U/I assessment
    if (urgent === null || important === null) {
      console.log('  [Error] Could not determine urgency/importance.');
      task.eisenhowerQuadrant = null;
      return;
    }

    if (urgent && important) {
      task.eisenhowerQuadrant = EisenhowerQuadrant.DO;
    } else if (!urgent && important) {
      task.eisenhowerQuadrant = EisenhowerQuadrant.DECIDE;
    } else if (urgent && !important) {
      task.eisenhowerQuadrant = EisenhowerQuadrant.DELEGATE;
    } else {
      task.eisenhowerQuadrant = EisenhowerQuadrant.DELETE;
    }

    console.log(`  Assigned Quadrant: ${task.eisenhowerQuadrant}`);
  }
} 