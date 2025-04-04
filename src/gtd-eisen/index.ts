// Export all the module components

// Models
export * from './models/task';
export * from './models/project';

// Services
export * from './services';

// Processors
export * from './processors';

// Prioritizers
export * from './prioritizers';

// Task Manager
export * from './managers/task-manager';

// Storage Service
export { StorageService, FileStorageService } from './persistence/storage-service';

// Factory function to create a complete GTD workflow system
import { LangChainLLMService, LLMService } from './services';
import { GTDClarificationProcessor, TaskProcessor } from './processors';
import { EisenhowerPrioritizer, Prioritizer } from './prioritizers';
import { TaskManager } from './managers/task-manager';
import { FileStorageService, StorageService } from './persistence/storage-service';

export interface GTDEisenhowerSystem {
  llmService: LLMService;
  processor: TaskProcessor;
  prioritizer: Prioritizer;
  taskManager: TaskManager;
  storageService: StorageService;
}

export async function createGTDEisenhowerSystem(storageDir: string = './data'): Promise<GTDEisenhowerSystem> {
  // Initialize services
  const llmService = new LangChainLLMService();
  const processor = new GTDClarificationProcessor(llmService);
  const prioritizer = new EisenhowerPrioritizer(llmService);
  const storageService = new FileStorageService(storageDir);
  
  // Initialize task manager
  const taskManager = new TaskManager(processor, prioritizer);
  
  // Load existing data if available
  try {
    const { tasks, projects } = await storageService.loadAll();
    if (tasks.length > 0) {
      taskManager.loadTasks(tasks);
    }
  } catch (error) {
    console.error('Failed to load existing data:', error);
    console.log('Starting with empty task list');
  }
  
  return {
    llmService,
    processor,
    prioritizer,
    taskManager,
    storageService
  };
} 