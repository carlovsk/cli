import { Command } from '@oclif/core'
import { getProviders } from '../../providers/index.js'
import { loadConfig, maskCredentials } from '../../utils/config.js'
import { formatAuthList } from '../../utils/display.js'

export default class AuthList extends Command {
  static override description = 'List all configured providers with connection status'

  static override examples = [
    '$ ticket auth list',
  ]

  public async run(): Promise<void> {
    const config = loadConfig()
    const providers = getProviders()

    const providerStatuses = await Promise.all(
      providers.map(async (provider) => {
        const providerConfig = config.providers[provider.name as keyof typeof config.providers]

        if (!provider.isConfigured(providerConfig || {})) {
          return {
            name: provider.name,
            status: 'not configured',
            user: null,
          }
        }

        try {
          const authResult = await provider.authenticate(providerConfig || {})
          return {
            name: provider.name,
            status: authResult.valid ? 'connected' : 'invalid',
            user: authResult.valid ? authResult.user : null,
          }
        } catch (error) {
          return {
            name: provider.name,
            status: 'error',
            user: null,
          }
        }
      })
    )

    formatAuthList(providerStatuses)
  }
}