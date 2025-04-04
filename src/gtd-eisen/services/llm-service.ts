import { ChatOpenAI } from '@langchain/openai';
import { LLMChain } from '@langchain/core/chains';
import { llmConfig } from '../../config/llm-config';
import {
  clarifyPromptTemplate,
  nextActionPromptTemplate,
  eisenhowerPromptTemplate,
  parseLLMJson,
  ClarificationResponse,
  EisenhowerResponse
} from '../../utils/llm-utils';

export interface LLMService {
  getClarification(taskDescription: string): Promise<ClarificationResponse | null>;
  getNextActionSuggestion(projectName: string, projectOutcome: string | null): Promise<string>;
  getEisenhowerAssessment(taskDescription: string): Promise<EisenhowerResponse | null>;
}

export class LangChainLLMService implements LLMService {
  private llm: ChatOpenAI;
  private clarifyChain: LLMChain;
  private nextActionChain: LLMChain;
  private eisenhowerChain: LLMChain;

  constructor() {
    // Initialize the ChatOpenAI model
    this.llm = new ChatOpenAI({
      modelName: llmConfig.modelName,
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
      openAIApiKey: llmConfig.apiKey,
    });

    // Initialize LLMChains
    this.clarifyChain = new LLMChain({
      llm: this.llm,
      prompt: clarifyPromptTemplate,
    });

    this.nextActionChain = new LLMChain({
      llm: this.llm,
      prompt: nextActionPromptTemplate,
    });

    this.eisenhowerChain = new LLMChain({
      llm: this.llm,
      prompt: eisenhowerPromptTemplate,
    });
  }

  async getClarification(taskDescription: string): Promise<ClarificationResponse | null> {
    console.log(`[LLM Service] Getting clarification for: '${taskDescription}'`);
    
    try {
      const response = await this.clarifyChain.call({
        taskDescription,
      });
      
      const responseText = response.text as string;
      console.log(`[LLM Service] Raw Clarification: ${responseText}`);
      
      return parseLLMJson<ClarificationResponse>(responseText, 'clarification');
    } catch (error) {
      console.error('[LLM Service - Error] LangChain clarification call failed:', error);
      return {
        actionable: null,
        outcome: null,
        is_project: null,
        rationale: `LLM call failed: ${error}`,
      };
    }
  }

  async getNextActionSuggestion(projectName: string, projectOutcome: string | null): Promise<string> {
    console.log(`[LLM Service] Getting next action for: Project '${projectName}'`);
    
    try {
      const response = await this.nextActionChain.call({
        projectName,
        projectOutcome: projectOutcome || 'Not specified', // Handle missing outcome
      });
      
      let suggestion = (response.text as string).trim();
      // Remove potential quotes around the suggestion
      suggestion = suggestion.replace(/^["'`]|["'`]$/g, '');
      
      console.log(`[LLM Service] Suggested NA: ${suggestion}`);
      return suggestion;
    } catch (error) {
      console.error('[LLM Service - Error] LangChain next action call failed:', error);
      return `[Error suggesting next action: ${error}]`;
    }
  }

  async getEisenhowerAssessment(taskDescription: string): Promise<EisenhowerResponse | null> {
    console.log(`[LLM Service] Getting Eisenhower assessment for: '${taskDescription}'`);
    
    try {
      const response = await this.eisenhowerChain.call({
        taskDescription,
      });
      
      const responseText = response.text as string;
      console.log(`[LLM Service] Raw Eisenhower: ${responseText}`);
      
      return parseLLMJson<EisenhowerResponse>(responseText, 'eisenhower');
    } catch (error) {
      console.error('[LLM Service - Error] LangChain Eisenhower call failed:', error);
      return {
        urgent: null,
        important: null,
        rationale: `LLM call failed: ${error}`,
      };
    }
  }
} 