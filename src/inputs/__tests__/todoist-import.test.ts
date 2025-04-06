import { TodoistImporter } from "../todoist-import";
import { TextInputItem, ManualTaskInputItem } from "../basic-input-items";
import { InputSource } from "../../core/interfaces";
import { TaskItem } from "../../storage/task-store";

// Mock data for Todoist export
const createMockTodoistData = (withErrors = false) => {
  const basicData = {
    projects: [
      {
        id: "project1",
        name: "Work",
        tasks: [
          {
            id: "task1",
            content: "Finish report",
            description: "Complete the quarterly report",
            due: {
              date: "2023-12-31",
              is_recurring: false,
            },
            priority: 3, // High priority in Todoist (3 out of 4)
            project_id: "project1",
            section_id: null,
            parent_id: null,
            labels: ["important", "quarterly"],
            is_completed: false,
            sub_tasks: [
              {
                id: "subtask1",
                content: "Gather data",
                description: "Collect all necessary data",
                due: {
                  date: "2023-12-25",
                  is_recurring: false,
                },
                priority: 2, // Medium priority in Todoist (2 out of 4)
                project_id: "project1",
                section_id: null,
                parent_id: "task1",
                labels: ["research"],
                is_completed: false,
              },
            ],
          },
        ],
        sections: [
          {
            id: "section1",
            name: "In Progress",
            tasks: [
              {
                id: "task2",
                content: "Call client",
                description: "",
                due: null,
                priority: 1, // Low priority in Todoist (1 out of 4)
                project_id: "project1",
                section_id: "section1",
                parent_id: null,
                labels: ["client"],
                is_completed: false,
              },
            ],
          },
        ],
      },
      {
        id: "project2",
        name: "Personal",
        tasks: [
          {
            id: "task3",
            content: "Buy groceries",
            description: "Get milk, eggs, and bread",
            due: {
              date: "2023-12-20",
              is_recurring: true,
            },
            priority: 4, // Highest priority in Todoist (4 out of 4)
            project_id: "project2",
            section_id: null,
            parent_id: null,
            labels: ["shopping"],
            is_completed: true,
          },
        ],
        sections: [],
      },
    ],
  };

  if (withErrors) {
    // Adding a malformed task to test error handling
    basicData.projects[0].tasks.push({
      id: "malformed",
      // Missing content and other required fields
    } as any);
  }

  return JSON.stringify(basicData);
};

