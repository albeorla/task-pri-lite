# ADR 002: Python-TypeScript Integration Method

## Status
Accepted (Current Implementation)

## Context
Task Priority Lite has two main components:
1. **Python Exporters** - Scripts that connect to external services (Todoist, Google Calendar) to fetch data
2. **TypeScript Application** - The core application that processes and organizes tasks

We needed a simple, decoupled way for these components to communicate without introducing complex dependencies.

## Decision
We've implemented a **file-based JSON data exchange** integration method:

1. Python exporters connect to external APIs (Todoist, Google Calendar) and export data as JSON files:
   - `output/todoist_export.json`
   - `output/calendar_events.json`
   - `output/calendar_tasks.json`

2. TypeScript application reads these JSON files via its `FileStorageService` in the infrastructure layer.

3. This creates a clear separation: Python exporters handle external API integration, while TypeScript focuses on core business logic.

## Consequences

### Positive
- **Simple Implementation** - No complex inter-process communication required
- **Loose Coupling** - Components operate independently with a clear contract (JSON schema)
- **Language Independence** - Any language could produce the JSON files if needed
- **Auditability** - JSON files can be manually inspected for debugging
- **Quick MVP Development** - Allowed us to build the system rapidly

### Negative
- **Manual Process** - Requires manually running exporters, then the app
- **Not Real-Time** - Data is only as fresh as the last export
- **Batch Processing Only** - Not suitable for continuous operations
- **No Validation** - Limited schema validation between components

## Future Considerations
As outlined in our architecture recommendations, we plan to evolve this integration:

1. **Short Term** - Document the JSON schemas to ensure consistent contract
2. **Medium Term** - Create a scheduler to automate the export-process workflow
3. **Long Term** - Migrate to a service-based architecture (REST or GraphQL) for real-time data exchange

This ADR documents our current implementation with acknowledgment that it serves our MVP needs while planning for more robust integration in the future. 