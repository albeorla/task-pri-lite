/**
 * Unit tests for schema validator
 */

import { loadSchema, validateData, validateFile } from "../schema-validator";
import * as fs from "fs";
import * as path from "path";
import { Validator } from "@cfworker/json-schema";

// Mock fs and path modules
jest.mock("fs");
jest.mock("path");

// Mock Validator
jest.mock("@cfworker/json-schema", () => ({
  Validator: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockImplementation((data) => {
      // Simple validation logic for testing
      if (data.name === "Test") {
        return { valid: true, errors: [] };
      } else {
        return {
          valid: false,
          errors: [{ instanceLocation: "/name", error: "Must be a string" }],
        };
      }
    }),
  })),
}));

describe("Schema Validator", () => {
  // Test data
  const validData = {
    name: "Test",
    value: 123,
  };

  const invalidData = {
    name: 123, // Should be a string
    value: 123,
  };

  const mockSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      value: { type: "number" },
    },
    required: ["name"],
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock path.join implementation
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    // Mock path.resolve implementation
    (path.resolve as jest.Mock).mockReturnValue("/schemas");

    // Mock fs.readFileSync for schema files
    (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
      if (filePath.includes("nonexistent")) {
        const error = new Error(
          "ENOENT: file not found",
        ) as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      } else if (filePath.includes("invalid")) {
        return "invalid json";
      } else {
        return JSON.stringify(mockSchema);
      }
    });
  });

  describe("loadSchema", () => {
    it("should load schema from file path", () => {
      const schemaName = "test.json";
      const result = loadSchema(schemaName);

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });

    it("should load schema from file path without .json extension", () => {
      const schemaName = "test";
      const result = loadSchema(schemaName);

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });

    it("should throw an error if schema file does not exist", () => {
      const schemaName = "nonexistent.json";

      expect(() => loadSchema(schemaName)).toThrow("Schema file not found");
    });

    it("should throw an error if schema file contains invalid JSON", () => {
      const schemaName = "invalid.json";

      expect(() => loadSchema(schemaName)).toThrow(expect.any(Error));
    });
  });

  describe("validateData", () => {
    it("should validate data against schema and return valid result", () => {
      const result = validateData(validData, "test.json");

      expect(Validator).toHaveBeenCalled();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate data against schema and return error for invalid data", () => {
      const result = validateData(invalidData, "test.json");

      expect(Validator).toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Must be a string");
    });

    it("should return error result if schema cannot be loaded", () => {
      const result = validateData(validData, "nonexistent.json");

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Schema validation failed");
    });
  });

  describe("validateFile", () => {
    beforeEach(() => {
      // Mock fs.readFileSync for file contents with a more specific implementation
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes("nonexistent")) {
          const error = new Error(
            "ENOENT: file not found",
          ) as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        } else if (filePath.includes("valid.json")) {
          return JSON.stringify(validData);
        } else if (filePath.includes("invalid.json")) {
          return JSON.stringify({ name: 123 }); // This is the invalid data
        } else if (filePath.includes("bad-json.json")) {
          return "invalid json";
        } else if (filePath.includes(".json")) {
          return JSON.stringify(mockSchema);
        } else {
          throw new Error("Unknown file");
        }
      });

      // Create a more specific mock for the Validator that responds based on the content
      (Validator as jest.Mock).mockImplementation(() => ({
        validate: jest.fn().mockImplementation((data) => {
          if (data && data.name === "Test") {
            return { valid: true, errors: [] };
          } else {
            return {
              valid: false,
              errors: [
                { instanceLocation: "/name", error: "Must be a string" },
              ],
            };
          }
        }),
      }));
    });

    it("should validate file content against schema and return valid result", () => {
      const result = validateFile("valid.json", "test.json");

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate file content against schema and return errors for invalid content", () => {
      // Override the validate mock for this specific test to return invalid result
      const mockValidateResult = {
        valid: false,
        errors: [{ instanceLocation: "/name", error: "Must be a string" }],
      };
      const mockValidate = jest.fn().mockReturnValue(mockValidateResult);

      // Override the Validator mock for this test
      (Validator as jest.Mock).mockImplementationOnce(() => ({
        validate: mockValidate,
      }));

      const result = validateFile("invalid.json", "test.json");

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should return error if file does not exist", () => {
      const result = validateFile("nonexistent.json", "test.json");

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("File not found");
    });

    it("should return error if file contains invalid JSON", () => {
      const result = validateFile("bad-json.json", "test.json");

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Error reading/parsing file");
    });
  });
});
