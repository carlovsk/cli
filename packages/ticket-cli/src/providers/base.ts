import { Ticket, TicketTree } from '../schemas/ticket.js'

export interface ProviderConfig {
  [key: string]: any
}

export interface ListOptions {
  status?: string
  assignee?: string
  type?: string
  project?: string
  team?: string
  limit: number
}

export interface StandupOptions {
  since: Date
  assignee: string  // "me" or username
}

export interface AuthResult {
  valid: boolean
  user: string
}

export abstract class TicketProvider {
  abstract name: string
  abstract aliases: string[]

  // Auth
  abstract authenticate(config: ProviderConfig): Promise<AuthResult>

  // Read
  abstract listTickets(options: ListOptions, config?: ProviderConfig): Promise<Ticket[]>
  abstract getTicket(id: string, config?: ProviderConfig): Promise<Ticket>
  abstract getTicketTree(id: string, config?: ProviderConfig): Promise<TicketTree>

  // Standup
  abstract getRecentActivity(options: StandupOptions, config?: ProviderConfig): Promise<Ticket[]>

  // Helper method to check if this provider matches an alias
  matchesAlias(alias: string): boolean {
    return this.aliases.includes(alias.toLowerCase()) || this.name.toLowerCase() === alias.toLowerCase()
  }

  // Helper method to check if provider is configured
  abstract isConfigured(config: ProviderConfig): boolean
}