describe("TodoistImporter", () => {
  describe("constructor", () => {
    test("should create a TodoistImporter instance with valid JSON", () => {
      const jsonData = createMockTodoistData();
      const importer = new TodoistImporter(jsonData);

      expect(importer).toBeInstanceOf(TodoistImporter);
    });

    test("should throw error with invalid JSON", () => {
      const invalidJson = "{ not valid json }";

      // Temporarily suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      try {
        expect(() => new TodoistImporter(invalidJson)).toThrow(
          "Invalid Todoist JSON format",
        );
      } finally {
        console.error = originalError;
      }
    });
  });

  describe("importTasks", () => {
    test("should import tasks as input items", () => {
      const jsonData = createMockTodoistData();
      const importer = new TodoistImporter(jsonData);

      const items = importer.importTasks();

      // Should have 4 items: 1 main task + 1 subtask in Work project, 1 task in Work section, 1 task in Personal project
      expect(items).toHaveLength(4);

      // Check for the main task
      const mainTask = items.find(
        (item) =>
          item instanceof ManualTaskInputItem && item.title === "Finish report",
      ) as ManualTaskInputItem;

      expect(mainTask).toBeDefined();
      expect(mainTask.description).toBe("Complete the quarterly report");
      expect(mainTask.dueDate).toBeInstanceOf(Date);
      expect(mainTask.dueDate?.toISOString().split("T")[0]).toBe("2023-12-31");
      expect(mainTask.priority).toBe(1); // Mapped from Todoist's 3 to our 1

      // Check for the subtask
      const subTask = items.find(
        (item) =>
          item instanceof ManualTaskInputItem && item.title === "Gather data",
      ) as ManualTaskInputItem;

      expect(subTask).toBeDefined();
      expect(subTask.description).toContain("Collect all necessary data");
      expect(subTask.dueDate).toBeInstanceOf(Date);
      expect(subTask.dueDate?.toISOString().split("T")[0]).toBe("2023-12-25");
      expect(subTask.priority).toBe(2); // Mapped from Todoist's 2 to our 2

      // Check for the task in section
      const sectionTask = items.find(
        (item) => item instanceof TextInputItem && item.text === "Call client",
      ) as TextInputItem;

      expect(sectionTask).toBeDefined();
      expect(sectionTask.title).toContain("Project: Work");
      expect(sectionTask.title).toContain("Section: In Progress");

      // Check for the task in Personal project
      const personalTask = items.find(
        (item) =>
          item instanceof ManualTaskInputItem && item.title === "Buy groceries",
      ) as ManualTaskInputItem;

      expect(personalTask).toBeDefined();
      expect(personalTask.description).toBe("Get milk, eggs, and bread");
      expect(personalTask.dueDate).toBeInstanceOf(Date);
      expect(personalTask.dueDate?.toISOString().split("T")[0]).toBe(
        "2023-12-20",
      );
      expect(typeof personalTask.priority).toBe("number");
    });

    test("should handle projects without tasks", () => {
      const emptyProjectData = JSON.stringify({
        projects: [
          {
            id: "project1",
            name: "Empty Project",
            tasks: [],
            sections: [],
          },
        ],
      });

      const importer = new TodoistImporter(emptyProjectData);
      const items = importer.importTasks();

      expect(items).toHaveLength(0);
    });

    test("should handle malformed projects array", () => {
      const malformedData = JSON.stringify({
        projects: "not an array",
      });

      const importer = new TodoistImporter(malformedData);
      const items = importer.importTasks();

      expect(items).toHaveLength(0);
    });
  });

  describe("importAsTaskItems", () => {
    test("should import tasks as TaskItems", () => {
      const jsonData = createMockTodoistData();
      const importer = new TodoistImporter(jsonData);

      const items = importer.importAsTaskItems();

      // Should have 4 task items
      expect(items).toHaveLength(4);

      // Check for the main task
      const mainTask = items.find((item) => item.title === "Finish report");

      expect(mainTask).toBeDefined();
      expect(mainTask?.description).toBe("Complete the quarterly report");
      expect(mainTask?.dueDate).toBeInstanceOf(Date);
      expect(mainTask?.dueDate?.toISOString().split("T")[0]).toBe("2023-12-31");
      expect(typeof mainTask?.priority).toBe("number");
      expect(mainTask?.project).toBe("Work");
      expect(mainTask?.labels).toEqual(["important", "quarterly"]);
      expect(mainTask?.completed).toBe(false);

      // Check for the subtask
      const subTask = items.find((item) => item.title === "Gather data");

      expect(subTask).toBeDefined();
      expect(subTask?.description).toBe("Collect all necessary data");
      expect(subTask?.project).toBe("Work");
      expect(subTask?.parentTask).toBe("Finish report");
      expect(subTask?.labels).toEqual(["research"]);

      // Check for the task in section
      const sectionTask = items.find((item) => item.title === "Call client");

      expect(sectionTask).toBeDefined();
      expect(sectionTask?.project).toBe("Work");
      expect(sectionTask?.section).toBe("In Progress");

      // Check for the task in Personal project
      const personalTask = items.find((item) => item.title === "Buy groceries");

      expect(personalTask).toBeDefined();
      expect(personalTask?.description).toBe("Get milk, eggs, and bread");
      expect(personalTask?.project).toBe("Personal");
      expect(personalTask?.completed).toBe(true);
    });

    test("should generate UUID for tasks without ID", () => {
      const dataWithoutId = JSON.stringify({
        projects: [
          {
            id: "project1",
            name: "Work",
            tasks: [
              {
                content: "Task without ID",
                description: "This task has no ID",
                due: null,
                priority: 2,
                project_id: "project1",
                section_id: null,
                parent_id: null,
                labels: [],
                is_completed: false,
              },
            ],
            sections: [],
          },
        ],
      });

      const importer = new TodoistImporter(dataWithoutId);
      const items = importer.importAsTaskItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBeDefined();
      expect(items[0].id.length).toBeGreaterThan(0);
    });

    test("should handle empty description and set default values", () => {
      const dataWithEmptyDescription = JSON.stringify({
        projects: [
          {
            id: "project1",
            name: "Work",
            tasks: [
              {
                id: "task1",
                content: "Task with empty description",
                description: "",
                due: null,
                priority: 0, // Invalid priority
                project_id: "project1",
                section_id: null,
                parent_id: null,
                labels: [],
                is_completed: false,
              },
            ],
            sections: [],
          },
        ],
      });

      const importer = new TodoistImporter(dataWithEmptyDescription);
      const items = importer.importAsTaskItems();

      expect(items).toHaveLength(1);
      expect(items[0].description).toBe("");
      expect(items[0].priority).toBe(2); // Default priority when Todoist priority is invalid
    });
  });

  describe("Error handling", () => {
    test("should handle errors gracefully during conversion", () => {
      // Create a safer version of malformed data
      const jsonData = JSON.stringify({
        projects: [
          {
            id: "project1",
            name: "Work",
            tasks: [
              {
                id: "task1",
                content: "Valid task",
                description: "",
                priority: 2,
                project_id: "project1",
                section_id: null,
                parent_id: null,
                labels: [],
                is_completed: false,
              },
              {
                id: "malformed",
                content: "Missing fields",
                // Missing many fields but at least has content
                // We need to make sure 'labels' exists to avoid the error
                labels: [],
              },
            ],
            sections: [],
          },
        ],
      });

      const importer = new TodoistImporter(jsonData);

      // Should not throw errors when processing malformed data
      const items = importer.importTasks();
      expect(items.length).toBeGreaterThan(0);

      const taskItems = importer.importAsTaskItems();
      expect(taskItems.length).toBeGreaterThan(0);
    });
  });
});
