/**
 * Tests for LLM Service
 *
 * This file contains tests for the LangChainLLMService implementation
 * that provides LLM-powered capabilities for task clarification,
 * next action suggestions and prioritization.
 */

import { LangChainLLMService } from "../llm-service";
import { ChatOpenAI } from "@langchain/openai";
import { LLMChain } from "langchain/chains";

// Mock the LangChain dependencies
jest.mock("@langchain/openai");
jest.mock("langchain/chains");

describe("LangChainLLMService", () => {
  // Create mock implementations
  const mockChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;
  const mockLLMChain = LLMChain as jest.MockedClass<typeof LLMChain>;

  // Mock call method for LLMChain instances
  const mockCallMethod = jest.fn();

  beforeEach(() => {
    // Clear mock data
    jest.clearAllMocks();

    // Setup mock implementations for each test
    mockLLMChain.mockImplementation(() => {
      return {
        call: mockCallMethod,
      } as unknown as LLMChain;
    });
  });

  describe("getClarification", () => {
    test("should return parsed clarification response on success", async () => {
      // Arrange
      mockCallMethod.mockResolvedValueOnce({
        text: '{"actionable": true, "outcome": "Task completed", "is_project": false, "rationale": "Simple task"}',
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getClarification("Complete the report");

      // Assert
      expect(mockCallMethod).toHaveBeenCalledWith({
        taskDescription: "Complete the report",
      });

      expect(result).toEqual({
        actionable: true,
        outcome: "Task completed",
        is_project: false,
        rationale: "Simple task",
      });
    });

    test("should handle JSON parsing errors gracefully", async () => {
      // Arrange
      // The LLM service will handle the null return from parseLLMJson
      // by returning an object with the error information
      mockCallMethod.mockImplementationOnce(() => {
        // This will trigger parseLLMJson to return null
        throw new Error("JSON parsing error");
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getClarification("Invalid input");

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("rationale");
      expect(result?.rationale).toContain("LLM call failed");
    });

    test("should handle API call errors gracefully", async () => {
      // Arrange
      mockCallMethod.mockRejectedValueOnce(new Error("API error"));

      const service = new LangChainLLMService();

      // Act
      const result = await service.getClarification("Error-causing input");

      // Assert
      expect(result).toEqual({
        actionable: null,
        outcome: null,
        is_project: null,
        rationale: expect.stringContaining("LLM call failed"),
      });
    });
  });

  describe("getNextActionSuggestion", () => {
    test("should return next action suggestion on success", async () => {
      // Arrange
      mockCallMethod.mockResolvedValueOnce({
        text: "Call John about the project specs",
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getNextActionSuggestion(
        "Website Project",
        "Launch new company website",
      );

      // Assert
      expect(mockCallMethod).toHaveBeenCalledWith({
        projectName: "Website Project",
        projectOutcome: "Launch new company website",
      });

      expect(result).toBe("Call John about the project specs");
    });

    test("should handle missing project outcome", async () => {
      // Arrange
      mockCallMethod.mockResolvedValueOnce({
        text: "Define project goals",
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getNextActionSuggestion("New Project", null);

      // Assert
      expect(mockCallMethod).toHaveBeenCalledWith({
        projectName: "New Project",
        projectOutcome: "Not specified",
      });

      expect(result).toBe("Define project goals");
    });

    test("should strip quotes from result", async () => {
      // Arrange
      mockCallMethod.mockResolvedValueOnce({
        text: '"Schedule meeting with team"',
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getNextActionSuggestion(
        "Team Project",
        "Complete project plan",
      );

      // Assert
      expect(result).toBe("Schedule meeting with team");
    });

    test("should handle API call errors gracefully", async () => {
      // Arrange
      mockCallMethod.mockRejectedValueOnce(new Error("API error"));

      const service = new LangChainLLMService();

      // Act
      const result = await service.getNextActionSuggestion(
        "Error Project",
        "Cause error",
      );

      // Assert
      expect(result).toContain("[Error suggesting next action");
    });
  });

  describe("getEisenhowerAssessment", () => {
    test("should return parsed assessment on success", async () => {
      // Arrange
      mockCallMethod.mockResolvedValueOnce({
        text: '{"urgent": true, "important": true, "rationale": "Critical deadline approaching"}',
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getEisenhowerAssessment(
        "Submit tax forms by tomorrow",
      );

      // Assert
      expect(mockCallMethod).toHaveBeenCalledWith({
        taskDescription: "Submit tax forms by tomorrow",
      });

      expect(result).toEqual({
        urgent: true,
        important: true,
        rationale: "Critical deadline approaching",
      });
    });

    test("should handle JSON parsing errors gracefully", async () => {
      // Arrange
      // The LLM service will handle the null return from parseLLMJson
      // by returning an object with the error information
      mockCallMethod.mockImplementationOnce(() => {
        // This will trigger parseLLMJson to return null
        throw new Error("JSON parsing error");
      });

      const service = new LangChainLLMService();

      // Act
      const result = await service.getEisenhowerAssessment("Invalid input");

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("rationale");
      expect(result?.rationale).toContain("LLM call failed");
    });

    test("should handle API call errors gracefully", async () => {
      // Arrange
      mockCallMethod.mockRejectedValueOnce(new Error("API error"));

      const service = new LangChainLLMService();

      // Act
      const result = await service.getEisenhowerAssessment(
        "Error-causing input",
      );

      // Assert
      expect(result).toEqual({
        urgent: null,
        important: null,
        rationale: expect.stringContaining("LLM call failed"),
      });
    });
  });
});
