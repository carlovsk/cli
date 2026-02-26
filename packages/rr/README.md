# rr - RediRedi CLI Tool

An oclif-based CLI tool for orchestrating common development tasks across a microservices monorepo. It targets the RediRedi API project, which contains multiple services under a `services/` directory.

## Installation

```bash
npm install
npm run build
```

## Configuration

On first run, you need to set the project root path:

```bash
./bin/run.js config set projectRoot /path/to/your/api
```

View current configuration:
```bash
./bin/run.js config
```

## Commands

### typecheck
Run TypeScript type checking on selected services:

```bash
# Interactive service selection
./bin/run.js typecheck

# Run on specific services
./bin/run.js typecheck --services billing,store
./bin/run.js typecheck -s billing,store

# Run on all services
./bin/run.js typecheck --all

# Run in parallel
./bin/run.js typecheck --all --parallel
```

### test
Run unit tests on selected services:

```bash
# Interactive service selection
./bin/run.js test

# Run on specific services
./bin/run.js test --services billing,store

# Run on all services
./bin/run.js test --all

# Run in parallel
./bin/run.js test --all --parallel
```

### bump
Bump `@rediredi/*` package versions in selected services:

```bash
# Interactive service selection
./bin/run.js bump 1.2.3

# Bump specific services
./bin/run.js bump 1.2.3 --services billing,store

# Bump all services
./bin/run.js bump 1.2.3 --all
```

### code
Open projects in VS Code:

```bash
# Interactive project selection
./bin/run.js code

# Open specific project
./bin/run.js code api

# Open in new VS Code window
./bin/run.js code api --new

# List available projects
./bin/run.js code --list
```

### opencode
Open projects in OpenCode:

```bash
# Interactive project selection
./bin/run.js opencode

# Open specific project
./bin/run.js opencode api

# Open in new OpenCode window
./bin/run.js opencode api --new

# List available projects
./bin/run.js opencode --list
```

## Project Structure

The tool expects your monorepo to have this structure:

```
api/
├── services/
│   ├── asset/
│   │   ├── package.json
│   │   ├── serverless.yml
│   │   └── ...
│   ├── billing/
│   ├── inventory/
│   └── ...
└── ...
```

Each service is identified by having both `package.json` and `serverless.yml` files.

## Development

### Scripts

- `npm run build` - Build the TypeScript code
- `npm run dev` - Run in development mode with ts-node
- `npm test` - Run tests
- `npm run typecheck` - Type check the code

### Testing

The tool includes comprehensive unit tests covering:
- Configuration management
- Service discovery
- Command execution logic
- Package version bumping

Run tests with: `npm test`

## Features

- **Service Discovery**: Automatically finds services with both `package.json` and `serverless.yml`
- **Interactive Selection**: Multi-select interface for choosing services
- **Parallel Execution**: Optional parallel execution for faster operations
- **Error Handling**: Proper error handling and reporting
- **Configuration Management**: Persistent configuration for project root
- **Version Bumping**: Intelligent bumping of `@rediredi/*` packages only
- **Editor Integration**: Open projects directly in VS Code with the `code` command or in OpenCode with the `opencode` command