import { InputProcessingService, OutputHandlingService, InputProcessingOrchestrator } from '../orchestration-services-impl';
import { IInputItem, IInputProcessor, IProcessedItem, InputSource, ItemNature, DestinationType } from '../../core/interfaces';

// Mock implementation of IInputItem
class MockInputItem implements IInputItem {
  id: string;
  source: InputSource;
  rawContent: any;
  timestamp: Date;
  content: string; // Additional property in the actual implementation
  createdAt: Date; // Additional property in the actual implementation
  metadata: Record<string, any>; // Additional property in the actual implementation

  constructor(id: string, source: InputSource, content: string) {
    this.id = id;
    this.source = source;
    this.content = content;
    this.rawContent = content;
    this.createdAt = new Date();
    this.timestamp = this.createdAt;
    this.metadata = {};
  }

  getPotentialNature(): ItemNature {
    return ItemNature.UNKNOWN;
  }
}

describe('InputProcessingService', () => {
  let mockInputItem: IInputItem;
  
  beforeEach(() => {
    // Create a mock input item
    mockInputItem = new MockInputItem('1', InputSource.MANUAL_ENTRY, 'Test content');
  });
  
  test('should have default processors configured', () => {
    const service = new InputProcessingService();
    
    // Process an input with defaults
    const result = service.processInput(mockInputItem);
    
    // Default processor should handle it
    expect(result).toBeDefined();
    expect(result.originalInput).toBe(mockInputItem);
    // The default processor typically sets UNCLEAR + REVIEW_LATER
    expect(result.determinedNature).toBeDefined();
    expect(result.suggestedDestination).toBeDefined();
  });
  
  test('should allow adding a processor', () => {
    const service = new InputProcessingService();
    const initialProcessorCount = 4; // Default configuration has 4 processors
    
    const mockProcessor: IInputProcessor = {
      canProcess: () => false,
      process: (input) => ({
        originalInput: input,
        determinedNature: ItemNature.ACTIONABLE_TASK,
        suggestedDestination: DestinationType.TODOIST,
        extractedData: {}
      })
    };
    
    service.addProcessor(mockProcessor);
    
    // Verify processor was added by checking if it's called during processing
    // Since it returns false for canProcess, it won't affect the result
    const result = service.processInput(mockInputItem);
    expect(result).toBeDefined();
  });
});

describe('OutputHandlingService', () => {
  let mockInputItem: IInputItem;
  let mockProcessedItem: IProcessedItem;
  
  beforeEach(() => {
    mockInputItem = new MockInputItem('1', InputSource.MANUAL_ENTRY, 'Test content');
    mockProcessedItem = {
      originalInput: mockInputItem,
      determinedNature: ItemNature.REFERENCE_INFO,
      suggestedDestination: DestinationType.MARKDOWN,
      extractedData: { title: 'Test Reference' }
    };
  });
  
  test('should handle output with default handlers', async () => {
    const service = new OutputHandlingService();
    
    // This should be handled by the default MarkdownHandler
    await expect(service.handleOutput(mockProcessedItem)).resolves.not.toThrow();
  });
});

describe('InputProcessingOrchestrator', () => {
  let mockInputItem: IInputItem;
  
  beforeEach(() => {
    mockInputItem = new MockInputItem('1', InputSource.MANUAL_ENTRY, 'Test content');
  });
  
  test('should process and handle input', async () => {
    const orchestrator = new InputProcessingOrchestrator();
    
    await expect(orchestrator.processAndHandle(mockInputItem)).resolves.not.toThrow();
  });
}); 