# Task Priority Lite

A system for processing various types of input (text, tasks, etc.) and routing them to appropriate destinations.

## Project Setup

This project has been set up with the following components:

- GitHub CLI for repository management
- Environment variables for secrets management
- Git configuration to ignore sensitive files
- TypeScript configuration for development

## Development Environment

### Prerequisites

- Node.js (v20.18.0 or later)
- npm (included with Node.js)
- TypeScript (installed as a project dependency)

### Getting Started

1. Clone the repository:
   ```bash
   gh repo clone <repository-url>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run development mode with watch:
   ```bash
   npm run dev
   ```

## Project Structure

- `src/` - Source code
  - `abstracts/` - Abstract base classes
  - `core/` - Core interfaces and types
  - `examples/` - Implementation examples
  - `handlers/` - Destination handlers
  - `inputs/` - Input item classes
  - `processors/` - Input processors
  - `services/` - Orchestration services

## Environment Variables

Copy the `.env.example` file to `.env` and update with your actual secrets:

```bash
cp .env.example .env
```

Then edit the `.env` file with your actual values.

## Scripts

- `npm run build` - Build the TypeScript project
- `npm run start` - Run the compiled JavaScript
- `npm run dev` - Run TypeScript in watch mode for development

## License

ISC
