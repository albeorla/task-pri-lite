import { EisenhowerPrioritizer } from "../eisenhower-prioritizer";
import {
  Task,
  TaskStatus,
  EisenhowerQuadrant,
} from "../../../core/models/task";

describe("EisenhowerPrioritizer", () => {
  // Mock console.log to prevent test output noise
  const originalConsoleLog = console.log;
  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  describe("without LLM service", () => {
    let prioritizer: EisenhowerPrioritizer;

    beforeEach(() => {
      prioritizer = new EisenhowerPrioritizer();
    });

    test("should skip prioritization for non-actionable tasks", async () => {
      // Setup
      const task = new Task({
        id: "1",
        description: "Test task",
        isActionable: false,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify
      expect(task.eisenhowerQuadrant).toBeNull();
    });

    test("should skip prioritization for completed tasks", async () => {
      // Setup
      const task = new Task({
        id: "1",
        description: "Test task",
        isActionable: true,
        status: TaskStatus.DONE,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify
      expect(task.eisenhowerQuadrant).toBeNull();
    });

    test("should mark task as urgent based on near-term due date", async () => {
      // Setup
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = new Task({
        id: "1",
        description: "Test task",
        isActionable: true,
        dueDate: tomorrow,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify - Should be "DO" or "DELEGATE" since it's urgent
      expect(
        task.eisenhowerQuadrant === EisenhowerQuadrant.DO ||
          task.eisenhowerQuadrant === EisenhowerQuadrant.DELEGATE,
      ).toBeTruthy();
    });

    test("should identify task as urgent based on keywords", async () => {
      // Setup
      const task = new Task({
        id: "1",
        description: "This is an urgent task",
        isActionable: true,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify - Should be "DO" or "DELEGATE" since it's urgent
      expect(
        task.eisenhowerQuadrant === EisenhowerQuadrant.DO ||
          task.eisenhowerQuadrant === EisenhowerQuadrant.DELEGATE,
      ).toBeTruthy();
    });

    test("should identify task as important based on keywords", async () => {
      // Setup
      const task = new Task({
        id: "1",
        description: "This is an important task",
        isActionable: true,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify - Should be "DO" or "DECIDE" since it's important
      expect(
        task.eisenhowerQuadrant === EisenhowerQuadrant.DO ||
          task.eisenhowerQuadrant === EisenhowerQuadrant.DECIDE,
      ).toBeTruthy();
    });

    test("should identify task as both urgent and important", async () => {
      // Setup
      const task = new Task({
        id: "1",
        description: "This is an urgent and important task",
        isActionable: true,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify
      expect(task.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO);
    });

    test("should identify task as neither urgent nor important", async () => {
      // Setup
      const task = new Task({
        id: "1",
        description: "Regular task with no urgency or importance keywords",
        isActionable: true,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify
      expect(task.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DELETE);
    });
  });

  describe("with LLM service", () => {
    let prioritizer: EisenhowerPrioritizer;
    const mockLLMService = {
      getEisenhowerAssessment: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      prioritizer = new EisenhowerPrioritizer(mockLLMService as any);
    });

    test("should use LLM assessment when available", async () => {
      // Setup
      mockLLMService.getEisenhowerAssessment.mockResolvedValue({
        urgent: true,
        important: true,
        rationale: "This is a critical and important task",
      });

      const task = new Task({
        id: "1",
        description: "Test task for LLM",
        isActionable: true,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify
      expect(mockLLMService.getEisenhowerAssessment).toHaveBeenCalledWith(
        task.description,
      );
      expect(task.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO);
    });

    test("should override LLM assessment for urgency when due date is near", async () => {
      // Setup
      mockLLMService.getEisenhowerAssessment.mockResolvedValue({
        urgent: false,
        important: true,
        rationale: "Important but not urgent",
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = new Task({
        id: "1",
        description: "Test task",
        isActionable: true,
        dueDate: tomorrow,
      });

      // Execute
      await prioritizer.prioritize(task);

      // Verify
      expect(task.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO); // Should now be DO (urgent & important)
    });
  });
});
