#!/usr/bin/env python3
"""
Life Goals Task Filter - Conceptual Implementation

This script processes a Todoist export JSON file and filters tasks based on the
"Life Goals: A Balanced Perspective" framework using LangChain with Claude's API.

Usage:
    python3 conceptual_implementation.py --input todoist_export.json --output filtered_tasks.json --api-key your_claude_api_key
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# LangChain imports
from langchain.llms import Anthropic
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("task_filter.log"),
        logging.StreamHandler()
    ]
)

# Constants
GOAL_AREAS = [
    "Physical Health", 
    "Mental Health", 
    "Financial Stability",
    "Healthy Marriage", 
    "Social Connection",
    "Career Progression", 
    "Home Ownership", 
    "Children"
]

CURRENT_FOCUS_AREAS = [
    "Financial Stability",
    "Career Progression",
    "Physical Health",
    "Healthy Marriage",
    "Mental Health"
]

EISENHOWER_QUADRANTS = [
    "Urgent & Important",
    "Important & Not Urgent",
    "Urgent & Not Important",
    "Not Urgent & Not Important"
]

class TaskFilter:
    """Main class for filtering tasks based on life goals criteria."""
    
    def __init__(self, api_key: str):
        """Initialize the TaskFilter with Claude API key."""
        self.api_key = api_key
        self.claude = None
        self.filtering_chain = None
        self.initialize_langchain()
    
    def initialize_langchain(self) -> None:
        """Initialize LangChain with Claude API."""
        try:
            logging.info("Initializing LangChain with Claude API")
            
            # Initialize Claude
            self.claude = Anthropic(api_key=self.api_key)
            
            # Create filtering prompt template
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

            # Create LLMChain
            self.filtering_chain = LLMChain(llm=self.claude, prompt=filtering_prompt)
            
            logging.info("LangChain initialization successful")
        except Exception as e:
            logging.error(f"Error initializing LangChain: {str(e)}")
            raise
    
    def load_json_file(self, file_path: str) -> Dict[str, Any]:
        """Load and parse the JSON file."""
        try:
            logging.info(f"Loading JSON file from {file_path}")
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            logging.info(f"Successfully loaded JSON file with {len(data.get('projects', []))} projects")
            return data
        except Exception as e:
            logging.error(f"Error loading JSON file: {str(e)}")
            raise
    
    def validate_json_structure(self, data: Dict[str, Any]) -> bool:
        """Validate that the JSON has the expected structure."""
        try:
            # Check for required top-level keys
            required_keys = ["metadata", "projects"]
            for key in required_keys:
                if key not in data:
                    logging.error(f"Missing required key in JSON: {key}")
                    return False
            
            # Check projects structure
            if not isinstance(data["projects"], list):
                logging.error("Projects must be a list")
                return False
            
            # Validate each project
            for i, project in enumerate(data["projects"]):
                if "name" not in project:
                    logging.error(f"Project at index {i} missing name")
                    return False
                if "tasks" not in project:
                    logging.error(f"Project at index {i} missing tasks")
                    return False
                if not isinstance(project["tasks"], list):
                    logging.error(f"Tasks in project {project['name']} must be a list")
                    return False
            
            logging.info("JSON structure validation successful")
            return True
        except Exception as e:
            logging.error(f"Error validating JSON structure: {str(e)}")
            return False
    
    def extract_all_tasks(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all tasks from all projects and flatten the hierarchy."""
        all_tasks = []
        
        try:
            logging.info("Extracting tasks from projects")
            for project in data["projects"]:
                project_name = project["name"]
                project_id = project["id"]
                
                # Process main tasks
                for task in project["tasks"]:
                    # Add project information to task
                    task["project_name"] = project_name
                    task["project_id"] = project_id
                    all_tasks.append(task)
                    
                    # Process subtasks
                    if "sub_tasks" in task and task["sub_tasks"]:
                        for subtask in task["sub_tasks"]:
                            # Add project and parent task information
                            subtask["project_name"] = project_name
                            subtask["project_id"] = project_id
                            subtask["parent_task_content"] = task["content"]
                            all_tasks.append(subtask)
            
            logging.info(f"Extracted {len(all_tasks)} tasks in total")
            return all_tasks
        except Exception as e:
            logging.error(f"Error extracting tasks: {str(e)}")
            raise
    
    def preprocess_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Preprocess tasks to standardize data and handle missing fields."""
        processed_tasks = []
        
        try:
            logging.info("Preprocessing tasks")
            for task in tasks:
                # Create a copy to avoid modifying the original
                processed_task = task.copy()
                
                # Ensure all tasks have standard fields
                processed_task["description"] = processed_task.get("description", "")
                processed_task["priority"] = processed_task.get("priority", 4)  # Default to lowest priority
                processed_task["labels"] = processed_task.get("labels", [])
                processed_task["parent_id"] = processed_task.get("parent_id", None)
                
                # Format due date information
                if "due" in processed_task and processed_task["due"]:
                    due_info = processed_task["due"]
                    processed_task["due_date"] = due_info.get("date", None)
                    processed_task["is_recurring"] = due_info.get("is_recurring", False)
                else:
                    processed_task["due_date"] = None
                    processed_task["is_recurring"] = False
                
                # Add to processed list
                processed_tasks.append(processed_task)
            
            logging.info(f"Preprocessed {len(processed_tasks)} tasks")
            return processed_tasks
        except Exception as e:
            logging.error(f"Error preprocessing tasks: {str(e)}")
            raise
    
    def process_tasks_in_batches(self, tasks: List[Dict[str, Any]], batch_size: int = 10) -> List[Dict[str, Any]]:
        """Process tasks in batches for efficiency."""
        filtered_tasks = []
        total_batches = (len(tasks) + batch_size - 1) // batch_size
        
        try:
            logging.info(f"Processing {len(tasks)} tasks in batches of {batch_size}")
            
            for i in range(0, len(tasks), batch_size):
                batch = tasks[i:i+batch_size]
                batch_num = i // batch_size + 1
                logging.info(f"Processing batch {batch_num}/{total_batches}")
                
                for task in batch:
                    # Prepare task information for Claude
                    task_info = {
                        "content": task["content"],
                        "description": task.get("description", ""),
                        "project_name": task.get("project_name", ""),
                        "due_date": task.get("due_date", "None"),
                        "priority": task.get("priority", 4),
                        "parent_task": task.get("parent_task_content", "None")
                    }
                    
                    # Run filtering chain
                    try:
                        result = self.filtering_chain.run(**task_info)
                        
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
                            logging.info(f"Kept task: {task['content']}")
                        else:
                            logging.info(f"Filtered out task: {task['content']}")
                    
                    except Exception as e:
                        logging.error(f"Error processing task '{task['content']}': {str(e)}")
                        # Continue with next task
            
            logging.info(f"Filtering complete. Kept {len(filtered_tasks)} out of {len(tasks)} tasks")
            return filtered_tasks
        except Exception as e:
            logging.error(f"Error in batch processing: {str(e)}")
            raise
    
    def handle_task_dependencies(self, filtered_tasks: List[Dict[str, Any]], all_tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensure task dependencies are maintained in the filtered output."""
        additional_tasks = []
        
        try:
            logging.info("Handling task dependencies")
            
            # Create lookup dictionaries
            filtered_task_ids = {task["id"]: task for task in filtered_tasks}
            all_task_ids = {task["id"]: task for task in all_tasks}
            
            # First pass: Check parent tasks of kept subtasks
            for task in filtered_tasks:
                if task.get("parent_id"):
                    parent_id = task["parent_id"]
                    
                    # If parent not already in filtered tasks, add it
                    if parent_id not in filtered_task_ids and parent_id in all_task_ids:
                        parent_task = all_task_ids[parent_id].copy()
                        parent_task["goal_areas"] = ["Dependency"]
                        parent_task["eisenhower_quadrant"] = "Important & Not Urgent"
                        parent_task["filtering_reasoning"] = "Added to maintain task hierarchy - has kept subtasks"
                        additional_tasks.append(parent_task)
                        logging.info(f"Added parent task: {parent_task['content']}")
            
            # Second pass: Check for subtasks that might be needed for kept parent tasks
            for task in filtered_tasks:
                if "sub_tasks" in task and task["sub_tasks"]:
                    for subtask in task["sub_tasks"]:
                        subtask_id = subtask["id"]
                        
                        # If subtask not already in filtered tasks, consider adding it
                        if subtask_id not in filtered_task_ids and subtask_id in all_task_ids:
                            # Check if subtask is critical for parent task
                            subtask_content = subtask["content"].lower()
                            parent_content = task["content"].lower()
                            
                            # Simple heuristic: if subtask seems critical based on content
                            critical_keywords = ["required", "necessary", "must", "essential", "first step", "prerequisite"]
                            if any(keyword in subtask_content for keyword in critical_keywords):
                                subtask_full = all_task_ids[subtask_id].copy()
                                subtask_full["goal_areas"] = ["Dependency"]
                                subtask_full["eisenhower_quadrant"] = task["eisenhower_quadrant"]
                                subtask_full["filtering_reasoning"] = "Added as critical subtask for a kept parent task"
                                additional_tasks.append(subtask_full)
                                logging.info(f"Added critical subtask: {subtask_full['content']}")
            
            # Combine original filtered tasks with additional tasks
            combined_tasks = filtered_tasks + additional_tasks
            logging.info(f"Added {len(additional_tasks)} tasks to maintain dependencies")
            
            return combined_tasks
        except Exception as e:
            logging.error(f"Error handling task dependencies: {str(e)}")
            # Return original filtered tasks if error occurs
            return filtered_tasks
    
    def organize_tasks_by_project(self, tasks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Organize tasks by project for the output structure."""
        organized = {}
        
        try:
            logging.info("Organizing tasks by project")
            
            for task in tasks:
                project_name = task.get("project_name", "Uncategorized")
                
                if project_name not in organized:
                    organized[project_name] = []
                
                # Create a copy of the task for the view
                task_copy = task.copy()
                
                # Add subtask count instead of full subtasks for non-hierarchical view
                if "sub_tasks" in task_copy:
                    task_copy["sub_tasks_count"] = len(task_copy["sub_tasks"])
                    del task_copy["sub_tasks"]
                
                organized[project_name].append(task_copy)
            
            logging.info(f"Organized tasks into {len(organized)} projects")
            return organized
        except Exception as e:
            logging.error(f"Error organizing tasks by project: {str(e)}")
            raise
    
    def organize_tasks_by_goal_area(self, tasks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Organize tasks by goal area for the output structure."""
        organized = {}
        
        try:
            logging.info("Organizing tasks by goal area")
            
            for task in tasks:
                goal_areas = task.get("goal_areas", ["Uncategorized"])
                
                # Handle tasks with multiple goal areas
                for area in goal_areas:
                    if area not in organized:
                        organized[area] = []
                    
                    # Create a copy of the task for this goal area
                    task_copy = task.copy()
                    
                    # Add subtask count instead of full subtasks for non-hierarchical view
                    if "sub_tasks" in task_copy:
                        task_copy["sub_tasks_count"] = len(task_copy["sub_tasks"])
                        del task_copy["sub_tasks"]
                    
                    # Add to this goal area
                    organized[area].append(task_copy)
            
            logging.info(f"Organized tasks into {len(organized)} goal areas")
            return organized
        except Exception as e:
            logging.error(f"Error organizing tasks by goal area: {str(e)}")
            raise
    
    def organize_tasks_by_eisenhower(self, tasks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Organize tasks by Eisenhower quadrant for the output structure."""
        organized = {
            "Urgent & Important": [],
            "Important & Not Urgent": [],
            "Urgent & Not Important": [],
            "Not Urgent & Not Important": [],
            "Uncategorized": []
        }
        
        try:
            logging.info("Organizing tasks by Eisenhower quadrant")
            
            for task in tasks:
                quadrant = task.get("eisenhower_quadrant", "Uncategorized")
                
                # Create a copy of the task for this quadrant
                task_copy = task.copy()
                
                # Add subtask count instead of full subtasks for non-hierarchical view
                if "sub_tasks" in task_copy:
                    task_copy["sub_tasks_count"] = len(task_copy["sub_tasks"])
                    del task_copy["sub_tasks"]
                
                # Add task to appropriate quadrant
                if quadrant in organized:
                    organized[quadrant].append(task_copy)
                else:
                    organized["Uncategorized"].append(task_copy)
            
            # Remove empty quadrants
            organized = {k: v for k, v in organized.items() if v}
            
            logging.info(f"Organized tasks into {len(organized)} Eisenhower quadrants")
            return organized
        except Exception as e:
            logging.error(f"Error organizing tasks by Eisenhower quadrant: {str(e)}")
            raise
    
    def reconstruct_task_hierarchy(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Reconstruct the parent-child hierarchy for the output structure."""
        # Create lookup dictionary
        task_dict = {task["id"]: task.copy() for task in tasks}
        root_tasks = []
        
        try:
            logging.info("Reconstructing task hierarchy")
            
            # First, remove any existing sub_tasks arrays to start fresh
            for task_id, task in task_dict.items():
                if "sub_tasks" in task:
                    task["sub_tasks"] = []
            
            # Then build the hierarchy
            for task_id, task in task_dict.items():
                # If task has a parent and parent is in filtered tasks
                if task.get("parent_id") and task["parent_id"] in task_dict:
                    parent = task_dict[task["parent_id"]]
                    
                    # Add this task as subtask to parent
                    parent["sub_tasks"].append(task)
                
                # If task has no parent or parent not in filtered tasks, it's a root task
                elif not task.get("parent_id") or task["parent_id"] not in task_dict:
                    root_tasks.append(task)
            
            logging.info(f"Reconstructed hierarchy with {len(root_tasks)} root tasks")
            return root_tasks
        except Exception as e:
            logging.error(f"Error reconstructing task hierarchy: {str(e)}")
            raise
    
    def calculate_goal_area_distribution(self, tasks: List[Dict[str, Any]]) -> Dict[str, int]:
        """Calculate the distribution of tasks across goal areas."""
        distribution = {}
        
        for task in tasks:
            goal_areas = task.get("goal_areas", ["Uncategorized"])
            
            for area in goal_areas:
                if area not in distribution:
                    distribution[area] = 0
                distribution[area] += 1
        
        return distribution
    
    def calculate_eisenhower_distribution(self, tasks: List[Dict[str, Any]]) -> Dict[str, int]:
        """Calculate the distribution of tasks across Eisenhower quadrants."""
        distribution = {}
        
        for task in tasks:
            quadrant = task.get("eisenhower_quadrant", "Uncategorized")
            
            if quadrant not in distribution:
                distribution[quadrant] = 0
            distribution[quadrant] += 1
        
        return distribution
    
    def create_output_structure(self, filtered_tasks: List[Dict[str, Any]], all_tasks: List[Dict[str, Any]], original_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create the final output JSON structure."""
        try:
            logging.info("Creating output JSON structure")
            
            # Get original metadata
            original_metadata = original_data.get("metadata", {})
            
            # Calculate distributions
            goal_areas_distribution = self.calculate_goal_area_distribution(filtered_tasks)
            eisenhower_distribution = self.calculate_eisenhower_distribution(filtered_tasks)
            
            # Create new metadata
            metadata = {
                "filtering_date": datetime.now().strftime("%Y-%m-%d"),
                "filtering_criteria": "Life Goals: A Balanced Perspective",
                "original_export_date": original_metadata.get("export_date", "Unknown"),
                "total_tasks_before_filtering": len(all_tasks),
                "total_tasks_after_filtering": len(filtered_tasks),
                "filtering_ratio": round(len(filtered_tasks) / len(all_tasks) * 100, 2) if all_tasks else 0,
                "goal_areas_distribution": goal_areas_distribution,
                "eisenhower_distribution": eisenhower_distribution
            }
            
            # Organize tasks in different ways
            by_project = self.organize_tasks_by_project(filtered_tasks)
            by_goal_area = self.organize_tasks_by_goal_area(filtered_tasks)
            by_eisenhower = self.organize_tasks_by_eisenhower(filtered_tasks)
            
            # Create hierarchical view
            hierarchical_tasks = self.reconstruct_task_hierarchy(filtered_tasks)
            
            # Assemble output structure
            output = {
                "metadata": metadata,
                "views": {
                    "by_project": by_project,
                    "by_goal_area": by_goal_area,
                    "by_eisenhower": by_eisenhower
                },
                "hierarchical_tasks": hierarchical_tasks
            }
            
            logging.info("Output structure created successfully")
            return output
        except Exception as e:
            logging.error(f"Error creating output structure: {str(e)}")
            raise
    
    def write_output_to_file(self, output: Dict[str, Any], file_path: str) -> bool:
        """Write the output JSON to a file."""
        try:
            logging.info(f"Writing output to {file_path}")
            with open(file_path, 'w', encoding='utf-8') as file:
                json.dump(output, file, indent=2, ensure_ascii=False)
            logging.info("Output written successfully")
            return True
        except Exception as e:
            logging.error(f"Error writing output to file: {str(e)}")
            raise
    
    def process_todoist_export(self, input_file: str, output_file: str) -> bool:
        """Main function to process Todoist export JSON."""
        try:
            # Step 1: Load and validate JSON
            data = self.load_json_file(input_file)
            if not self.validate_json_structure(data):
                logging.error("JSON validation failed. Aborting.")
                return False
            
            # Step 2: Extract and preprocess tasks
            all_tasks = self.extract_all_tasks(data)
            preprocessed_tasks = self.preprocess_tasks(all_tasks)
            
            # Step 3: Filter tasks
            filtered_tasks = self.process_tasks_in_batches(preprocessed_tasks)
            
            # Step 4: Handle dependencies
            final_tasks = self.handle_task_dependencies(filtered_tasks, preprocessed_tasks)
            
            # Step 5: Create output structure
            output = self.create_output_structure(final_tasks, preprocessed_tasks, data)
            
            # Step 6: Write output to file
            self.write_output_to_file(output, output_file)
            
            logging.info("Processing completed successfully")
            return True
        except Exception as e:
            logging.error(f"Error in main processing function: {str(e)}")
            return False


def main():
    """Main entry point for the script."""
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Process Todoist export JSON based on life goals criteria")
    parser.add_argument("--input", required=True, help="Path to input Todoist export JSON file")
    parser.add_argument("--output", required=True, help="Path for output filtered JSON file")
    parser.add_argument("--api-key", required=True, help="Claude API key")
    
    args = parser.parse_args()
    
    # Initialize TaskFilter
    task_filter = TaskFilter(api_key=args.api_key)
    
    # Process the export
    success = task_filter.process_todoist_export(args.input, args.output)
    
    if success:
        print(f"Processing completed successfully. Output written to {args.output}")
        return 0
    else:
        print("Processing failed. Check logs for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
