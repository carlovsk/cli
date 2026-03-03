import { Command, Args, Flags } from '@oclif/core'
import { getProvider } from '../providers/index.js'
import { loadConfig } from '../utils/config.js'
import { formatWatchOutput } from '../utils/display.js'
import { inferProviderFromTicketKey } from '../utils/infer-provider.js'
import { Ticket } from '../schemas/ticket.js'
import chalk from 'chalk'

export default class Watch extends Command {
  static override description = 'Watch a ticket and notify when it changes'

  static override examples = [
    '$ ticket watch KOR-123',
    '$ ticket watch lin_abc123 --interval 60',
    '$ ticket watch PROJ-456 --provider jira',
  ]

  static override args = {
    ticketId: Args.string({
      description: 'Ticket ID or key to watch',
      required: true,
    }),
  }

  static override flags = {
    provider: Flags.string({
      char: 'p',
      description: 'Specify provider if ticket ID is ambiguous',
    }),
    interval: Flags.integer({
      char: 'i',
      description: 'Poll interval in seconds',
      default: 30,
    }),
  }

  private isWatching = true

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Watch)
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

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.isWatching = false
      this.log('\nStopped watching.')
      process.exit(0)
    })

    this.log(`Watching ${chalk.bold(args.ticketId)} (every ${flags.interval}s)... press Ctrl+C to stop\n`)

    let previousTicket: Ticket | null = null

    while (this.isWatching) {
      try {
        const currentTicket = await provider.getTicket(args.ticketId, providerConfig)

        if (previousTicket) {
          this.checkForChanges(previousTicket, currentTicket)
        } else {
          // First fetch - show initial state
          this.log(`Initial state: ${chalk.bold(currentTicket.key)} - ${currentTicket.status} (${currentTicket.assignee || 'unassigned'})`)
        }

        previousTicket = currentTicket

        // Wait for the specified interval
        await this.sleep(flags.interval * 1000)
      } catch (error) {
        this.warn(`Error fetching ticket: ${error}`)
        await this.sleep(flags.interval * 1000)
      }
    }
  }

  private checkForChanges(previous: Ticket, current: Ticket): void {
    const fieldsToWatch = [
      { key: 'status', label: 'status' },
      { key: 'assignee', label: 'assignee' },
      { key: 'priority', label: 'priority' },
      { key: 'labels', label: 'labels' },
    ]

    for (const field of fieldsToWatch) {
      const oldValue = previous[field.key as keyof Ticket]
      const newValue = current[field.key as keyof Ticket]

      // Special handling for arrays (labels)
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          formatWatchOutput(
            current.key,
            field.label,
            oldValue.join(', ') || '—',
            newValue.join(', ') || '—'
          )
        }
      } else if (oldValue !== newValue) {
        formatWatchOutput(
          current.key,
          field.label,
          oldValue || '—',
          newValue || '—'
        )
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}