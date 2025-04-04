
# Updated Implementation Plan for Folder Structure Migration

## Phase 1: Create New Directory Structure

```bash
mkdir -p src/core/{interfaces,models,types}
mkdir -p src/infrastructure/{storage,services,adapters}
mkdir -p src/application/{processors,managers,services}
mkdir -p src/presentation/{cli,api}
mkdir -p src/utils
```

## Phase 2: Core Domain Migration

1. **Move and Refactor Interfaces**

```bash
# Create core interface files
touch src/core/interfaces/{input.ts,processing.ts,output.ts,storage.ts,index.ts}
```

- Move interfaces from `src/core/interfaces.ts` into respective files
- Move GTD-specific interfaces from `src/gtd-eisen` into core interfaces

2. **Consolidate Models**

```bash
# Create core model files
touch src/core/models/{task.ts,project.ts,index.ts}
```

- Merge `src/gtd-eisen/models/task.ts` into `src/core/models/task.ts`
- Merge `src/gtd-eisen/models/project.ts` into `src/core/models/project.ts`

3. **Consolidate Enums and Types**

```bash
touch src/core/types/{enums.ts,index.ts}
```

- Move enums from `src/core/interfaces.ts` to `src/core/types/enums.ts`
- Move enums from `src/gtd-eisen/models/task.ts` to `src/core/types/enums.ts`

## Phase 3: Infrastructure Migration

1. **Storage Implementation**

```bash
touch src/infrastructure/storage/{file-storage.ts,index.ts}
```

- Move `src/gtd-eisen/persistence/storage-service.ts` to `src/infrastructure/storage/file-storage.ts`

2. **Service Implementation**

```bash
touch src/infrastructure/services/{llm-service.ts,index.ts}
```

- Move `src/gtd-eisen/services/llm-service.ts` to `src/infrastructure/services/llm-service.ts`
- Move any service implementations from `src/services` to appropriate locations

3. **Adapters (if applicable)**

```bash
touch src/infrastructure/adapters/index.ts
```

- Move any adapters from existing code to this location

## Phase 4: Application Logic Migration

1. **Processors**

```bash
touch src/application/processors/{gtd-processor.ts,eisenhower-prioritizer.ts,index.ts}
```

- Move `src/gtd-eisen/processors/gtd-clarification-processor.ts` to `src/application/processors/gtd-processor.ts`
- Move `src/gtd-eisen/prioritizers/eisenhower-prioritizer.ts` to `src/application/processors/eisenhower-prioritizer.ts`

2. **Managers**

```bash
touch src/application/managers/{task-manager.ts,index.ts}
```

- Move `src/gtd-eisen/managers/task-manager.ts` to `src/application/managers/task-manager.ts`

3. **Services**

```bash
touch src/application/services/{input-processing.ts,output-handling.ts,index.ts}
```

- Move `src/services/orchestration-services.ts` to `src/application/services/input-processing.ts` and `src/application/services/output-handling.ts`

## Phase 5: Utils Migration

```bash
touch src/utils/{llm-utils.ts,index.ts}
```

- Move `src/utils/llm-utils.ts` to stay in its location but update imports

## Phase 6: Update Imports and Exports

For each file moved, update import statements to reflect new paths. Create proper barrel files (index.ts) in each directory to simplify imports.

Example index.ts template:

```typescript
// src/core/models/index.ts
export * from './task';
export * from './project';
```

## Phase 7: Clean Up Old Files

```bash
# Remove original files after migration is complete
rm -rf src/gtd-eisen
rm -rf src/core/interfaces.ts
rm -rf src/abstracts
rm -rf src/integration
rm -rf src/examples
rm -rf src/handlers
rm -rf src/inputs
rm -rf src/outputs
rm -rf src/processors
rm -rf src/storage
```

## Phase 8: Update Documentation

1. **Update README.md**
   - Update project description to reflect new architecture
   - Update directory structure section
   - Update installation and usage instructions if needed
   - Add architectural diagram reflecting the new structure

2. **Update docs/PRD.md**
   - Update architectural sections to reflect new structure
   - Ensure component descriptions match new folder structure
   - Update any diagrams or flowcharts to reflect the new architecture

3. **Update docs/RELEASE-p0.md**
   - Update implementation status to reflect the refactoring
   - Update any section referencing project structure
   - Add entry about the architectural refactoring and its benefits

## Implementation Sequence

1. Start with core domain (models, interfaces, types)
2. Move to infrastructure layer
3. Migrate application layer
4. Update utils
5. Update all imports
6. Clean up old files
7. Update documentation

## Migration Tasks by File

### Interfaces:

1. Move enums from `src/core/interfaces.ts` to `src/core/types/enums.ts`
2. Move input interfaces to `src/core/interfaces/input.ts`
3. Move processing interfaces to `src/core/interfaces/processing.ts`
4. Move output interfaces to `src/core/interfaces/output.ts`
5. Create barrel file `src/core/interfaces/index.ts`

### Models:

1. Move Task class from `src/gtd-eisen/models/task.ts` to `src/core/models/task.ts`
2. Move Project class from `src/gtd-eisen/models/project.ts` to `src/core/models/project.ts`
3. Create barrel file `src/core/models/index.ts`

### Application Logic:

1. Move TaskProcessor from `src/gtd-eisen/processors` to `src/application/processors/gtd-processor.ts`
2. Move Prioritizer from `src/gtd-eisen/prioritizers` to `src/application/processors/eisenhower-prioritizer.ts`
3. Move TaskManager from `src/gtd-eisen/managers/task-manager.ts` to `src/application/managers/task-manager.ts`
4. Split orchestration services into input and output handling services

### Infrastructure:

1. Move StorageService to `src/infrastructure/storage/file-storage.ts`
2. Move LLMService to `src/infrastructure/services/llm-service.ts`

### Documentation:

1. Update README.md with new structure
2. Update docs/PRD.md with architectural changes
3. Update docs/RELEASE-p0.md to document the refactoring
