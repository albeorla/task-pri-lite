# Output JSON Structure Details

This document provides a detailed explanation of the output JSON structure for the filtered tasks based on the "Life Goals: A Balanced Perspective" framework.

## 1. Top-Level Structure

The output JSON has a three-part structure:

```json
{
  "metadata": {
    // Information about the filtering process
  },
  "views": {
    // Multiple organizational views of the filtered tasks
  },
  "hierarchical_tasks": [
    // Tasks organized in their original hierarchy
  ]
}
```

This structure provides both metadata about the filtering process and multiple ways to view and interact with the filtered tasks.

## 2. Metadata Section

The metadata section contains information about the filtering process and statistical summaries:

```json
"metadata": {
  "filtering_date": "2025-04-06",
  "filtering_criteria": "Life Goals: A Balanced Perspective",
  "original_export_date": "2025-04-06T17:17:29.701818",
  "total_tasks_before_filtering": 138,
  "total_tasks_after_filtering": 85,
  "filtering_ratio": 61.59,
  "goal_areas_distribution": {
    "Financial Stability": 32,
    "Career Progression": 18,
    "Physical Health": 15,
    "Mental Health": 8,
    "Healthy Marriage": 12,
    "Social Connection": 5,
    "Home Ownership": 2,
    "Children": 0,
    "Dependency": 7,
    "Uncategorized": 3
  },
  "eisenhower_distribution": {
    "Urgent & Important": 25,
    "Important & Not Urgent": 42,
    "Urgent & Not Important": 10,
    "Not Urgent & Not Important": 8
  }
}
```

### 2.1 Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `filtering_date` | String | Date when the filtering was performed (YYYY-MM-DD) |
| `filtering_criteria` | String | Name of the criteria document used for filtering |
| `original_export_date` | String | Timestamp from the original Todoist export |
| `total_tasks_before_filtering` | Integer | Total number of tasks in the original export |
| `total_tasks_after_filtering` | Integer | Number of tasks retained after filtering |
| `filtering_ratio` | Float | Percentage of tasks retained (0-100) |
| `goal_areas_distribution` | Object | Count of tasks by goal area |
| `eisenhower_distribution` | Object | Count of tasks by Eisenhower quadrant |

### 2.2 Distribution Objects

The distribution objects provide a quick overview of how tasks are distributed across goal areas and Eisenhower quadrants. This is useful for:

- Identifying which goal areas have the most tasks
- Understanding the urgency/importance balance of the filtered tasks
- Tracking changes in distribution over time

## 3. Views Section

The views section provides three different ways to organize the filtered tasks:

```json
"views": {
  "by_project": {
    // Tasks organized by their original project
  },
  "by_goal_area": {
    // Tasks organized by life goal area
  },
  "by_eisenhower": {
    // Tasks organized by Eisenhower quadrant
  }
}
```

### 3.1 By Project View

Tasks are organized by their original Todoist project:

```json
"by_project": {
  "financial-stability": [
    {
      "id": "8850779614",
      "content": "Career Search",
      "description": "",
      "project_name": "financial-stability",
      "project_id": "2348371591",
      "goal_areas": ["Career Progression", "Financial Stability"],
      "eisenhower_quadrant": "Urgent & Important",
      "filtering_reasoning": "This task directly supports Career Progression and Financial Stability, which are current focus areas. Job search is identified as a parallel key priority.",
      "due_date": null,
      "is_recurring": false,
      "priority": 1,
      "url": "https://app.todoist.com/app/task/8850779614",
      "sub_tasks_count": 5
    },
    // More tasks in this project...
  ],
  "personal": [
    // Tasks in the personal project...
  ],
  // More projects...
}
```

#### Benefits of By Project View

1. **Familiar Organization**: Matches the original Todoist project structure
2. **Project Context**: Keeps tasks grouped by their original context
3. **Workflow Compatibility**: Aligns with project-based workflow approaches

### 3.2 By Goal Area View

Tasks are organized by life goal area:

```json
"by_goal_area": {
  "Financial Stability": [
    {
      "id": "9020460045",
      "content": "Financial",
      "description": "I need to systematically organize my finances...",
      "project_name": "financial-stability",
      "project_id": "2348371591",
      "goal_areas": ["Financial Stability"],
      "eisenhower_quadrant": "Urgent & Important",
      "filtering_reasoning": "This task directly supports Financial Stability, which is the primary focus area. It has a due date of today (April 6, 2025) making it urgent.",
      "due_date": "2025-04-06",
      "is_recurring": false,
      "priority": 1,
      "url": "https://app.todoist.com/app/task/9020460045"
    },
    // More tasks in this goal area...
  ],
  "Career Progression": [
    // Tasks in this goal area...
  ],
  // More goal areas...
}
```

#### Benefits of By Goal Area View

1. **Goal-Centric Organization**: Aligns directly with the life goals framework
2. **Focus Area Clarity**: Makes it easy to see all tasks supporting a specific goal
3. **Balance Assessment**: Helps evaluate balance across different life areas

### 3.3 By Eisenhower Quadrant View

