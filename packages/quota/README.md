# quota-cli

A TypeScript CLI tool built with oclif that checks AI tool quota/usage across multiple providers. For providers with APIs, it fetches live data. For providers without APIs, it opens the correct dashboard URL in the browser.

## Installation

```bash
npm install -g .
```

## Usage

```bash
# Check specific provider
quota zai
quota gemini
quota claude
quota github
quota cursor

# Check all providers
quota all

# Configure API keys
quota config zai
quota config gemini

# Show current configuration
quota config
quota config --show
```

## Supported Providers

| Provider | Aliases | API Support | Dashboard URL |
|----------|---------|-------------|---------------|
| Z.ai | `zai`, `z.ai` | ✅ Live API | https://bigmodel.cn/usercenter/apikeys |
| Google Gemini | `gemini`, `google` | ✅ OAuth API | https://makersuite.google.com/app/apikey |
| GitHub Copilot | `github`, `copilot` | ❌ Browser only | https://github.com/settings/copilot |
| Claude | `claude`, `anthropic` | ❌ Browser only | https://claude.ai/settings/limits |
| Cursor | `cursor` | ❌ Browser only | https://cursor.com/settings |

## Configuration

Configuration is stored at `~/.quota-cli/config.json`. API keys are stored in plain text (encryption planned for future versions).

### Z.ai Configuration

Get your API key from https://bigmodel.cn/usercenter/apikeys and configure it:

```bash
quota config zai
```

### Gemini Configuration

OAuth setup for Gemini is complex and requires additional configuration. The current implementation expects a refresh token:

```bash
quota config gemini
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run locally
./bin/run quota claude

# Run with development watch
npm run dev
```

## Project Structure

```
src/
├── commands/
│   ├── quota.ts          # main command: quota <provider>
│   └── config.ts         # config command
├── providers/
│   ├── index.ts          # provider registry + alias resolution
│   ├── base.ts           # abstract Provider class
│   ├── zai.ts            # Z.ai API implementation
│   ├── gemini.ts         # Google Gemini OAuth implementation
│   ├── github.ts         # GitHub Copilot (browser-only)
│   ├── claude.ts         # Claude (browser-only)
│   └── cursor.ts         # Cursor (browser-only)
└── utils/
    ├── display.ts        # progress bars, formatting, colors
    ├── config.ts         # read/write ~/.quota-cli/config.json
    └── browser.ts        # cross-platform open URL
```

## Notes

- The Z.ai endpoint was confirmed working by the open source project `vbgate/opencode-mystatus`
- Gemini OAuth implementation needs a proper OAuth flow (currently expects manual refresh token)
- Browser providers automatically open the respective dashboard URLs
- Progress bars and quota displays are formatted for terminal output