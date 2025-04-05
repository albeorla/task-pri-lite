# **Task Priority Lite: Migration Checklist**

## **Phase 0 (P0): File-Based Integration**

**Objective:** Rapid MVP Delivery with Minimal Complexity

**A. Define Contracts (JSON Schemas)**

- [ ] Define `todoist_schema.json`: Specify structure, data types, required fields for Todoist tasks.
- [ ] Define `calendar_schema.json`: Specify structure, data types, required fields for Google Calendar events/tasks.
- [ ] Choose and document JSON Schema version (e.g., draft-07).
- [ ] Set up schema validation tooling/libraries (for both Python and TypeScript).

**B. Implement Python Exporters**

- **Todoist Exporter (`exporters/todoist/`)**
  - [ ] Set up Python environment and install Todoist SDK.
  - [ ] Implement `adapter.py`: Logic to connect to Todoist API and retrieve tasks/data.
  - [ ] Implement `converter.py`: Logic to transform raw Todoist data into the defined JSON schema format.
  - [ ] Integrate JSON schema validation within the exporter to ensure output correctness.
  - [ ] Implement file writing logic (potentially using `shared/file_writer.py`) to output `todoist_export.json`.
  - [ ] Handle API keys/secrets securely.
  - [ ] Add basic error handling and logging.
- **Google Calendar/Tasks Exporter (`exporters/google-calendar/`)**
  - [ ] Set up Python environment and install Google API Client Library.
  - [ ] Implement OAuth 2.0 authentication flow for Google Calendar/Tasks.
  - [ ] Implement `adapter.py`: Logic to connect to Google APIs and retrieve events/tasks.
  - [ ] Implement `converter.py`: Logic to transform raw Google data into the defined JSON schema format.
  - [ ] Integrate JSON schema validation within the exporter.
  - [ ] Implement file writing logic to output `calendar_events.json` and/or `calendar_tasks.json`.
  - [ ] Handle OAuth credentials securely.
  - [ ] Add basic error handling and logging.
- **Shared Components (`exporters/shared/`)**
  - [ ] Implement `file_writer.py` if common file writing logic is needed.

**C. Implement TypeScript Core Application (File Reading)**

- **Infrastructure Layer (`src/infrastructure/file_storage/`)**
  - [ ] Define `IDataSource` interface in the Core layer (if not already present).
  - [ ] Implement `FileStorageService` adapter adhering to `IDataSource`.
  - [ ] Implement `todoist_loader.ts`: Logic to read `todoist_export.json`.
  - [ ] Implement `calendar_loader.ts`: Logic to read `calendar_*.json`.
  - [ ] Integrate JSON schema validation within the loaders (using a TypeScript library).
  - [ ] Implement data mapping logic to convert validated JSON into Core domain models (e.g., `Task`, `Project`).
  - [ ] Add robust error handling (e.g., file not found, invalid JSON, schema validation failure).
- **Application Layer Integration**
  - [ ] Inject/provide `FileStorageService` to relevant Application Layer services/processors.
  - [ ] Ensure Application Layer uses the `IDataSource` interface to fetch data.
- **Core Processing Logic**
  - [ ] Verify existing GTD clarification and prioritization logic works correctly with data loaded from files.

**D. Project Setup & Structure**

- [ ] Create the defined project directory structure (`albeorla-task-pri-lite/`, `exporters/`, `src/`, etc.).
- [ ] Initialize TypeScript project (`tsconfig.json`, package manager).
- [ ] Set up Python environments for exporters (e.g., using `venv`).

**E. Testing & Documentation (P0)**

- [ ] Write unit tests for Python exporter data transformation (`converter.py`).
- [ ] Write unit tests for Python exporter API interaction (`adapter.py` - potentially mocked).
- [ ] Write unit tests for TypeScript file loaders and JSON validation.
- [ ] Write unit tests for TypeScript data mapping logic.
- [ ] Write integration tests for the P0 flow: Run Python exporter -> Verify JSON output -> Run TS App -> Verify core logic output.
- [ ] Document the defined JSON schemas.
- [ ] Document how to set up credentials for Todoist and Google Calendar.
- [ ] Document how to run the Python exporters manually.
- [ ] Document how to run the TypeScript core application.

## **Phase 1 (P1): Automation & Consolidation**

**Objective:** Eliminate Manual Steps and Introduce Persistence

**A. Implement Automation**