Tasks are organized by Eisenhower Matrix quadrant:

```json
"by_eisenhower": {
  "Urgent & Important": [
    {
      "id": "9020460045",
      "content": "Financial",
      "description": "I need to systematically organize my finances...",
      "project_name": "financial-stability",
      "project_id": "2348371591",
      "goal_areas": ["Financial Stability"],
      "eisenhower_quadrant": "Urgent & Important",
      "filtering_reasoning": "This task directly supports Financial Stability, which is the primary focus area. It has a due date of today (April 6, 2025) making it urgent.",
      "due_date": "2025-04-06",
      "is_recurring": false,
      "priority": 1,
      "url": "https://app.todoist.com/app/task/9020460045"
    },
    // More tasks in this quadrant...
  ],
  "Important & Not Urgent": [
    // Tasks in this quadrant...
  ],
  // More quadrants...
}
```

#### Benefits of By Eisenhower View

1. **Priority-Based Organization**: Groups tasks by urgency and importance
2. **Action Planning**: Supports the "Do First, Schedule, Delegate, Delete" workflow
3. **Time Management**: Helps allocate time based on task priority

### 3.4 Task Representation in Views

In all views, tasks include:

1. **Original Properties**: All relevant properties from the Todoist export
2. **Added Metadata**: Goal areas, Eisenhower quadrant, and filtering reasoning
3. **Subtask Count**: Number of subtasks instead of the full subtask array

This approach keeps the views lightweight while providing all necessary information.

## 4. Hierarchical Tasks Section

The hierarchical_tasks section preserves the original parent-child relationships:

```json
"hierarchical_tasks": [
  {
    "id": "8850779614",
    "content": "Career Search",
    "description": "",
    "project_name": "financial-stability",
    "project_id": "2348371591",
    "goal_areas": ["Career Progression", "Financial Stability"],
    "eisenhower_quadrant": "Urgent & Important",
    "filtering_reasoning": "This task directly supports Career Progression and Financial Stability, which are current focus areas. Job search is identified as a parallel key priority.",
    "due_date": null,
    "is_recurring": false,
    "priority": 1,
    "url": "https://app.todoist.com/app/task/8850779614",
    "sub_tasks": [
      {
        "id": "8985877076",
        "content": "Organize skillset for each role",
        "description": "",
        "project_name": "financial-stability",
        "project_id": "2348371591",
        "parent_id": "8850779614",
        "goal_areas": ["Career Progression"],
        "eisenhower_quadrant": "Important & Not Urgent",
        "filtering_reasoning": "This task supports Career Progression by preparing for job applications. It's important but not marked as urgent since it's preparatory work.",
        "due_date": null,
        "is_recurring": false,
        "priority": 1,
        "url": "https://app.todoist.com/app/task/8985877076"
      },
      // More subtasks...
    ]
  },
  // More root tasks...
]
```

### 4.1 Hierarchical Structure Benefits

1. **Preserved Relationships**: Maintains the original parent-child task relationships
2. **Context Preservation**: Keeps subtasks in the context of their parent tasks
3. **Workflow Support**: Supports hierarchical task management workflows
4. **Dependency Clarity**: Makes task dependencies explicit

### 4.2 Recursive Structure

The hierarchical structure is recursive, allowing for multiple levels of nesting:

```
Parent Task
  └── Subtask
       └── Sub-subtask
            └── Sub-sub-subtask
```

Each level includes all task properties and metadata.

## 5. Task Object Structure

Each task object in the output includes the following properties:

### 5.1 Original Todoist Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | String | Unique identifier for the task |
| `content` | String | Task title/content |
| `description` | String | Detailed task description |
| `project_name` | String | Name of the project containing the task |
| `project_id` | String | ID of the project containing the task |
| `parent_id` | String | ID of the parent task (for subtasks) |
| `due_date` | String | Due date in YYYY-MM-DD format (if any) |
| `is_recurring` | Boolean | Whether the task is recurring |
| `priority` | Integer | Task priority (1-4, with 1 being highest) |
| `url` | String | URL to the task in Todoist web app |

### 5.2 Added Metadata

| Property | Type | Description |
|----------|------|-------------|
| `goal_areas` | Array | List of life goal areas the task aligns with |
| `eisenhower_quadrant` | String | Eisenhower Matrix classification |
| `filtering_reasoning` | String | Explanation of why the task was kept |
| `vague_task_interpretation` | String | Interpretation of vague tasks (when applicable) |

### 5.3 Hierarchy Information

| Property | Type | Description |
|----------|------|-------------|
| `sub_tasks` | Array | Array of subtask objects (only in hierarchical view) |
| `sub_tasks_count` | Integer | Number of subtasks (only in non-hierarchical views) |

## 6. Special Cases Handling

### 6.1 Tasks with Multiple Goal Areas

Tasks that align with multiple goal areas appear in each relevant section of the `by_goal_area` view:

