import { Command, Flags } from '@oclif/core'
import { getProvider, getConfiguredProviders } from '../providers/index.js'
import { loadConfig } from '../utils/config.js'
import { formatStandupText, formatStandupMarkdown } from '../utils/display.js'
import { parseRelativeDate } from '../utils/date.js'
import { Ticket } from '../schemas/ticket.js'

export default class Standup extends Command {
  static override description = 'Generate a standup summary from recent ticket activity'

  static override examples = [
    '$ ticket standup',
    '$ ticket standup --since yesterday',
    '$ ticket standup --since "3 days ago"',
    '$ ticket standup --provider linear',
    '$ ticket standup --assignee john.doe',
    '$ ticket standup --output markdown',
  ]

  static override flags = {
    provider: Flags.string({
      char: 'p',
      description: 'Filter to a single provider (linear, jira, github)',
    }),
    since: Flags.string({
      char: 's',
      description: 'Time range for activity (yesterday, "last week", "3 days ago", ISO date)',
      default: 'yesterday',
    }),
    assignee: Flags.string({
      char: 'a',
      description: 'Filter by assignee',
      default: 'me',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['text', 'json', 'markdown'],
      default: 'text',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Standup)
    const config = loadConfig()

    let since: Date
    try {
      since = parseRelativeDate(flags.since)
    } catch (error) {
      this.error(`Invalid date format: ${flags.since}. ${error}`)
    }

    let providers: any[] = []

    if (flags.provider) {
      const provider = getProvider(flags.provider)
      if (!provider) {
        this.error(`Unknown provider: ${flags.provider}. Available providers: linear, jira, github`)
      }

      const providerConfig = config.providers[provider.name as keyof typeof config.providers]
      if (!provider.isConfigured(providerConfig || {})) {
        this.error(`Provider ${provider.name} is not configured. Run: ticket auth add ${provider.name}`)
      }

      providers = [{ provider, config: providerConfig }]
    } else {
      // Get all configured providers
      const configuredProviders = getConfiguredProviders(config)
      if (configuredProviders.length === 0) {
        this.error('No providers configured. Run: ticket auth add <provider>')
      }

      providers = configuredProviders.map(provider => ({
        provider,
        config: config.providers[provider.name as keyof typeof config.providers]
      }))
    }

    const options = {
      since,
      assignee: flags.assignee,
    }

    try {
      const allTickets: Ticket[] = []

      for (const { provider, config: providerConfig } of providers) {
        try {
          const tickets = await provider.getRecentActivity(options, providerConfig)
          allTickets.push(...tickets)
        } catch (error) {
          this.warn(`Failed to fetch activity from ${provider.name}: ${error}`)
        }
      }

      // Sort by updated date (newest first)
      allTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      if (flags.output === 'json') {
        this.log(JSON.stringify(allTickets, null, 2))
      } else if (flags.output === 'markdown') {
        const markdown = formatStandupMarkdown(allTickets, since)
        this.log(markdown)
      } else {
        formatStandupText(allTickets, since)
      }
    } catch (error) {
      this.error(`Failed to generate standup: ${error}`)
    }
  }
}