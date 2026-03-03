import { Command, Args, Flags } from '@oclif/core'
import { getProvider } from '../providers/index.js'
import { loadConfig } from '../utils/config.js'
import { formatTicketDetails } from '../utils/display.js'
import { inferProviderFromTicketKey } from '../utils/infer-provider.js'

export default class Get extends Command {
  static override description = 'Get details for a specific ticket'

  static override examples = [
    '$ ticket get KOR-123',
    '$ ticket get lin_abc123',
    '$ ticket get org/repo#456',
    '$ ticket get PROJ-789 --provider jira',
    '$ ticket get KOR-123 --output json',
  ]

  static override args = {
    ticketId: Args.string({
      description: 'Ticket ID or key (e.g., KOR-123, lin_abc123, org/repo#456)',
      required: true,
    }),
  }

  static override flags = {
    provider: Flags.string({
      char: 'p',
      description: 'Specify provider if ticket ID is ambiguous',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json'],
      default: 'table',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Get)
    const config = loadConfig()

    let providerName = flags.provider

    // If no provider specified, try to infer from ticket key
    if (!providerName) {
      const inferred = inferProviderFromTicketKey(args.ticketId)
      if (inferred) {
        providerName = inferred
      } else {
        this.error(
          `Cannot determine provider for ticket: ${args.ticketId}. ` +
          `Please specify with --provider flag.`
        )
      }
    }

    const provider = getProvider(providerName)
    if (!provider) {
      this.error(`Unknown provider: ${providerName}. Available providers: linear, jira, github`)
    }

    const providerConfig = config.providers[provider.name as keyof typeof config.providers]
    if (!provider.isConfigured(providerConfig || {})) {
      this.error(`Provider ${provider.name} is not configured. Run: ticket auth add ${provider.name}`)
    }

    try {
      const ticket = await provider.getTicket(args.ticketId, providerConfig)

      if (flags.output === 'json') {
        this.log(JSON.stringify(ticket, null, 2))
      } else {
        formatTicketDetails(ticket)
      }
    } catch (error) {
      this.error(`Failed to get ticket: ${error}`)
    }
  }
}