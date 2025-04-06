# LangChain with Claude API Implementation Approach

This document details the implementation approach for using LangChain with Claude's API to filter and consolidate Todoist tasks based on the "Life Goals: A Balanced Perspective" framework.

## 1. Overview of the Implementation

The implementation uses LangChain as a framework to integrate with Claude's API for intelligent task filtering. This approach leverages Claude's natural language understanding capabilities to evaluate tasks against complex life goal criteria.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│  JSON Loader    │────▶│  Task Processor │────▶│ Claude Evaluator│────▶│ Output Generator│
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 2. LangChain Components Used

### 2.1 LLM Integration

```python
from langchain.llms import Anthropic

# Initialize Claude
claude = Anthropic(api_key=api_key)
```

LangChain's `Anthropic` class provides a seamless interface to Claude's API, handling authentication, request formatting, and response parsing.

### 2.2 Prompt Templates

```python
from langchain.prompts import PromptTemplate

filtering_template = """
You are an assistant tasked with filtering tasks based on specific life goal criteria.

Task Information:
Content: {content}
Description: {description}
Project: {project_name}
Due Date: {due_date}
Priority: {priority}
Parent Task: {parent_task}

Filtering Criteria:
1. Goal Area Alignment: Tasks should align with one or more of these life goal areas:
   - Foundational Pillars: Physical Health, Mental Health, Financial Stability
   - Core Connections: Healthy Marriage (with Caitlyn), Social Connection
   - Growth & Aspirations: Career Progression, Home Ownership, Children

2. Current Focus Areas (as of April 6, 2025):
   - Financial Stability (primary focus)
   - Career Progression / Job Search (parallel key priority)
   - Physical Health (active area requiring attention)
   - Healthy Marriage (crucial contextually)
   - Mental Health (essential for navigating priorities)

3. Eisenhower Matrix Classification:
   - Urgent & Important (Do First)
   - Important & Not Urgent (Schedule)
   - Urgent & Not Important (Minimize)
   - Not Urgent & Not Important (Defer/Delete)

Based on these criteria, analyze this task and provide the following:

1. Goal Areas: Which life goal areas does this task align with? List all that apply.
2. Eisenhower Quadrant: Which quadrant does this task belong to?
3. Keep or Filter: Should this task be kept or filtered out?
4. Reasoning: Explain your decision.

Response Format:
Goal Areas: [List applicable goal areas]
Eisenhower Quadrant: [Quadrant]
Decision: [Keep/Filter]
Reasoning: [Brief explanation]
"""

filtering_prompt = PromptTemplate(
    input_variables=["content", "description", "project_name", "due_date", "priority", "parent_task"],
    template=filtering_template
)
```

LangChain's `PromptTemplate` allows for structured, templated prompts with variable substitution, ensuring consistent formatting for each task evaluation.

### 2.3 LLM Chains

```python
from langchain.chains import LLMChain

filtering_chain = LLMChain(llm=claude, prompt=filtering_prompt)
```

LangChain's `LLMChain` combines the LLM (Claude) with the prompt template, creating a reusable component for task evaluation.

## 3. Claude API Integration

### 3.1 API Configuration

Claude's API is accessed through LangChain's `Anthropic` class, which requires an API key for authentication:

```python
claude = Anthropic(api_key="your_claude_api_key")
```

### 3.2 Prompt Engineering for Claude

The prompt for Claude is carefully designed to:

1. **Provide Context**: Explain the task filtering objective and provide all necessary task information
2. **Define Criteria**: Clearly outline the life goals framework and current focus areas
3. **Structure Output**: Request a specific response format for consistent parsing
4. **Encourage Reasoning**: Ask for explanations of decisions to ensure transparency

### 3.3 Response Parsing

Claude's responses are parsed to extract structured information:

```python
result = filtering_chain.run(**task_info)

# Parse result
goal_areas_text = result.split("Goal Areas:")[1].split("\n")[0].strip()
eisenhower_text = result.split("Eisenhower Quadrant:")[1].split("\n")[0].strip()
decision_text = result.split("Decision:")[1].split("\n")[0].strip()
reasoning_text = result.split("Reasoning:")[1].strip() if "Reasoning:" in result else ""

# Convert goal areas text to list
goal_areas = [area.strip() for area in goal_areas_text.split(",")]
if "None" in goal_areas:
    goal_areas = []

# Check if task should be kept
if "Keep" in decision_text:
    # Add metadata to task
    task["goal_areas"] = goal_areas
    task["eisenhower_quadrant"] = eisenhower_text
    task["filtering_reasoning"] = reasoning_text
    
    # Add to filtered tasks
    filtered_tasks.append(task)
```

## 4. Batch Processing for Efficiency

To optimize API usage and processing time, tasks are processed in batches:

```python
def process_tasks_in_batches(tasks, filtering_chain, batch_size=10):
    filtered_tasks = []
    total_batches = (len(tasks) + batch_size - 1) // batch_size
    
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i+batch_size]
        batch_num = i // batch_size + 1
        logging.info(f"Processing batch {batch_num}/{total_batches}")
        
        for task in batch:
            # Process each task in the batch
            # ...
```

