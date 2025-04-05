/**
 * Schema validation utilities for JSON data.
 */

import { Validator, ValidationError } from '@cfworker/json-schema';
import * as fs from 'fs';
import * as path from 'path';

// Base paths for schema files
const SCHEMA_DIR = path.resolve(__dirname, '../../../exporters/schemas');

/**
 * Load a JSON schema file from the schemas directory.
 * 
 * @param schemaName - Name of the schema file (with or without .json extension)
 * @returns The schema definition object
 * @throws Error if the schema file doesn't exist or contains invalid JSON
 */
export function loadSchema(schemaName: string): Record<string, any> {
  const fileName = schemaName.endsWith('.json') ? schemaName : `${schemaName}.json`;
  const schemaPath = path.join(SCHEMA_DIR, fileName);
  
  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    throw new Error(`Error loading schema ${schemaName}: ${(err as Error).message}`);
  }
}

/**
 * Validate data against a JSON schema.
 * 
 * @param data - The data to validate
 * @param schemaName - Name of the schema file (with or without .json extension)
 * @returns Object with validation result
 */
export function validateData(data: unknown, schemaName: string): { 
  valid: boolean; 
  errors: string[] 
} {
  try {
    const schema = loadSchema(schemaName);
    const validator = new Validator(schema);
    const result = validator.validate(data);
    
    if (result.valid) {
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: result.errors.map(error => {
        return `${error.instanceLocation}: ${error.error}`;
      })
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Schema validation failed: ${(err as Error).message}`]
    };
  }
}

/**
 * Validate a JSON file against a JSON schema.
 * 
 * @param filePath - Path to the JSON file to validate
 * @param schemaName - Name of the schema file (with or without .json extension)
 * @returns Object with validation result
 */
export function validateFile(filePath: string, schemaName: string): { 
  valid: boolean; 
  errors: string[] 
} {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return validateData(data, schemaName);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { valid: false, errors: [`File not found: ${filePath}`] };
    }
    
    return { 
      valid: false, 
      errors: [`Error reading/parsing file ${filePath}: ${(err as Error).message}`] 
    };
  }
} 