# Task Priority Lite: Testing Documentation

This document outlines the testing strategy and implementation for the Task Priority Lite application.

## Testing Strategy

Task Priority Lite employs a comprehensive testing approach that focuses on:

- **Unit testing** for individual components
- **Integration testing** between components
- **Schema validation testing** to ensure data integrity
- **End-to-end testing** to validate the complete workflow

The test suite aims to ensure that:
1. Data is correctly loaded from external sources
2. Schemas are properly validated
3. Data is correctly transformed into domain models
4. Business logic correctly processes the data

## Unit Tests

### TypeScript Tests

The TypeScript core application uses Jest as the testing framework. Tests are organized to mirror the application structure.

#### Infrastructure Layer Tests

These tests validate that data is correctly loaded and transformed from external sources:

1. **Schema Validator Tests** (`src/infrastructure/storage/__tests__/schema-validator.test.ts`)
   - Validates schema loading and data validation functionality
   - Tests handling of valid and invalid data
   - Tests error cases (missing schemas, invalid JSON)

2. **Todoist Loader Tests** (`src/infrastructure/storage/__tests__/todoist-loader.test.ts`)
   - Tests loading and validation of Todoist data
   - Tests mapping of Todoist data to core domain models
   - Tests error handling for invalid data

3. **Google Calendar Loader Tests** (`src/infrastructure/storage/__tests__/calendar-loader.test.ts`)
   - Tests loading and validation of Google Calendar events and tasks
   - Tests mapping of Calendar data to core domain models
   - Tests error handling for invalid data

4. **External Data Source Service Tests** (`src/infrastructure/storage/__tests__/external-data-source.test.ts`)
   - Tests the ExternalDataSourceService as an implementation of IStorageService
   - Tests combining data from multiple sources
   - Tests error handling and caching behavior

### Python Tests

The Python exporters have their own unit tests to ensure correct data extraction and transformation:

1. **Todoist Exporter Tests**
   - Tests API interaction with Todoist
   - Tests data transformation according to the schema
   - Tests error handling

2. **Google Calendar Exporter Tests**
   - Tests OAuth authentication with Google
   - Tests API interaction with Google Calendar
   - Tests data transformation according to the schema
   - Tests error handling

## Integration Tests

Integration tests validate the interaction between different components:

1. **Exporter to File System**
   - Tests that exporters correctly write data to files
   - Tests that file formats match the defined schemas

2. **File System to TypeScript Application**
   - Tests that the TypeScript application can load files produced by exporters
   - Tests that data is correctly validated and transformed

3. **Core Application Integration**
   - Tests that the storage service integrates correctly with the application layer
   - Tests that task processing works with data from external sources

## Schema Validation Tests

Schema validation is critical for ensuring data integrity between components:

1. **Python Exporter Validation**
   - Tests that exported data conforms to the defined schemas
   - Tests handling of validation errors

2. **TypeScript Loader Validation**
   - Tests validation of data before processing
   - Tests handling of schema validation errors

## Running Tests

### TypeScript Tests

To run TypeScript tests:

```bash
# From the project root
npm run test

# To run tests with coverage
npm run test:coverage

# To run a specific test file
npm run test -- src/infrastructure/storage/__tests__/todoist-loader.test.ts
```

### Python Tests

To run Python tests:

```bash
# From the exporters directory
cd exporters
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Run all tests
pytest

# Run tests for a specific module
pytest todoist/tests/
```

## Test Coverage

We aim to maintain high test coverage for both the TypeScript core application and Python exporters:

- **TypeScript**: >90% coverage
- **Python**: >90% coverage

Coverage reports are generated during test runs and can be found in:
- TypeScript: `coverage/` directory in the project root
- Python: `.coverage` file in the exporters directory

## Test Data

Test data is provided through mocks and fixtures:

1. **Mock Data**
   - TypeScript tests use Jest mocks for external dependencies
   - Python tests use unittest.mock for API interactions

2. **Test Fixtures**
   - Sample JSON files for testing schema validation
   - Mock API responses for testing data transformation

## Continuous Integration

All tests are run automatically on each commit through our CI pipeline, ensuring code quality and preventing regressions.

---

This testing documentation will be updated as the testing strategy evolves through each phase of the migration. 