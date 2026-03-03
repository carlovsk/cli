import { Command, Args, Flags } from '@oclif/core'
import { getProvider } from '../providers/index.js'
import { loadConfig } from '../utils/config.js'
import { formatTicketTree } from '../utils/display.js'
import { inferProviderFromTicketKey } from '../utils/infer-provider.js'

export default class Tree extends Command {
  static override description = 'Display the full hierarchy of a ticket (Epic → Stories → Subtasks)'

  static override examples = [
    '$ ticket tree KOR-123',
    '$ ticket tree lin_epic123',
    '$ ticket tree PROJ-100 --provider jira',
    '$ ticket tree KOR-123 --output json',
  ]

  static override args = {
    ticketId: Args.string({
      description: 'Ticket ID or key for the root of the tree',
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
      options: ['tree', 'json'],
      default: 'tree',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Tree)
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
      const ticketTree = await provider.getTicketTree(args.ticketId, providerConfig)

      if (flags.output === 'json') {
        this.log(JSON.stringify(ticketTree, null, 2))
      } else {
        formatTicketTree(ticketTree)
      }
    } catch (error) {
      this.error(`Failed to get ticket tree: ${error}`)
    }
  }
}