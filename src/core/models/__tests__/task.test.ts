/**
 * Tests for the Task model
 */

import { Task, TaskStatus, EisenhowerQuadrant } from "../task";
import { Project } from "../project";

describe("Task Model", () => {
  describe("Constructor and Properties", () => {
    test("should create a task with minimal properties", () => {
      const task = new Task({ description: "Test task" });

      expect(task.id).toBeDefined();
      expect(task.description).toBe("Test task");
      expect(task.notes).toBeNull();
      expect(task.status).toBe(TaskStatus.INBOX);
      expect(task.project).toBeNull();
      expect(task.context).toBeNull();
      expect(task.dueDate).toBeNull();
      expect(task.nextActionFor).toEqual([]);
      expect(task.eisenhowerQuadrant).toBeNull();
      expect(task.isActionable).toBeNull();
      expect(task.creationDate).toBeInstanceOf(Date);
    });

    test("should create a task with all properties", () => {
      const project = new Project({ name: "Test Project" });
      const date = new Date("2023-04-01");
      const task = new Task({
        id: "test-id",
        description: "Complete task",
        sourceId: "external-id",
        dueDate: date,
        notes: "Some notes",
        status: TaskStatus.NEXT_ACTION,
        project: project,
        context: "@work",
        eisenhowerQuadrant: EisenhowerQuadrant.DO,
        isActionable: true,
        creationDate: date,
      });

      expect(task.id).toBe("test-id");
      expect(task.description).toBe("Complete task");
      expect(task.notes).toBe("Some notes");
      expect(task.status).toBe(TaskStatus.NEXT_ACTION);
      expect(task.project).toBe(project);
      expect(task.context).toBe("@work");
      expect(task.dueDate).toBe(date);
      expect(task.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO);
      expect(task.isActionable).toBe(true);
      expect(task.creationDate).toBe(date);
    });
  });

  describe("toString Method", () => {
    test("should return formatted string representation", () => {
      const project = new Project({ name: "Test Project" });
      const date = new Date("2023-04-01");
      const task = new Task({
        id: "test-id",
        description: "Complete task",
        dueDate: date,
        project: project,
        context: "@work",
        eisenhowerQuadrant: EisenhowerQuadrant.DO,
      });

      const result = task.toString();

      expect(result).toContain("test-id");
      expect(result).toContain("Complete task");
      expect(result).toContain("Test Project");
      expect(result).toContain("@work");
      expect(result).toContain(EisenhowerQuadrant.DO);
      expect(result).toContain("2023-04-01");
    });

    test("should handle missing optional properties in toString", () => {
      const task = new Task({
        description: "Simple task",
      });

      const result = task.toString();

      expect(result).toContain("Simple task");
      expect(result).toContain("Status: Inbox");
      expect(result).toContain("Eisenhower: N/A");
      expect(result).not.toContain("Project:");
      expect(result).not.toContain("Context:");
      expect(result).not.toContain("Due:");
    });
  });

  describe("Serialization and Deserialization", () => {
    test("should serialize to JSON correctly", () => {
      const project = new Project({ name: "Test Project", id: "proj-1" });
      const date = new Date("2023-04-01T12:00:00.000Z");
      const task = new Task({
        id: "task-1",
        description: "Test serialization",
        dueDate: date,
        notes: "Test notes",
        status: TaskStatus.NEXT_ACTION,
        project: project,
        context: "@home",
        eisenhowerQuadrant: EisenhowerQuadrant.DO,
        isActionable: true,
        creationDate: date,
      });

      const json = task.toJSON();

      expect(json.id).toBe("task-1");
      expect(json.description).toBe("Test serialization");
      expect(json.notes).toBe("Test notes");
      expect(json.status).toBe(TaskStatus.NEXT_ACTION);
      expect(json.project).toBe("proj-1");
      expect(json.context).toBe("@home");
      expect(json.dueDate).toBe(date.toISOString());
      expect(json.nextActionFor).toEqual([]);
      expect(json.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO);
      expect(json.isActionable).toBe(true);
      expect(json.creationDate).toBe(date.toISOString());
    });

    test("should deserialize from JSON correctly", () => {
      const project = new Project({ id: "proj-1", name: "Test Project" });
      const projectsMap = new Map<string, Project>();
      projectsMap.set("proj-1", project);

      const json = {
        id: "task-1",
        description: "Test deserialization",
        notes: "Test notes",
        status: TaskStatus.NEXT_ACTION,
        project: "proj-1",
        context: "@home",
        dueDate: "2023-04-01T12:00:00.000Z",
        nextActionFor: [],
        eisenhowerQuadrant: EisenhowerQuadrant.DO,
        isActionable: true,
        creationDate: "2023-04-01T12:00:00.000Z",
      };

      const task = Task.fromJSON(json, projectsMap);

      expect(task.id).toBe("task-1");
      expect(task.description).toBe("Test deserialization");
      expect(task.notes).toBe("Test notes");
      expect(task.status).toBe(TaskStatus.NEXT_ACTION);
      expect(task.project).toBe(project);
      expect(task.context).toBe("@home");
      expect(task.dueDate?.toISOString()).toBe("2023-04-01T12:00:00.000Z");
      expect(task.nextActionFor).toEqual([]);
      expect(task.eisenhowerQuadrant).toBe(EisenhowerQuadrant.DO);
      expect(task.isActionable).toBe(true);
      expect(task.creationDate.toISOString()).toBe("2023-04-01T12:00:00.000Z");
    });

    test("should handle null values when deserializing", () => {
      const json = {
        id: "task-1",
        description: "Minimal task",
        status: TaskStatus.INBOX,
        creationDate: "2023-04-01T12:00:00.000Z",
      };

      const task = Task.fromJSON(json);

      expect(task.id).toBe("task-1");
      expect(task.description).toBe("Minimal task");
      expect(task.notes).toBeNull();
      expect(task.status).toBe(TaskStatus.INBOX);
      expect(task.project).toBeNull();
      expect(task.context).toBeNull();
      expect(task.dueDate).toBeNull();
      expect(task.nextActionFor).toEqual([]);
      expect(task.eisenhowerQuadrant).toBeNull();
      expect(task.isActionable).toBeNull();
    });
  });

  describe("Project Associations", () => {
    test("should associate task with a project", () => {
      const project = new Project({ name: "Test Project" });
      const task = new Task({
        description: "Project task",
        project: project,
      });

      expect(task.project).toBe(project);
    });

    test("should handle nextActionFor relationships", () => {
      const project1 = new Project({ id: "p1", name: "Project 1" });
      const project2 = new Project({ id: "p2", name: "Project 2" });
      const projectsMap = new Map<string, Project>();
      projectsMap.set("p1", project1);
      projectsMap.set("p2", project2);

      const json = {
        id: "task-1",
        description: "Next action",
        status: TaskStatus.NEXT_ACTION,
        nextActionFor: ["p1", "p2"],
        creationDate: "2023-04-01T12:00:00.000Z",
      };

      const task = Task.fromJSON(json, projectsMap);

      expect(task.nextActionFor).toHaveLength(2);
      expect(task.nextActionFor).toContain(project1);
      expect(task.nextActionFor).toContain(project2);
    });

    test("should handle missing projects in nextActionFor", () => {
      const project1 = new Project({ id: "p1", name: "Project 1" });
      const projectsMap = new Map<string, Project>();
      projectsMap.set("p1", project1);

      const json = {
        id: "task-1",
        description: "Next action",
        status: TaskStatus.NEXT_ACTION,
        nextActionFor: ["p1", "p2"], // p2 doesn't exist in the map
        creationDate: "2023-04-01T12:00:00.000Z",
      };

      const task = Task.fromJSON(json, projectsMap);

      expect(task.nextActionFor).toHaveLength(1);
      expect(task.nextActionFor).toContain(project1);
    });
  });

  describe("Enum-based Functionality", () => {
    test("should handle all TaskStatus values", () => {
      // Create a task for each status value
      const statusValues = Object.values(TaskStatus);
      const tasks = statusValues.map(
        (status) =>
          new Task({ description: `Task with status ${status}`, status }),
      );

      // Verify each task has the correct status
      tasks.forEach((task, index) => {
        expect(task.status).toBe(statusValues[index]);
      });
    });

    test("should handle all EisenhowerQuadrant values", () => {
      // Create a task for each Eisenhower quadrant
      const quadrantValues = Object.values(EisenhowerQuadrant);
      const tasks = quadrantValues.map(
        (quadrant) =>
          new Task({
            description: `Task in quadrant ${quadrant}`,
            eisenhowerQuadrant: quadrant,
          }),
      );

      // Verify each task has the correct quadrant
      tasks.forEach((task, index) => {
        expect(task.eisenhowerQuadrant).toBe(quadrantValues[index]);
      });
    });
  });
});
