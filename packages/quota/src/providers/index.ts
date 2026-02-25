import { Provider } from '../types';
import { ZaiProvider } from './zai';
import { GeminiProvider } from './gemini';
import { GitHubProvider } from './github';
import { ClaudeProvider } from './claude';
import { CursorProvider } from './cursor';

const providers: Provider[] = [
  new ZaiProvider(),
  new GeminiProvider(),
  new GitHubProvider(),
  new ClaudeProvider(),
  new CursorProvider()
];

export function getAllProviders(): Provider[] {
  return providers;
}

export function getProvider(input: string): Provider | null {
  const normalizedInput = input.toLowerCase();

  // Direct name match
  for (const provider of providers) {
    if (provider.name.toLowerCase() === normalizedInput) {
      return provider;
    }
  }

  // Alias match
  for (const provider of providers) {
    if (provider.aliases.includes(normalizedInput)) {
      return provider;
    }
  }

  return null;
}

export function getSupportedProviders(): string[] {
  return providers.map(p => p.name);
}

export function getProviderAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};

  for (const provider of providers) {
    for (const alias of provider.aliases) {
      aliases[alias] = provider.name;
    }
  }

  return aliases;
}