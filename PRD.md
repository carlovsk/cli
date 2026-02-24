# PRD: `rr` CLI Tool

## Overview

`rr` is an oclif-based CLI tool for orchestrating common development tasks across a microservices monorepo. It targets the RediRedi API project, which contains multiple services under a `services/` directory, each with its own `package.json` and `serverless.yml`.

The tool provides three core commands: **typecheck**, **test** (unit tests), and **bump** (dependency version bumping for `@rediredi/*` packages).

---

## Project Context

The target monorepo has this structure:

```
api/
├── package.json          # Root package.json (not a target for commands)
├── services/
│   ├── asset/
│   │   ├── package.json
│   │   ├── serverless.yml
│   │   └── ...
│   ├── billing/
│   ├── inventory/
│   ├── notification/
│   ├── order/
│   ├── promotion/
│   ├── report/
│   ├── store/
│   └── user/
├── packages/             # Shared packages (NOT a target for rr commands)
└── ...
```

Each service is identified by having **both** a `package.json` and a `serverless.yml` in its directory under `services/`.

---

## Configuration

### Config file: `~/.rrconfig.json`

On first run (or if config is missing), the CLI should prompt the user to set the project root path.

```json
{
  "projectRoot": "/Users/carlos/dev/api"
}
```

### Config command

```bash
rr config                  # Show current config
rr config set projectRoot /path/to/api   # Set project root
```

The CLI should validate that the path exists and contains a `services/` directory.

---

## Service Discovery

Services are discovered dynamically at runtime by scanning `<projectRoot>/services/` for directories that contain **both** `package.json` and `serverless.yml`. This means:

- New services added to the repo are automatically available
- No hardcoded service list
- The `.DS_Store` file and any non-directory entries are ignored

---

## Core Commands

### 1. `rr typecheck`

Runs `npm run typecheck` in selected services.

**Interactive mode (default):**
```bash
rr typecheck
# Shows interactive multi-select checkbox list of all discovered services
# User selects one or more, then execution begins
```

**Flag mode:**
```bash
rr typecheck --services billing,store
rr typecheck -s billing,store
rr typecheck --all
```

**Execution flags:**
```bash
rr typecheck --all --parallel    # Run in parallel instead of sequential
```

**Output:**
- Sequential (default): Run one service at a time, stream output with a clear header per service (e.g., `━━━ [billing] npm run typecheck ━━━`), and show a summary at the end (pass/fail per service).
- Parallel (`--parallel`): Run all selected services concurrently, prefix each output line with the service name, and show a summary at the end.

**Exit code:** Non-zero if any service fails.

---

### 2. `rr test`

Runs `npm run test:unit` in selected services.

Identical interface to `rr typecheck` — same flags, same interactive mode, same output format.

```bash
rr test                          # Interactive multi-select
rr test --services billing,store # Flag-based selection
rr test -s billing,store         # Short flag
rr test --all                    # All services
rr test --all --parallel         # Parallel execution
```

**Exit code:** Non-zero if any service fails.

---

### 3. `rr bump`

Bumps all `@rediredi/*` packages to a specified version in the selected services.

**Usage:**
```bash
rr bump 1.2.3                          # Interactive service selection, bump to 1.2.3
rr bump 1.2.3 --services billing,store # Flag-based selection
rr bump 1.2.3 -s billing,store         # Short flag
rr bump 1.2.3 --all                    # All services
```

**The version argument is required.** If omitted, show an error with usage help.

**Behavior per selected service:**

1. Read the service's `package.json`
2. Find all `@rediredi/*` entries in both `dependencies` and `devDependencies`
3. Update their versions to the specified version (e.g., `"@rediredi/core": "^1.2.3"` → use the exact format the user provides; if they give `1.2.3`, set `1.2.3`; if they give `^1.2.3`, set `^1.2.3`)
4. Run `npm install` in that service directory to update the lockfile
5. Show a summary of what was changed per service (package name, old version → new version)

**If a service has no `@rediredi/*` dependencies**, skip it and note it in the output.

**Exit code:** Non-zero if any `npm install` fails.

---

## Shared Flags (all commands)

| Flag | Short | Description |
|---|---|---|
| `--services` | `-s` | Comma-separated list of service names |
| `--all` | `-a` | Run on all discovered services |
| `--parallel` | `-p` | Run in parallel (default: sequential). Not applicable to `bump`. |

- `--services` and `--all` are mutually exclusive. If both are provided, show an error.
- If neither `--services` nor `--all` is provided, launch interactive multi-select.
- `--parallel` is available on `typecheck` and `test` only. The `bump` command always runs sequentially (because `npm install` can have concurrency issues in a monorepo).

---

## Interactive Multi-Select UX

When no `--services` or `--all` flag is provided, the CLI shows an interactive checkbox list using a library like `@inquirer/prompts` or `inquirer`:

```
? Select services to typecheck:
  ◻ asset
  ◻ billing
  ◻ inventory
  ◻ notification
  ◻ order
  ◻ promotion
  ◻ report
  ◻ store
  ◻ user

  (Press <space> to select, <a> to toggle all, <enter> to confirm)
```

Services should be listed in alphabetical order.

