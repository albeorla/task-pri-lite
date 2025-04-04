import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Define environment schema
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_TEMPERATURE: z.string().default('0.2'),
  OPENAI_MAX_TOKENS: z.string().default('1024'),
});

// Parse and validate environment variables
export const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE || '0.2',
  OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS || '1024',
});

// LLM configuration
export const llmConfig = {
  modelName: env.OPENAI_MODEL,
  temperature: parseFloat(env.OPENAI_TEMPERATURE),
  maxTokens: parseInt(env.OPENAI_MAX_TOKENS, 10),
  apiKey: env.OPENAI_API_KEY,
}; 