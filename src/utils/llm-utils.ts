import { PromptTemplate } from '@langchain/core/prompts';

// Prompt templates that mirror the Python implementation
export const clarifyPromptTemplate = new PromptTemplate({
  inputVariables: ['taskDescription'],
  template: `
You are a helpful productivity assistant applying the 'Getting Things Done' (GTD) methodology.
Analyze the following input captured by the user: '{taskDescription}'

Based ONLY on the provided description, perform the following steps:
1.  **Actionable?**: Determine if this represents a specific action the user needs to take, or if it's reference material, a vague goal, or something else.
2.  **Outcome?**: If it IS actionable or a goal, what is the desired successful outcome? Be specific. If not actionable, state "N/A".
3.  **Project?**: Does achieving the outcome CLEARLY require multiple distinct action steps? Answer Yes or No.
4.  **Rationale**: Briefly explain your reasoning for the above classifications.

**Output Format:** Respond ONLY with a valid JSON object containing the keys "actionable" (boolean), "outcome" (string, or null if not actionable), "is_project" (boolean, or null if not actionable), and "rationale" (string). Ensure the JSON is strictly valid.

**Now analyze this input:**
Task Description: '{taskDescription}'

**Your JSON Output:**
`,
});

export const nextActionPromptTemplate = new PromptTemplate({
  inputVariables: ['projectName', 'projectOutcome'],
  template: `
You are a helpful productivity assistant applying the 'Getting Things Done' (GTD) methodology.
The user is working on a project with the following desired outcome: '{projectOutcome}'
The project is currently named: '{projectName}'

Based on this project goal, suggest the **single, very next physical, visible action** the user should take to move this project forward.
The action should be concrete and start with an action verb (e.g., 'Call', 'Email', 'Draft', 'Read', 'Buy', 'Schedule', 'Discuss'). Avoid vague actions like 'Work on X' or 'Think about Y'. The suggestion should be concise.

**Now, for the project:**
Project Name: '{projectName}'
Desired Outcome: '{projectOutcome}'

**Suggest the very next physical action (Respond with ONLY the action phrase):**
`,
});

export const eisenhowerPromptTemplate = new PromptTemplate({
  inputVariables: ['taskDescription'],
  template: `
You are a helpful productivity assistant applying the Eisenhower Matrix (Urgent/Important) for prioritization.
Analyze the following task: '{taskDescription}'

Consider these definitions:
* **Urgent:** Requires immediate attention, typically within the next 24-48 hours. Often has near-term deadlines or consequences if not addressed quickly. Driven by external factors or time sensitivity.
* **Important:** Contributes directly to significant long-term goals, values, or mission-critical outcomes. Failure to do it would have significant negative consequences eventually. Driven by internal goals and values.

Based ONLY on the task description and these definitions, assess its urgency and importance.

**Output Format:** Respond ONLY with a valid JSON object containing the keys "urgent" (boolean), "important" (boolean), and "rationale" (string briefly explaining your U/I assessment based on the definitions). Ensure the JSON is strictly valid.

**Now analyze this task:**
Task Description: '{taskDescription}'

**Your JSON Output:**
`,
});

// Helper function to parse LLM response JSON
export function parseLLMJson<T>(response: string, context: string): T | null {
  try {
    // Remove potential markdown code fences
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.substring(7, cleanedResponse.length - 3).trim();
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.substring(3, cleanedResponse.length - 3).trim();
    }
    
    return JSON.parse(cleanedResponse) as T;
  } catch (error) {
    console.error(`Failed to parse JSON response for ${context}:`, error);
    console.error('Raw response was:', response);
    return null;
  }
}

// Helper type definitions for the expected LLM responses
export interface ClarificationResponse {
  actionable: boolean | null;
  outcome: string | null;
  is_project: boolean | null;
  rationale: string;
}

export interface EisenhowerResponse {
  urgent: boolean | null;
  important: boolean | null;
  rationale: string;
} 