- [ ] Choose scheduling mechanism (e.g., `node-cron` in TS, OS-level cron, separate orchestrator).
- [ ] Implement scheduler logic to periodically trigger Python exporters (e.g., using Node's `child_process`).
- [ ] Implement robust error handling and logging for the scheduling and exporter execution process (capture stderr/stdout, handle exit codes).
- [ ] Consider wrapping exporters in simple Flask/FastAPI endpoints if `child_process` becomes complex.

**B. Implement Data Persistence (SQLite)**

- [ ] Define SQLite database schema (tables, columns, types) to store task/event data from exporters.
- [ ] Modify Python exporters: Instead of (or in addition to) writing JSON files, write data to the SQLite database.
- [ ] Choose and integrate a Node SQLite client library (e.g., `sqlite3`, `better-sqlite3`) into the TypeScript project.
- [ ] Implement a new `SQLiteStorageService` adapter in `src/infrastructure/database/` adhering to the `IDataSource` interface.
- [ ] Implement logic in `SQLiteStorageService` to query data from SQLite tables.
- [ ] Implement logic to map SQLite query results to Core domain models.
- [ ] Add configuration mechanism (e.g., environment variable, config file) to allow the TS application to switch between `FileStorageService` and `SQLiteStorageService`.

**C. Evaluate Language Consolidation**

- [ ] Analyze complexity and maintenance overhead of managing both Python and TypeScript.
- [ ] Investigate feasibility of rewriting Python exporter logic (API interaction, data transformation) in TypeScript.
- [ ] Compare TypeScript libraries/SDKs for Todoist/Google APIs with Python equivalents.
- [ ] Make a decision: Consolidate to TypeScript or maintain Python exporters. Document the rationale.
- _If Consolidating:_
  - [ ] Rewrite Todoist exporter logic in TypeScript.
  - [ ] Rewrite Google Calendar/Tasks exporter logic in TypeScript.
  - [ ] Update automation logic to trigger TypeScript functions/modules directly.

**D. Testing & Documentation (P1)**

- [ ] Write unit tests for the scheduler component.
- [ ] Write unit tests for Python SQLite writing logic.
- [ ] Write unit tests for TypeScript `SQLiteStorageService` (reading and mapping).
- [ ] Write integration tests for the automated P1 flow: Scheduler triggers exporters -> Exporters write to SQLite -> TS app reads from SQLite -> processes data.
- [ ] Update documentation: Explain the automated setup, database schema, and configuration options.

## **Phase 2 (P2): Transition to a Service-Based Architecture**

**Objective:** Evolve into a Scalable, Multi-User, Real-Time System

**A. Transition Exporters to RESTful API Services**

- [ ] Choose Python web framework (e.g., FastAPI recommended).
- [ ] Refactor Todoist exporter logic into a standalone FastAPI service.
  - [ ] Define API endpoints (e.g., `GET /tasks`).
  - [ ] Use Pydantic models for request/response validation (derived from JSON schemas).
  - [ ] Implement API logic to fetch live data from Todoist on request.
  - [ ] Set up deployment mechanism (e.g., Docker container, server process).
- [ ] Refactor Google Calendar/Tasks exporter logic into a standalone FastAPI service.
  - [ ] Define API endpoints (e.g., `GET /events`, `GET /tasks`).
  - [ ] Use Pydantic models for validation.
  - [ ] Implement API logic (including OAuth handling if requests are user-specific).
  - [ ] Set up deployment mechanism.
- [ ] Implement API versioning strategy.
- [ ] Generate OpenAPI/Swagger documentation for the new APIs.

**B. Implement TypeScript API Clients**

- [ ] Choose and integrate an HTTP client library (`axios`, `node-fetch`) in the TypeScript core.
- [ ] Implement a new `RestApiDataSource` adapter in `src/infrastructure/api_clients/` adhering to `IDataSource`.
- [ ] Implement logic to call the new exporter API endpoints.
- [ ] Implement logic to map API responses to Core domain models.
- [ ] Update configuration to use `RestApiDataSource`.
- [ ] Handle errors related to network requests and API responses.

**C. Implement Asynchronous Communication (Optional/Recommended)**

- [ ] Evaluate the need for real-time updates vs. polling.
- [ ] Choose a message queue system (e.g., RabbitMQ, Kafka, Redis Pub/Sub).
- [ ] Set up the chosen message broker infrastructure.
- [ ] Modify exporter services to publish data change events (e.g., "task created," "event updated") to the message queue.
- [ ] Implement subscriber logic in the TypeScript core/application layer to listen for messages.
- [ ] Implement logic to update internal state/database based on received messages.

**D. Migrate to Scalable Data Storage**

- [ ] Choose a production-grade database (e.g., PostgreSQL, MongoDB).
- [ ] Design the database schema based on domain models and query needs.
- [ ] Implement database migration scripts (if migrating from SQLite).
- [ ] Choose and integrate a suitable database client/ORM (e.g., TypeORM, Prisma, node-postgres) in TypeScript.
- [ ] Implement a new database adapter (e.g., `PostgresDataSource`) adhering to `IDataSource` (or a separate `IRepository` interface).
- [ ] Refactor persistence logic (both reading and potentially writing results) to use the new database.

**E. Implement API Gateway / GraphQL Layer (Optional/Recommended)**

- [ ] Evaluate the need for a unified access point for future clients (web dashboard).
- [ ] Choose technology (e.g., standalone Gateway like Kong/Tyk, Node.js based like Express Gateway, or GraphQL server like Apollo Server).
- [ ] Design the unified API schema (REST routes or GraphQL schema).
- [ ] Implement the gateway logic to route requests to appropriate backend services (Core App API, Exporter APIs if needed directly).
- [ ] Implement data aggregation/stitching logic if required.

**F. Evaluate Polyglot Approach (Optional)**

- [ ] Identify performance bottlenecks or components needing high concurrency (e.g., data ingestion, complex algorithms).
- [ ] Evaluate Go or Rust for implementing these specific services.
- [ ] Make a decision: Re-implement specific services in Go/Rust? Document rationale.
- _If Implementing:_
  - [ ] Implement the selected service(s) in Go/Rust.
  - [ ] Ensure clear API contracts (REST, gRPC) or message queue integration with the rest of the system.
  - [ ] Set up build/deployment pipelines for the new language(s).

**G. Testing & Documentation (P2)**

- [ ] Write unit tests for the new API services (Python/Go/Rust).
- [ ] Write unit tests for the TypeScript API client adapter (`RestApiDataSource`).
- [ ] Implement contract tests between API clients and servers (e.g., using Pact).
- [ ] Write unit tests for message queue publishers and subscribers (if implemented).
- [ ] Write unit tests for the new database adapter/repository.
- [ ] Write integration tests for service interactions (API calls, message passing, database updates).
- [ ] Implement end-to-end tests simulating client interaction through the API Gateway/GraphQL layer.
- [ ] Generate/update API documentation (OpenAPI/Swagger).
- [ ] Document the overall service architecture, data flow, and deployment strategy.

## **Cross-Cutting / Operational Concerns (Ongoing, especially P1 & P2)**

**A. Clean Architecture & Abstraction**

- [ ] Periodically review code for adherence to Clean Architecture principles (dependency rules).
- [ ] Ensure the `IDataSource` (or similar core interfaces) remains stable and effectively decouples the Core from Infrastructure details throughout the migration.

**B. Error Handling & Logging**

- [ ] Implement consistent structured logging across all components/services.
- [ ] Ensure comprehensive error handling and reporting (e.g., failed API calls, DB errors, queue issues).

**C. Monitoring & Alerting (P2)**

- [ ] Choose and implement a monitoring stack (e.g., Prometheus, Grafana, ELK).
- [ ] Instrument services to expose key metrics (latency, error rates, resource usage, queue depth).
- [ ] Set up dashboards for visualization.
- [ ] Configure alerting for critical failure conditions.

**D. Configuration & Secrets Management**

- [ ] Use environment variables or configuration files for settings (database URLs, API endpoints, etc.).
- [ ] Implement secure storage and retrieval for API keys, OAuth credentials, database passwords (e.g., HashiCorp Vault, cloud provider secrets manager).

**E. CI/CD (Continuous Integration / Continuous Deployment)**

- [ ] Set up a Git repository with a clear branching strategy (e.g., Gitflow).
- [ ] Configure a CI server (e.g., GitHub Actions, GitLab CI, Jenkins).
- [ ] Automate linting and code style checks in the CI pipeline.
- [ ] Automate unit tests in the CI pipeline.
- [ ] Automate integration tests in the CI pipeline.
- [ ] Automate build processes (e.g., compiling TS, building Docker images).
- [ ] Implement an automated deployment strategy (potentially manual trigger initially, moving to automated).

**F. Containerization (P1 onwards)**

- [ ] Create Dockerfiles for Python exporters/services.
- [ ] Create Dockerfile for TypeScript core application/services.
- [ ] Create `docker-compose.yml` for easy local development setup (including database, message broker).

---

This checklist provides a detailed path through the migration. Remember to review and adapt it as the project progresses and new requirements or challenges emerge.