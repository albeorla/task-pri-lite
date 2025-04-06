# Filtering Criteria Summary

This document summarizes the key filtering criteria extracted from the "Life Goals: A Balanced Perspective" document for processing Todoist tasks.

## 1. Goal Area Alignment

Tasks are evaluated based on their alignment with the following life goal areas:

### Foundational Pillars
- **Physical Health**: Tasks related to maintaining a healthy body capable of supporting life activities
- **Mental Health**: Tasks focused on cultivating emotional stability, resilience, and psychological well-being
- **Financial Stability**: Tasks ensuring sufficient resources and security to meet needs and reduce financial stress

### Core Connections
- **Healthy Marriage**: Tasks building and maintaining a mutually supportive partnership with Caitlyn
- **Social Connection**: Tasks cultivating meaningful relationships with friends, family, and community

### Growth & Aspirations
- **Career Progression**: Tasks seeking growth, achievement, competence, and satisfaction in professional life
- **Home Ownership**: Tasks working toward owning a home, representing stability, security, and accomplishment
- **Children**: Tasks related to potentially raising a family (future goal)

## 2. Current Focus Areas (as of April 6, 2025)

Tasks are prioritized based on their relevance to the current focus areas:

- **Financial Stability** (primary focus): Tasks directly supporting financial management, budgeting, and resource allocation
- **Career Progression / Job Search** (parallel key priority): Tasks related to finding employment and developing career skills
- **Physical Health** (active area requiring attention): Tasks supporting bodily health and well-being
- **Healthy Marriage** (crucial contextually): Tasks nurturing the partnership with Caitlyn
- **Mental Health** (essential for navigating priorities): Tasks supporting emotional well-being during periods of change

## 3. Eisenhower Matrix Classification

Tasks are classified according to the Eisenhower Matrix to determine priority:

### Urgent & Important (Do First)
- Tasks related to immediate financial actions and management
- Time-sensitive personal/health tasks
- Immediate career/income tasks
- Tasks with due dates today or tomorrow
- Tasks explicitly mentioned as critical in the document

### Important & Not Urgent (Schedule)
- Foundational planning and long-term health/well-being tasks
- Relationship-focused actions
- Tasks with future due dates
- Tasks that support long-term goals but don't require immediate action

### Urgent & Not Important (Minimize)
- Tasks that feel urgent but don't align with core goals
- Administrative tasks that could be streamlined or automated
- Interruptions that demand attention but don't contribute significantly to goals

### Not Urgent & Not Important (Delete/Defer)
- Items in the "backlog" project
- Vague or outdated tasks
- Items explicitly deferred
- Tasks with no clear alignment to current focus areas

## 4. Project Association

Tasks are evaluated based on their project association:

- **High Priority Projects**: "financial-stability", health-related projects, relationship-supporting projects
- **Project Content Analysis**: Tasks in other projects are analyzed for relevance to current focus areas

## 5. Task Attributes

Several task attributes are considered in the filtering process:

- **Due Dates**: Tasks due today or tomorrow are typically considered urgent
- **Priority Levels**: Tasks with higher priority in Todoist (lower number) are typically more important
- **Task Content**: Keywords related to current focus areas increase relevance
- **Task Description**: Detailed descriptions help determine goal alignment
- **Parent-Child Relationships**: Dependencies between tasks are preserved

## 6. Special Cases Handling

The filtering process includes special handling for:

### Tasks with Multiple Goal Areas
- Tasks can align with multiple life goal areas
- Each applicable goal area is recorded in the task metadata
- Tasks appear in multiple sections of the goal area view

### Tasks with Dependencies
- Parent tasks with kept subtasks are preserved
- Critical subtasks for kept parent tasks are preserved
- The hierarchical structure is maintained in the output

### Recurring Tasks
- Recurring tasks related to current focus areas are kept
- Recurrence information is preserved in the output

### Tasks with Vague Descriptions
- Claude analyzes vague tasks to determine potential relevance
- Interpretations are included in the task metadata

## 7. Implementation Approach

The filtering criteria are implemented through:

1. **Goal Area Detection**: Analyzing task content, description, and project to determine alignment with life goal areas
2. **Focus Area Relevance**: Determining if the task is relevant to current focus areas
3. **Eisenhower Classification**: Categorizing tasks based on urgency and importance
4. **Project Analysis**: Evaluating the relevance of the task's project
5. **Attribute Analysis**: Examining specific task attributes for relevance
6. **Decision Logic**: Combining all factors to make a keep/filter decision
7. **Dependency Handling**: Ensuring task dependencies are maintained

This comprehensive approach ensures that the filtered tasks align with the life goals framework while maintaining the integrity and relationships of the original data.
