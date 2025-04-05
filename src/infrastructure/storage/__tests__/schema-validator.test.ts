/**
 * Unit tests for Schema Validator
 */

import * as fs from 'fs';
import { validateData, validateFile, loadSchema } from '../schema-validator';
import { Validator } from '@cfworker/json-schema';

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

// Mock @cfworker/json-schema
jest.mock('@cfworker/json-schema', () => ({
  Validator: jest.fn().mockImplementation(() => ({
    validate: jest.fn()
  }))
}));

describe('Schema Validator', () => {
  // Mock schema data
  const mockSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      test: { type: 'string' }
    }
  };

  // Valid and invalid data for testing
  const validData = { test: 'valid string' };
  const invalidData = { test: 123 };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock implementation for fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSchema));
    
    // Mock the Validator implementation
    const mockValidate = jest.fn().mockImplementation((data) => {
      if (data.test === 'valid string') {
        return { valid: true, errors: [] };
      } else {
        return { valid: false, errors: [{ instanceLocation: '/test', error: 'Must be a string' }] };
      }
    });
    
    (Validator as jest.Mock).mockImplementation(() => ({
      validate: mockValidate
    }));
  });

  describe('loadSchema', () => {
    it('should load schema from file path with .json extension', () => {
      const schemaName = 'test.json';
      const result = loadSchema(schemaName);
      
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });

    it('should load schema from file path without .json extension', () => {
      const schemaName = 'test';
      const result = loadSchema(schemaName);
      
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });

    it('should throw an error if schema file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      const schemaName = 'nonexistent.json';
      
      expect(() => loadSchema(schemaName)).toThrow('Schema file not found');
    });

    it('should throw an error if schema file contains invalid JSON', () => {
      (fs.readFileSync as jest.Mock).mockReturnValueOnce('invalid json');
      const schemaName = 'invalid.json';
      
      expect(() => loadSchema(schemaName)).toThrow(expect.any(Error));
    });
  });

  describe('validateData', () => {
    it('should validate data against schema and return valid result', () => {
      const result = validateData(validData, 'test.json');
      
      expect(Validator).toHaveBeenCalled();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate data against schema and return error for invalid data', () => {
      const result = validateData(invalidData, 'test.json');
      
      expect(Validator).toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Must be a string');
    });

    it('should return error result if schema cannot be loaded', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      const result = validateData(validData, 'nonexistent.json');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Schema validation failed');
    });
  });

  describe('validateFile', () => {
    beforeEach(() => {
      // Mock implementation for fs.readFileSync for file contents
      (fs.readFileSync as jest.Mock).mockImplementation((path) => {
        if (path.includes('valid')) {
          return JSON.stringify(validData);
        } else if (path.includes('invalid')) {
          return JSON.stringify(invalidData);
        } else if (path.includes('schema')) {
          return JSON.stringify(mockSchema);
        } else {
          throw new Error('File not found');
        }
      });
    });

    it('should validate file content against schema and return valid result', () => {
      const result = validateFile('valid.json', 'test.json');
      
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate file content against schema and return errors for invalid content', () => {
      const result = validateFile('invalid.json', 'test.json');
      
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should return error if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      const result = validateFile('nonexistent.json', 'test.json');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('File not found');
    });

    it('should return error if file contains invalid JSON', () => {
      (fs.readFileSync as jest.Mock).mockReturnValueOnce('invalid json');
      const result = validateFile('bad-json.json', 'test.json');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error reading/parsing file');
    });
  });
}); 