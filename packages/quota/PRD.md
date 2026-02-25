# PRD: quota-cli

## Overview

A TypeScript CLI tool built with oclif that checks AI tool quota/usage across multiple providers. For providers with APIs, it fetches live data. For providers without APIs, it opens the correct dashboard URL in the browser.

---

## Command Interface

```bash
quota <provider>
quota all
```

**Supported provider aliases:**

| Input | Provider |
|---|---|
| `zai`, `z.ai` | Z.ai (Zhipu AI) |
| `gemini`, `google` | Google Gemini |
| `github`, `copilot` | GitHub Copilot |
| `claude`, `anthropic` | Claude |
| `cursor` | Cursor |
| `all` | Run all providers sequentially |

---

## Provider Behaviors

### Z.ai — Live API
- **Endpoint:** `GET https://bigmodel.cn/api/monitor/usage/quota/limit`
- **Auth:** Bearer token from config
- **Display:** tokens used, tokens remaining, % bar, reset time countdown
- **On error:** print error message, offer to open dashboard

### Gemini — Live API (OAuth)
- **Endpoint:** `https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels`
- **Auth:** OAuth2 token from config (Google account, not API key)
- **Display:** per-model quota bars (G3 Pro, G3 Flash, etc.), reset times
- **On error:** print error, offer to open dashboard
- **Note:** OAuth token expires; CLI must detect expiry and prompt user to re-auth via `quota config gemini`

### GitHub Copilot — Browser only
- **Action:** Open `https://github.com/settings/copilot` in default browser
- **Display:** Print message explaining no API is available, then open

### Claude — Browser only
- **Action:** Open `https://claude.ai/settings/limits` in default browser
- **Display:** Print message explaining no API is available, then open

### Cursor — Browser only
- **Action:** Open `https://cursor.com/settings` in default browser
- **Display:** Print message explaining no API is available, then open

---

## Config Command

```bash
quota config              # show current config (mask keys)
quota config zai          # set Z.ai API key (prompted, not flag)
quota config gemini       # initiate Google OAuth flow
quota config --show       # show all config with masked values
```

Config stored at `~/.quota-cli/config.json`. Keys are stored as-is (no encryption in v1, noted as future improvement).

---

## Display Format

For live providers, output should look like:

```
Z.ai — Coding Plan (Pro)
─────────────────────────────────
Tokens used:   ████████░░░░░░░░░░░░  42%
Used:          4.2M / 10M
Resets in:     2h 34m
```

For browser providers:

```
Claude — No API available
Opening https://claude.ai/settings/limits ...
```

For `quota all`, run each provider sequentially with a header separator between them.

---

## Project Structure

```
quota-cli/
├── src/
│   ├── commands/
│   │   ├── quota.ts          # main command: quota <provider>
│   │   └── config.ts         # config command
│   ├── providers/
│   │   ├── index.ts          # provider registry + alias resolution
│   │   ├── base.ts           # abstract Provider class
│   │   ├── zai.ts
│   │   ├── gemini.ts
│   │   ├── github.ts
│   │   ├── claude.ts
│   │   └── cursor.ts
│   └── utils/
│       ├── display.ts        # progress bars, formatting, colors
│       ├── config.ts         # read/write ~/.quota-cli/config.json
│       └── browser.ts        # cross-platform open URL
├── package.json
└── README.md
```

---

## Abstract Provider Interface

Each provider implements:

```ts
interface Provider {
  name: string
  aliases: string[]
  hasApi: boolean
  checkQuota(config: Config): Promise<QuotaResult>
}

type QuotaResult =
  | { type: 'live'; data: LiveData }
  | { type: 'browser'; url: string }
  | { type: 'error'; message: string; fallbackUrl: string }
```

---

## Dependencies

- `@oclif/core` — CLI framework
- `axios` — HTTP requests
- `open` — cross-platform browser opener
- `chalk` — terminal colors
- `inquirer` — interactive prompts for config setup
- `cli-progress` or custom — progress bars

---

## Out of Scope (v1)

- Storing historical usage over time
- Notifications or alerts when quota is low
- Cursor API (doesn't exist yet)
- Claude API (doesn't exist for subscriptions)
- GitHub Copilot API (not documented)
- Encrypting stored API keys

---

## Notes for Claude Code

- The Gemini OAuth flow needs a refresh token stored in config, not just an access token. The `quota config gemini` command should walk through a device auth flow or browser-based OAuth and store the refresh token. On each `quota gemini` run, use the refresh token to get a fresh access token before calling the endpoint.
- The Z.ai endpoint was confirmed working by the open source project `vbgate/opencode-mystatus` — check that repo's source for the exact request shape if the endpoint returns unexpected results.
- Use `open` (npm package) for browser launching — it handles macOS, Linux, and Windows without any additional logic.
- Provider aliases should be resolved in `providers/index.ts` before the command logic runs, so individual provider files never need to handle alias matching.
