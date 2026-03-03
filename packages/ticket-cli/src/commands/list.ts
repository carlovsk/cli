import { Command, Flags } from '@oclif/core'
import { getProvider, getConfiguredProviders } from '../providers/index.js'
import { loadConfig } from '../utils/config.js'
import { formatTicketTable } from '../utils/display.js'
import { Ticket } from '../schemas/ticket.js'

export default class List extends Command {
  static override description = 'List tickets from one or all configured providers'

  static override examples = [
    '$ ticket list',
    '$ ticket list --provider linear',
    '$ ticket list --status in_progress',
    '$ ticket list --assignee me',
    '$ ticket list --output json',
    '$ ticket list --limit 20',
  ]

  static override flags = {
    provider: Flags.string({
      char: 'p',
      description: 'Filter to a single provider (linear, jira, github)',
    }),
    status: Flags.string({
      char: 's',
      description: 'Filter by status (backlog, todo, in_progress, done, cancelled)',
    }),
    assignee: Flags.string({
      char: 'a',
      description: 'Filter by assignee (use "me" for current user)',
    }),
    type: Flags.string({
      char: 't',
      description: 'Filter by type (issue, bug, feature, epic, task, story, subtask)',
    }),
    project: Flags.string({
      description: 'Filter by project name',
    }),
    team: Flags.string({
      description: 'Filter by team name',
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'Maximum number of results per provider',
      default: 50,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json'],
      default: 'table',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(List)
    const config = loadConfig()

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
      status: flags.status,
      assignee: flags.assignee,
      type: flags.type,
      project: flags.project,
      team: flags.team,
      limit: flags.limit,
    }

    try {
      const allTickets: Ticket[] = []

      for (const { provider, config: providerConfig } of providers) {
        try {
          const tickets = await provider.listTickets(options, providerConfig)
          allTickets.push(...tickets)
        } catch (error) {
          this.warn(`Failed to fetch tickets from ${provider.name}: ${error}`)
        }
      }

      // Sort by updated date (newest first)
      allTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      if (flags.output === 'json') {
        this.log(JSON.stringify(allTickets, null, 2))
      } else {
        formatTicketTable(allTickets)
      }
    } catch (error) {
      this.error(`Failed to list tickets: ${error}`)
    }
  }
}