---

## Output Format

### Sequential execution (default)

```
━━━ [1/3] billing: npm run typecheck ━━━
<streaming stdout/stderr from the command>

✔ billing passed (2.3s)

━━━ [2/3] store: npm run typecheck ━━━
<streaming stdout/stderr from the command>

✘ store failed (1.1s)

━━━ [3/3] inventory: npm run typecheck ━━━
<streaming stdout/stderr from the command>

✔ inventory passed (3.0s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  ✔ billing (2.3s)
  ✘ store (1.1s)
  ✔ inventory (3.0s)

2 passed, 1 failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Parallel execution

```
[billing]    > Compiling TypeScript...
[store]      > Compiling TypeScript...
[inventory]  > Compiling TypeScript...
[billing]    > Done
[store]      > error TS2345: Argument of type...
[inventory]  > Done

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  ✔ billing (2.3s)
  ✘ store (1.1s)
  ✔ inventory (3.0s)

2 passed, 1 failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Bump output

```
━━━ [1/2] billing ━━━
  @rediredi/core: ^1.0.0 → 1.2.3
  @rediredi/utils: ^1.1.0 → 1.2.3
  Running npm install...
  ✔ Done (4.2s)

━━━ [2/2] store ━━━
  @rediredi/core: ^1.0.0 → 1.2.3
  @rediredi/shared-types: ^0.9.0 → 1.2.3
  Running npm install...
  ✔ Done (3.8s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  ✔ billing — 2 packages bumped
  ✔ store — 2 packages bumped

2 services updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Technical Implementation

### Stack

- **Framework:** oclif (latest stable)
- **Language:** TypeScript
- **Package manager:** npm
- **Interactive prompts:** `@inquirer/prompts`
- **Child process execution:** Use Node.js `child_process.spawn` for streaming output

### Project Structure

```
rr/
├── package.json
├── tsconfig.json
├── bin/
│   ├── run.js
│   └── dev.js
├── src/
│   ├── commands/
│   │   ├── config.ts
│   │   ├── typecheck.ts
│   │   ├── test.ts
│   │   └── bump.ts
│   ├── lib/
│   │   ├── config.ts         # Config read/write/validate
│   │   ├── services.ts       # Service discovery
│   │   ├── runner.ts         # Sequential/parallel command execution
│   │   ├── prompt.ts         # Interactive service selection
│   │   └── output.ts         # Output formatting and summary
│   └── index.ts
├── test/
│   ├── commands/
│   │   ├── config.test.ts
│   │   ├── typecheck.test.ts
│   │   ├── test.test.ts
│   │   └── bump.test.ts
│   └── lib/
│       ├── config.test.ts
│       ├── services.test.ts
│       ├── runner.test.ts
│       └── bump-logic.test.ts
└── README.md
```

### Shared Logic

The three execution commands (`typecheck`, `test`, `bump`) share a common flow:

1. Load and validate config
2. Discover services
3. Resolve target services (from `--services`, `--all`, or interactive prompt)
4. Execute the task per service
5. Collect results and print summary
6. Exit with appropriate code

This should be abstracted into shared utilities in `src/lib/` to avoid duplication. Each command file should be thin — mostly wiring flags to shared logic.

### Error Handling

- **Missing config:** Prompt user to run `rr config set projectRoot <path>`
- **Invalid project root:** Clear error message saying the path doesn't exist or has no `services/` directory
- **No services found:** Error message suggesting the project structure might be wrong
- **Service not found:** If `--services` includes a name that doesn't match a discovered service, show an error listing available services
- **Command failure:** Continue executing remaining services (don't abort), report failures in the summary
- **No `@rediredi/*` deps in a service:** Skip with a note, not an error

---

## Testing Requirements

**This is non-negotiable. The tool must have tests.**

### Unit Tests

- **Config:** Read, write, validate, missing file handling
- **Service discovery:** Correct filtering (needs both `package.json` and `serverless.yml`), ignores non-directories, alphabetical sorting
- **Runner:** Sequential execution, parallel execution, exit code aggregation, failure handling
- **Bump logic:** Correctly identifies `@rediredi/*` packages, updates versions in both deps and devDeps, handles services with no matching packages
- **Flag validation:** Mutual exclusivity of `--services` and `--all`, version argument required for bump

### Integration Tests (nice to have)

- End-to-end command execution with a mock project directory

Use **Jest** or oclif's built-in test setup. Mock `child_process.spawn` and filesystem operations where needed.

---

## Out of Scope

- Running commands in the `packages/` directory
- Modifying the root `package.json`
- Any service that doesn't have both `package.json` and `serverless.yml`
- Git operations (committing, branching)
- Publishing the CLI to npm (it's a local dev tool)

---

## Implementation Order

1. Scaffold oclif project with TypeScript
2. Implement config system (`rr config`)
3. Implement service discovery
4. Implement interactive multi-select prompt
5. Implement sequential runner with output formatting
6. Implement `rr typecheck` command
7. Implement `rr test` command (mostly reuses typecheck logic)
8. Implement `rr bump` command
9. Add parallel execution support
10. Write tests throughout (not as an afterthought)
