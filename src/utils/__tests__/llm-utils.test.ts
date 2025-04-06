/**
 * Tests for LLM Utilities
 *
 * This file contains tests for the LLM utility functions and templates.
 */

import {
  parseLLMJson,
  ClarificationResponse,
  EisenhowerResponse,
  clarifyPromptTemplate,
  nextActionPromptTemplate,
  eisenhowerPromptTemplate,
} from "../llm-utils";

describe("LLM Prompt Templates", () => {
  test("clarifyPromptTemplate should have correct input variables", () => {
    expect(clarifyPromptTemplate.inputVariables).toEqual(["taskDescription"]);
  });

  test("nextActionPromptTemplate should have correct input variables", () => {
    expect(nextActionPromptTemplate.inputVariables).toEqual([
      "projectName",
      "projectOutcome",
    ]);
  });

  test("eisenhowerPromptTemplate should have correct input variables", () => {
    expect(eisenhowerPromptTemplate.inputVariables).toEqual([
      "taskDescription",
    ]);
  });
});

describe("parseLLMJson", () => {
  test("should parse valid JSON response", () => {
    // Arrange
    const validJson =
      '{"actionable": true, "outcome": "Completed task", "is_project": false, "rationale": "Simple task"}';

    // Act
    const result = parseLLMJson<ClarificationResponse>(validJson, "test");

    // Assert
    expect(result).toEqual({
      actionable: true,
      outcome: "Completed task",
      is_project: false,
      rationale: "Simple task",
    });
  });

  test("should parse JSON with code fences (```json)", () => {
    // Arrange
    const jsonWithFences =
      '```json\n{"urgent": true, "important": true, "rationale": "Critical task"}\n```';

    // Act
    const result = parseLLMJson<EisenhowerResponse>(jsonWithFences, "test");

    // Assert
    expect(result).toEqual({
      urgent: true,
      important: true,
      rationale: "Critical task",
    });
  });

  test("should parse JSON with generic code fences (```)", () => {
    // Arrange
    const jsonWithGenericFences =
      '```\n{"actionable": false, "outcome": null, "is_project": null, "rationale": "Not a task"}\n```';

    // Act
    const result = parseLLMJson<ClarificationResponse>(
      jsonWithGenericFences,
      "test",
    );

    // Assert
    expect(result).toEqual({
      actionable: false,
      outcome: null,
      is_project: null,
      rationale: "Not a task",
    });
  });

  test("should return null for invalid JSON", () => {
    // Arrange
    const invalidJson = '{"actionable": true, "outcome": "Broken JSON';

    // Act
    const result = parseLLMJson<ClarificationResponse>(invalidJson, "test");

    // Assert
    expect(result).toBeNull();
  });

  test("should return null for non-JSON string", () => {
    // Arrange
    const nonJson = "This is just a regular string, not JSON";

    // Act
    const result = parseLLMJson<ClarificationResponse>(nonJson, "test");

    // Assert
    expect(result).toBeNull();
  });
});
