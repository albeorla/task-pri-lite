# ADR 003: Storage Strategy

## Status
Accepted (Current Implementation with Planned Evolution)

## Context
Task Priority Lite needs to store:
1. Imported tasks and events from external sources
2. Processing results and classification data
3. Configuration and user preferences

The storage solution needs to be compatible with our Clean Architecture approach, ensuring business logic is decoupled from storage implementation details.

## Decision
We've implemented a **file-based storage mechanism** using `FileStorageService` in the infrastructure layer:

1. Input data comes from JSON files produced by exporters
2. Persistent app data is stored in local JSON files
3. The storage interface abstracts implementation details from business logic

## Consequences

### Positive
- **Simple Implementation** - Direct file I/O without database setup
- **Portable** - Works without additional infrastructure dependencies
- **Transparent** - Data is human-readable for debugging
- **Implementation-Agnostic Core** - Business logic doesn't depend on storage details
- **Fast MVP Development** - Minimized infrastructure concerns during initial development

### Negative
- **Limited Querying** - No complex data filtering or aggregation
- **No Concurrency Control** - Potential race conditions if multiple processes access files
- **No Transactions** - Can't ensure data consistency across multiple operations
- **Limited Scale** - Not suitable for large data volumes
- **No Indexing** - Full scans required for any lookups

## Future Evolution
As outlined in our architecture recommendations, we plan to evolve our storage strategy:

1. **Short Term**
   - Document JSON schema formats
   - Add lightweight validation

2. **Medium Term**
   - Migrate to SQLite for improved querying but maintaining portability

3. **Long Term**
   - Migrate to a proper database solution:
     - **PostgreSQL** (relational): For structured data with complex relationships
     - **MongoDB** (document): If flexible schema and JSON-native storage is preferred

The Clean Architecture ensures this evolution can happen with minimal impact on business logic, as storage is isolated in the infrastructure layer behind well-defined interfaces. 