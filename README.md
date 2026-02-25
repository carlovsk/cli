# CLI Tools Monorepo

This is a monorepo containing various CLI tools.

## Packages

- [`rr`](./packages/rr) - CLI tool for orchestrating development tasks across microservices monorepo
- [`quota-cli`](./packages/quota) - TypeScript CLI tool that checks AI tool quota/usage across multiple providers

## Development

Install dependencies:
```bash
npm install
```

Build all packages:
```bash
npm run build
```

Run tests for all packages:
```bash
npm run test
```

Run typecheck for all packages:
```bash
npm run typecheck
```

## Adding New CLI Tools

1. Create a new directory under `packages/` for your tool
2. Initialize it as a npm package with `npm init`
3. The root workspace will automatically include it