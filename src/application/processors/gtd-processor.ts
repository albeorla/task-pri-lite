/**
 * GTD Clarification Processor
 * 
 * Implements the GTD workflow for processing inbox items
 */

import { Task, TaskStatus } from '../../core/models/task';
import { Project } from '../../core/models/project';
import { LLMService } from '../../infrastructure/services/llm-service';

export interface TaskProcessor {
  process(task: Task, projects: Map<string, Project>): Promise<void>;
}

export class GTDClarificationProcessor implements TaskProcessor {
  private llmService: LLMService | null;
  private contexts: Set<string>;

  constructor(llmService: LLMService | null = null) {
    this.llmService = llmService;
    this.contexts = new Set(['@computer', '@home', '@errands', '@calls', '@read', '@work']);
  }

  async process(task: Task, projects: Map<string, Project>): Promise<void> {
    console.log(`\n--- Processing Task (GTD Clarify): ${task.description} ---`);
    
    if (task.status !== TaskStatus.INBOX) {
      console.log('  Skipping: Task not in Inbox.');
      return;
    }

    // Use LLM if available, otherwise rely on user input
    if (this.llmService) {
      const clarification = await this.llmService.getClarification(task.description);
      if (clarification) {
        task.isActionable = clarification.actionable;
        const outcome = clarification.outcome;
        const isProject = clarification.is_project;
        const rationale = clarification.rationale || 'N/A';
        
        console.log(`  LLM Analysis: Actionable=${task.isActionable}, Project=${isProject}, Outcome=${outcome}, Rationale=${rationale}`);

        // Handle LLM errors or null values
        if (task.isActionable === null) {
          console.log('  LLM clarification inconclusive, proceeding with manual input.');
          // You would implement interactive user input here if needed
          // For now, assume non-actionable on error
          task.isActionable = false;
        }

        // Process based on actionability
        if (!task.isActionable) {
          if (task.status === TaskStatus.INBOX) {
            const rationaleText = rationale.toLowerCase();
            task.status = rationaleText.includes('someday') || rationaleText.includes('maybe') 
              ? TaskStatus.SOMEDAY_MAYBE 
              : TaskStatus.REFERENCE;
          }
          console.log(`  Task determined as non-actionable (${task.status}).`);
          return;
        }

        // Actionable task handling
        if (isProject) {
          await this.handleProjectTask(task, projects, outcome);
        } else {
          // Single action task
          task.status = TaskStatus.NEXT_ACTION;
          console.log(`  Task '${task.description}' is a single Next Action.`);
          await this.assignContext(task);
        }
      }
    } else {
      console.log('  LLM Service not available. Using manual clarification.');
      // Implement interactive user input here if needed
      // For demonstration, we'll just mark it as reference
      task.isActionable = false;
      task.status = TaskStatus.REFERENCE;
      console.log(`  Task marked as ${task.status}.`);
    }
  }

  private async handleProjectTask(task: Task, projects: Map<string, Project>, outcome: string | null): Promise<void> {
    const projectNameSuggestion = task.description.substring(0, 50);
    // In a real app, you would get user input here
    const projectName = projectNameSuggestion;

    let project: Project;
    if (!projects.has(projectName)) {
      project = new Project({ name: projectName, outcome: outcome || undefined });
      projects.set(projectName, project);
      console.log(`  Created new project: '${projectName}'`);
    } else {
      project = projects.get(projectName)!;
    }

    project.addTask(task);
    task.status = TaskStatus.PROJECT_TASK;
    console.log(`  Task '${task.description}' added to project '${project.name}'.`);
    
    // Attempt to define Next Action
    await this.defineNextAction(project, task);
  }

  private async defineNextAction(project: Project, taskIfOnlyOne?: Task): Promise<void> {
    if (project.getNextAction()) {
      console.log(`  Project '${project.name}' already has a Next Action defined.`);
      return;
    }

    console.log(`\n  --- Defining Next Action for Project: ${project.name} ---`);
    
    let suggestion = '';
    if (this.llmService) {
      try {
        suggestion = await this.llmService.getNextActionSuggestion(project.name, project.outcome);
        console.log(`  LLM Suggested Next Action: '${suggestion}'`);
      } catch (error) {
        console.error(`    [Error] Failed to get LLM suggestion for next action:`, error);
        suggestion = '';
      }
    }

    // In a real app, you would get user confirmation/input here
    // For demonstration, we'll use the suggestion directly
    const userNextAction = suggestion;

    if (!userNextAction) {
      console.log('    No next action provided. Skipping.');
      return;
    }

    let taskToMark: Task;

    // Check if the original task added is the next action
    if (taskIfOnlyOne && userNextAction.trim().toLowerCase() === taskIfOnlyOne.description.trim().toLowerCase()) {
      taskToMark = taskIfOnlyOne;
      console.log(`    Marking existing task '${taskToMark.description}' as Next Action.`);
    } else {
      // Check if a similar task description already exists in the project
      const existingTask = project.tasks.find(
        t => t.description.trim().toLowerCase() === userNextAction.trim().toLowerCase()
      );
      
      if (existingTask) {
        taskToMark = existingTask;
        console.log(`    Marking existing task '${taskToMark.description}' as Next Action.`);
      } else {
        // Create a new task for the next action
        taskToMark = new Task({ description: userNextAction });
        project.addTask(taskToMark);
        console.log(`    Created new Next Action task: '${taskToMark.description}'`);
      }
    }

    // Mark the selected/created task as the Next Action for this project
    taskToMark.status = TaskStatus.NEXT_ACTION;
    if (!taskToMark.nextActionFor.includes(project)) {
      taskToMark.nextActionFor.push(project);
    }

    await this.assignContext(taskToMark);
  }

  private async assignContext(task: Task): Promise<void> {
    if (task.status !== TaskStatus.NEXT_ACTION) return;

    console.log('\n    Available Contexts:', Array.from(this.contexts).sort().join(', '));
    
    // In a real app, you would get user input here
    // For demonstration purposes, assign a default context
    if (task.description.toLowerCase().includes('email') || task.description.toLowerCase().includes('call')) {
      task.context = '@calls';
    } else if (task.description.toLowerCase().includes('buy') || task.description.toLowerCase().includes('shop')) {
      task.context = '@errands';
    } else {
      task.context = '@computer';
    }
    
    console.log(`    Assigned context: ${task.context}`);
  }
}
