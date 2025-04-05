/**
 * Core Interfaces Barrel File
 *
 * This file exports all interfaces from the core/interfaces directory.
 */

export * from "./input";
export * from "./processing";
export * from "./output";
export * from "./storage";

// Re-export enums from types for backward compatibility
export { DestinationType, InputSource, ItemNature } from "../types/enums";
