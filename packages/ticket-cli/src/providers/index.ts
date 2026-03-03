import { TicketProvider } from './base.js'
import { LinearProvider } from './linear.js'
import { JiraProvider } from './jira.js'
import { GitHubProvider } from './github.js'

// Provider registry
const providers: TicketProvider[] = []

// Initialize providers
function initializeProviders() {
  if (providers.length === 0) {
    providers.push(new LinearProvider())
    providers.push(new JiraProvider())
    providers.push(new GitHubProvider())
  }
}

export function getProviders(): TicketProvider[] {
  initializeProviders()
  return providers
}

export function getProvider(nameOrAlias: string): TicketProvider | null {
  const allProviders = getProviders()
  return allProviders.find(provider => provider.matchesAlias(nameOrAlias)) || null
}

export function getConfiguredProviders(config: any): TicketProvider[] {
  const allProviders = getProviders()
  return allProviders.filter(provider => {
    const providerConfig = config?.providers?.[provider.name]
    return provider.isConfigured(providerConfig || {})
  })
}

// Provider alias mappings from PRD
export const PROVIDER_ALIASES = {
  'linear': 'linear',
  'jira': 'jira',
  'github': 'github',
  'gh': 'github'
} as const

export function resolveProviderAlias(alias: string): string {
  return PROVIDER_ALIASES[alias as keyof typeof PROVIDER_ALIASES] || alias
}