# @cli-tools/ticket-cli

A TypeScript CLI tool for managing tickets across Linear, Jira, and GitHub Issues. Built with oclif.

## Features

- **Unified interface** across Linear, Jira Cloud, and GitHub Issues
- **Authentication** management for multiple providers
- **Normalized ticket data** with consistent schema
- **Multiple output formats** (table, JSON, markdown)
- **Real-time watching** of ticket changes
- **Standup summaries** from recent activity
- **Tree view** for ticket hierarchies

## Installation

From the monorepo root:

```bash
npm install
npm run build
```

## Usage

### Authentication

Add authentication for providers:

```bash
# Add Linear authentication
npx ticket auth add linear

# Add Jira authentication
npx ticket auth add jira

# Add GitHub authentication
npx ticket auth add github

# List authentication status
npx ticket auth list

# Remove authentication
npx ticket auth remove linear
```

### Listing Tickets

```bash
# List all tickets from configured providers
npx ticket list

# Filter by provider
npx ticket list --provider linear

# Filter by status
npx ticket list --status in_progress

# Filter by assignee
npx ticket list --assignee me

# Output as JSON
npx ticket list --output json
```

### Getting Ticket Details

```bash
# Get ticket details (auto-detects provider)
npx ticket get KOR-123
npx ticket get lin_abc123
npx ticket get org/repo#456

# Specify provider explicitly
npx ticket get PROJ-789 --provider jira

# Output as JSON
npx ticket get KOR-123 --output json
```

### Ticket Tree View

```bash
# View ticket hierarchy
npx ticket tree KOR-123

# Output as JSON
npx ticket tree KOR-123 --output json
```

### Standup Reports

```bash
# Generate standup summary
npx ticket standup

# Custom time range
npx ticket standup --since "3 days ago"
npx ticket standup --since "last week"

# Markdown output
npx ticket standup --output markdown
```

### Watching Tickets

```bash
# Watch for changes (polls every 30 seconds)
npx ticket watch KOR-123

# Custom poll interval
npx ticket watch KOR-123 --interval 60
```

## Provider Support

### Linear
- Uses GraphQL API with personal API keys
- Supports all Linear features including priorities, projects, teams
- Authentication: Personal API key from Settings > Account > Security & Access > API

### Jira Cloud
- Uses REST API v3 with API tokens
- Supports JQL filtering and epic relationships
- Authentication: Domain + email + API token from https://id.atlassian.com/manage-profile/security/api-tokens

### GitHub Issues
- Uses REST API with personal access tokens
- Filters out pull requests automatically
- Authentication: Personal access token with `repo` scope

## Configuration

Configuration is stored in `~/.ticket-cli/config.json` with secure file permissions (0600).

## Development

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
npm run build --workspace=@cli-tools/ticket-cli

# Run in development mode
cd packages/ticket-cli
./bin/dev.js --help

# Type checking
npm run typecheck --workspace=@cli-tools/ticket-cli

# Linting
npm run lint --workspace=@cli-tools/ticket-cli
```

## Project Structure

```
src/
├── commands/           # CLI commands
│   ├── auth/          # Authentication commands
│   ├── list.ts        # List tickets
│   ├── get.ts         # Get ticket details
│   ├── tree.ts        # Ticket hierarchy
│   ├── standup.ts     # Standup reports
│   └── watch.ts       # Watch tickets
├── providers/         # Provider implementations
│   ├── base.ts        # Abstract provider interface
│   ├── linear.ts      # Linear GraphQL provider
│   ├── jira.ts        # Jira REST provider
│   └── github.ts      # GitHub REST provider
├── schemas/           # Type definitions
│   ├── ticket.ts      # Unified ticket schema
│   └── normalize.ts   # Status/priority normalization
└── utils/             # Utilities
    ├── config.ts      # Configuration management
    ├── display.ts     # Output formatting
    ├── date.ts        # Date parsing
    └── infer-provider.ts # Provider inference
```

## License

MIT