```json
"by_goal_area": {
  "Financial Stability": [
    {
      "id": "8850779614",
      "content": "Career Search",
      "goal_areas": ["Career Progression", "Financial Stability"],
      // Other properties...
    },
    // More tasks...
  ],
  "Career Progression": [
    {
      "id": "8850779614",
      "content": "Career Search",
      "goal_areas": ["Career Progression", "Financial Stability"],
      // Other properties...
    },
    // More tasks...
  ]
}
```

This ensures that:
- Tasks are accessible from all relevant goal areas
- No information is lost when organizing by goal area
- The relationship between goals is visible

### 6.2 Tasks Added Due to Dependencies

Tasks that were added to maintain dependencies have special metadata:

```json
{
  "id": "8892552175",
  "content": "Netflix Ads Role",
  "description": "Netflix ads\n\n[James Man on LinkedIn: #hiring #netflix #adtech...",
  "project_name": "financial-stability",
  "project_id": "2348371591",
  "goal_areas": ["Dependency"],
  "eisenhower_quadrant": "Important & Not Urgent",
  "filtering_reasoning": "Added to maintain task hierarchy - has kept subtasks",
  // Other properties...
}
```

The `"Dependency"` goal area and specific reasoning make it clear why these tasks were included.

### 6.3 Tasks with Vague Descriptions

Tasks with vague descriptions that were kept include the interpretation:

```json
{
  "id": "8940724808",
  "content": "Split cash, route incoming $$$ fairly",
  "description": "",
  "project_name": "financial-stability",
  "project_id": "2348371591",
  "goal_areas": ["Financial Stability", "Healthy Marriage"],
  "eisenhower_quadrant": "Important & Not Urgent",
  "filtering_reasoning": "This task supports Financial Stability and potentially Healthy Marriage as it involves managing shared finances.",
  "vague_task_interpretation": "This appears to be about setting up a system to fairly distribute incoming money, likely between partners. This directly supports Financial Stability and has implications for Healthy Marriage as it involves financial collaboration with Caitlyn.",
  // Other properties...
}
```

The `vague_task_interpretation` field provides context that might not be obvious from the task content alone.

## 7. Usage Examples

### 7.1 Accessing Tasks by Project

```javascript
// Example JavaScript code to access tasks in a specific project
const financialTasks = filteredData.views.by_project["financial-stability"];
console.log(`Found ${financialTasks.length} tasks in the financial-stability project`);
```

### 7.2 Finding Urgent & Important Tasks

```javascript
// Example JavaScript code to access urgent and important tasks
const urgentImportantTasks = filteredData.views.by_eisenhower["Urgent & Important"];
console.log(`Found ${urgentImportantTasks.length} urgent and important tasks`);
```

### 7.3 Analyzing Goal Area Distribution

```javascript
// Example JavaScript code to analyze goal area distribution
const goalDistribution = filteredData.metadata.goal_areas_distribution;
const totalTasks = filteredData.metadata.total_tasks_after_filtering;

for (const [area, count] of Object.entries(goalDistribution)) {
  const percentage = (count / totalTasks * 100).toFixed(1);
  console.log(`${area}: ${count} tasks (${percentage}%)`);
}
```

### 7.4 Traversing the Task Hierarchy

```javascript
// Example JavaScript code to traverse the task hierarchy
function printTaskHierarchy(tasks, indent = 0) {
  for (const task of tasks) {
    console.log(`${"  ".repeat(indent)}${task.content}`);
    if (task.sub_tasks && task.sub_tasks.length > 0) {
      printTaskHierarchy(task.sub_tasks, indent + 1);
    }
  }
}

printTaskHierarchy(filteredData.hierarchical_tasks);
```

## 8. Benefits of This Structure

### 8.1 Multiple Perspectives

The structure provides three different ways to view the same data:
- **Project-centric**: Familiar organization matching Todoist
- **Goal-centric**: Aligned with life goals framework
- **Priority-centric**: Based on urgency and importance

### 8.2 Rich Metadata

Each task includes metadata about:
- Which life goals it supports
- Its priority classification
- Why it was kept
- Its relationships to other tasks

### 8.3 Flexible Usage

The structure supports various use cases:
- Task management applications
- Data visualization
- Priority-based planning
- Goal tracking

### 8.4 Data Integrity

The structure preserves:
- All original task properties
- Parent-child relationships
- Project associations
- Due dates and priorities

## 9. Implementation Considerations

### 9.1 File Size

The output JSON may be larger than the input due to:
- Added metadata for each task
- Multiple representations in different views
- Detailed reasoning for filtering decisions

This is a reasonable trade-off for the added value of the rich structure.

### 9.2 Parsing Complexity

The nested structure requires careful parsing:
- Use recursive functions for traversing the hierarchy
- Consider flattening for certain operations
- Cache frequently accessed views

### 9.3 Updating and Maintenance

If the filtered data needs to be updated:
- Preserve task IDs for continuity
- Compare with previous versions to track changes
- Consider incremental updates for efficiency

## 10. Conclusion

The output JSON structure balances comprehensiveness with usability, providing a rich, multi-faceted view of the filtered tasks while maintaining the integrity and relationships of the original data. It supports various ways of viewing and interacting with the tasks, making it adaptable to different workflows and use cases.