This approach:
- Reduces the number of logging statements
- Provides better progress tracking
- Allows for potential parallel processing in future implementations

## 5. Error Handling and Resilience

The implementation includes robust error handling to ensure resilience:

```python
try:
    result = filtering_chain.run(**task_info)
    # Process result
except Exception as e:
    logging.error(f"Error processing task '{task['content']}': {str(e)}")
    # Continue with next task
```

This ensures that:
- A failure in processing one task doesn't stop the entire batch
- Errors are logged for later analysis
- The system can recover and continue processing

## 6. Handling Edge Cases

### 6.1 Tasks with Multiple Goal Areas

Claude can identify multiple goal areas for a single task:

```python
# Convert goal areas text to list
goal_areas = [area.strip() for area in goal_areas_text.split(",")]
```

### 6.2 Vague Task Descriptions

For tasks with vague descriptions, Claude provides interpretations:

```python
if len(content) < 10 and len(description) < 10:
    # Ask Claude to interpret the vague task
    vague_prompt = f"""
    This task has a vague or minimal description:
    
    Task: {content}
    Description: {description}
    Project: {task.get("project_name", "")}
    
    Based on the limited information, try to interpret what this task might be about...
    """
    
    response = claude.complete(prompt=vague_prompt, max_tokens_to_sample=400)
    
    # Add interpretation as metadata
    task["vague_task_interpretation"] = response
```

### 6.3 Task Dependencies

The implementation preserves task dependencies:

```python
def handle_task_dependencies(filtered_tasks, all_tasks):
    # Create lookup dictionaries
    filtered_task_ids = {task["id"]: task for task in filtered_tasks}
    all_task_ids = {task["id"]: task for task in all_tasks}
    
    # Check parent tasks of kept subtasks
    for task in filtered_tasks:
        if task.get("parent_id"):
            parent_id = task["parent_id"]
            
            # If parent not already in filtered tasks, add it
            if parent_id not in filtered_task_ids and parent_id in all_task_ids:
                # Add parent task
                # ...
```

## 7. Performance Considerations

### 7.1 API Usage Optimization

To optimize Claude API usage:

1. **Batch Processing**: Tasks are processed in batches to reduce overhead
2. **Minimal Prompts**: Prompts are designed to be concise while providing necessary context
3. **Response Parsing**: Only essential information is extracted from responses

### 7.2 Memory Management

For large JSON files, memory management is important:

```python
# Create copies of tasks to avoid modifying originals
task_copy = task.copy()

# Remove large arrays when not needed
if "sub_tasks" in task_copy:
    task_copy["sub_tasks_count"] = len(task_copy["sub_tasks"])
    del task_copy["sub_tasks"]
```

## 8. Extensibility and Customization

The implementation is designed for extensibility:

### 8.1 Customizable Filtering Criteria

The filtering criteria are defined in the prompt template and can be easily updated:

```python
filtering_template = """
You are an assistant tasked with filtering tasks based on specific life goal criteria.

Task Information:
...

Filtering Criteria:
1. Goal Area Alignment: ...
2. Current Focus Areas (as of April 6, 2025): ...
3. Eisenhower Matrix Classification: ...
"""
```

### 8.2 Adjustable Processing Parameters

Key parameters can be adjusted:

```python
def process_tasks_in_batches(tasks, filtering_chain, batch_size=10):
    # Batch size can be adjusted based on API rate limits and performance needs
```

## 9. Integration with Todoist

While this implementation processes exported Todoist JSON files, it could be extended to integrate directly with the Todoist API:

```python
# Potential future extension
import todoist

api = todoist.TodoistAPI('your_api_token')
api.sync()

# Get all projects
projects = api.projects.all()

# Get all tasks
tasks = api.items.all()

# Process tasks using the same filtering logic
# ...

# Update tasks with new metadata
for task in filtered_tasks:
    item = api.items.get_by_id(task["id"])
    # Update labels or comments with goal areas and Eisenhower quadrant
    # ...

api.commit()
```

## 10. Summary of Implementation Approach

The LangChain with Claude API implementation provides:

1. **Intelligent Filtering**: Leverages Claude's natural language understanding to evaluate tasks against complex criteria
2. **Structured Processing**: Uses LangChain's components for organized, maintainable code
3. **Robust Error Handling**: Ensures resilience against API failures and unexpected inputs
4. **Efficient Batch Processing**: Optimizes performance and API usage
5. **Comprehensive Metadata**: Adds valuable context to tasks about goal alignment and prioritization
6. **Flexible Output Structure**: Organizes filtered tasks in multiple views for different use cases
7. **Preserved Relationships**: Maintains task hierarchies and dependencies

This implementation successfully combines the power of LangChain's framework with Claude's language capabilities to create an intelligent task filtering system based on the "Life Goals: A Balanced Perspective" framework.
