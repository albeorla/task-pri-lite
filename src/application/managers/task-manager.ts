/**
 * Task Manager
 * 
 * Manages the workflow of processing and prioritizing tasks
 */

import { Task, TaskStatus } from '../../core/models/task';
import { Project } from '../../core/models/project';

// We'll need to define these interfaces in their new locations
import { TaskProcessor } from '../processors/gtd-processor';
import { Prioritizer } from '../processors/eisenhower-prioritizer';

export class TaskManager {
  private processor: TaskProcessor;
  private prioritizer: Prioritizer;
  private projects: Map<string, Project> = new Map();
  private tasks: Map<string, Task> = new Map();

  constructor(processor: TaskProcessor, prioritizer: Prioritizer) {
    this.processor = processor;
    this.prioritizer = prioritizer;
  }

  /**
   * Loads tasks (e.g., from storage)
   */
  loadTasks(tasks: Task[]): void {
    this.tasks.clear();
    tasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
    
    // Reset projects based on loaded tasks
    this.projects.clear();
    console.log(`Loaded ${tasks.length} initial tasks.`);
  }

  /**
   * Runs the processing and prioritization workflow on loaded tasks
   */
  async runWorkflow(): Promise<void> {
    console.log('\n=== Starting Task Workflow ===');
    
    const inboxTasks = Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.INBOX);
      
    console.log(`Found ${inboxTasks.length} tasks in Inbox to process.`);

    // 1. Processing Step (GTD Clarification)
    console.log('\n-- Running Processing Step --');
    let processedCount = 0;
    
    for (const task of inboxTasks) {
      try {
        await this.processor.process(task, this.projects);
        processedCount++;
      } catch (error) {
        console.error(`[Error] Failed processing task '${task.description}'. Error:`, error);
      }
    }
    
    console.log(`-- Processing Step Complete (${processedCount} tasks processed) --`);

    // 2. Update master task list (gather all known tasks including newly created ones)
    this.updateTasksList();
    console.log(`Total tasks after processing: ${this.tasks.size}`);

    // 3. Prioritization Step (Eisenhower)
    console.log('\n-- Running Prioritization Step --');
    let prioritizedCount = 0;
    
    for (const task of this.tasks.values()) {
      // Prioritize only actionable tasks
      if (task.status !== TaskStatus.REFERENCE && 
          task.status !== TaskStatus.SOMEDAY_MAYBE && 
          task.status !== TaskStatus.DONE) {
        try {
          await this.prioritizer.prioritize(task);
          prioritizedCount++;
        } catch (error) {
          console.error(`[Error] Failed prioritizing task '${task.description}'. Error:`, error);
        }
      }
    }
    
    console.log(`-- Prioritization Step Complete (${prioritizedCount} tasks assessed) --`);
    console.log('\n=== Workflow Complete ===');
  }

  /**
   * Updates the tasks list with any newly created tasks in projects
   */
  private updateTasksList(): void {
    // First gather all tasks from projects
    for (const project of this.projects.values()) {
      for (const task of project.tasks) {
        if (!this.tasks.has(task.id)) {
          this.tasks.set(task.id, task);
        }
      }
    }
  }

  /**
   * Gets all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Gets all projects
   */
  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Prints a summary of tasks, grouped by the specified key
   */
  printSummary(groupBy: 'status' | 'project' | 'context' | 'priority' = 'status'): void {
    console.log(`\n${'='.repeat(10)} Task Summary ${'='.repeat(10)}`);

    if (this.tasks.size === 0) {
      console.log('No tasks loaded or processed.');
      return;
    }

    // Group tasks
    const groupedTasks = new Map<string, Task[]>();
    
    const tasks = Array.from(this.tasks.values());
    
    for (const task of tasks) {
      let key: string;
      
      switch (groupBy) {
        case 'status':
          key = task.status;
          break;
        case 'project':
          key = task.project?.name || '== No Project ==';
          break;
        case 'context':
          key = task.context || '== No Context ==';
          break;
        case 'priority': // Eisenhower
          key = task.eisenhowerQuadrant || 'Not Prioritized';
          break;
        default:
          key = task.status;
      }
      
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, []);
      }
      
      groupedTasks.get(key)!.push(task);
    }

    // Print grouped tasks
    for (const [groupKey, groupTasks] of groupedTasks.entries()) {
      console.log(`\n--- ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}: ${groupKey} ---`);
      
      // Sort tasks by description
      const sortedTasks = groupTasks.sort((a, b) => 
        a.description.localeCompare(b.description)
      );
      
      for (const task of sortedTasks) {
        console.log(`  - ${task.toString()}`);
      }
    }

    // Project summary
    console.log(`\n${'='.repeat(10)} Project Summary ${'='.repeat(10)}`);
    
    if (this.projects.size === 0) {
      console.log('No projects defined.');
    } else {
      const sortedProjects = Array.from(this.projects.values())
        .sort((a, b) => a.name.localeCompare(b.name));
        
      for (const project of sortedProjects) {
        console.log(`\n* ${project.toString()}`);
        
        const nextAction = project.getNextAction();
        console.log(`    Next Action: ${nextAction ? nextAction.description : '*** NONE DEFINED ***'}`);
      }
    }

    console.log(`\n${'='.repeat(34)}`);
  }

  /**
   * Serialize all data for persistence
   */
  serializeData(): { tasks: any[], projects: any[] } {
    return {
      tasks: Array.from(this.tasks.values()).map(task => task.toJSON()),
      projects: Array.from(this.projects.values()).map(project => project.toJSON()),
    };
  }

  /**
   * Deserialize data from storage
   */
  static deserializeData(data: { tasks: any[], projects: any[] }): TaskManager {
    // This needs a processor and prioritizer to be passed in
    throw new Error('Not implemented - need processor and prioritizer instances');
  }
}
