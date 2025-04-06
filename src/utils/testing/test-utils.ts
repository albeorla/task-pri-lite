/**
 * Shared test utilities and mock objects
 */

import { Task, TaskStatus, Project } from "../../core/models";
import { TimeBasedViewGenerator } from "../../outputs/time-based-views";

// Mock project for testing
export const mockProject = new Project({
  id: "project-1",
  name: "Test Project",
  outcome: "Test outcome",
  status: "Active",
  creationDate: new Date(),
});

// Mock task for testing
export const mockTask = new Task({
  description: "Test Task",
  dueDate: new Date(),
  notes: "Test Task Description",
  status: TaskStatus.INBOX,
  sourceId: "test-123",
  project: mockProject,
});

// Mock time-based view generator
export const timeBasedViewGeneratorMock = {
  generateView: jest.fn().mockReturnValue([mockTask]),
} as unknown as TimeBasedViewGenerator;

// Mock for task store
export const taskStoreMock = {
  addTask: jest.fn(),
  getAllTasks: jest.fn().mockReturnValue([mockTask]),
};

// Mock for storage factory
export const storageFactoryMock = {
  createStorage: jest.fn(),
};

// Mock for storage service
export const storageServiceMock = {
  saveTask: jest.fn().mockResolvedValue(true),
  loadTasks: jest.fn().mockResolvedValue([mockTask]),
  saveProject: jest.fn().mockResolvedValue(true),
  loadProjects: jest.fn().mockResolvedValue([]),
};
