import { InputSource, ItemNature } from '../../core/interfaces';
import { TextInputItem } from '../basic-input-items';

describe('TextInputItem', () => {
  test('should create with correct properties', () => {
    const input = new TextInputItem('test-content');
    
    expect(input.text).toBe('test-content');
    expect(input.source).toBe(InputSource.OTHER);
    expect(input.rawContent).toEqual({
      text: 'test-content',
      title: ''
    });
    expect(input.timestamp).toBeInstanceOf(Date);
  });
  
  test('should allow custom title and source', () => {
    const input = new TextInputItem('test-content', 'My Title', InputSource.EMAIL);
    
    expect(input.text).toBe('test-content');
    expect(input.title).toBe('My Title');
    expect(input.source).toBe(InputSource.EMAIL);
  });
  
  test('getPotentialNature should detect tasks', () => {
    const input = new TextInputItem('I need to finish the report');
    expect(input.getPotentialNature()).toBe(ItemNature.ACTIONABLE_TASK);
    
    const input2 = new TextInputItem('This is a todo item');
    expect(input2.getPotentialNature()).toBe(ItemNature.ACTIONABLE_TASK);
  });
  
  test('getPotentialNature should detect events', () => {
    const input = new TextInputItem('Meeting with team at 3pm');
    expect(input.getPotentialNature()).toBe(ItemNature.POTENTIAL_EVENT);
    
    const input2 = new TextInputItem('Schedule appointment for tomorrow');
    expect(input2.getPotentialNature()).toBe(ItemNature.POTENTIAL_EVENT);
  });
  
  test('getPotentialNature should detect reference info', () => {
    const input = new TextInputItem('FYI: check out https://example.com');
    expect(input.getPotentialNature()).toBe(ItemNature.REFERENCE_INFO);
    
    const input2 = new TextInputItem('For information purposes only');
    expect(input2.getPotentialNature()).toBe(ItemNature.REFERENCE_INFO);
  });
  
  test('getPotentialNature should detect project ideas', () => {
    const input = new TextInputItem('I have an idea for a new feature');
    expect(input.getPotentialNature()).toBe(ItemNature.PROJECT_IDEA);
    
    // Checking that "concept" words also trigger project detection
    const input2 = new TextInputItem('New concept');
    expect(input2.getPotentialNature()).toBe(ItemNature.PROJECT_IDEA);
  });
  
  test('getPotentialNature should default to unclear', () => {
    const input = new TextInputItem('Just some random text with no clear indicators');
    expect(input.getPotentialNature()).toBe(ItemNature.UNCLEAR);
  });
  
  test('getPotentialNature should handle precedence correctly', () => {
    // Test that task keywords take precedence
    const input = new TextInputItem('Please add this idea to the project');
    expect(input.getPotentialNature()).toBe(ItemNature.ACTIONABLE_TASK);
    
    // Test that event keywords take precedence over reference
    const input2 = new TextInputItem('Meeting information for reference at 2pm');
    expect(input2.getPotentialNature()).toBe(ItemNature.POTENTIAL_EVENT);
  });
}); 