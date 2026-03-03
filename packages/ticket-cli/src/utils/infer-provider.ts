import { ProviderName } from '../schemas/ticket.js'

export function inferProviderFromTicketKey(ticketKey: string): ProviderName | null {
  // GitHub format: org/repo#number (e.g., "facebook/react#123")
  if (ticketKey.includes('/') && ticketKey.includes('#')) {
    return 'github'
  }

  // Linear format: typically starts with lin_ for IDs or has specific pattern for identifiers
  if (ticketKey.startsWith('lin_')) {
    return 'linear'
  }

  // Linear identifier pattern: usually 3-4 letters followed by dash and number (e.g., KOR-123, PROJ-456)
  if (/^[A-Z]{2,4}-\d+$/.test(ticketKey)) {
    // This could be either Linear or Jira - we'll need additional context
    // For now, let's default to Jira as it's more common for this format
    return 'jira'
  }

  // If none match, return null - caller will need to specify provider
  return null
}

export function validateTicketKeyFormat(ticketKey: string, provider: ProviderName): boolean {
  switch (provider) {
    case 'github':
      return ticketKey.includes('/') && ticketKey.includes('#')

    case 'linear':
      // Can be either lin_xxx format or identifier format
      return ticketKey.startsWith('lin_') || /^[A-Z]{2,4}-\d+$/.test(ticketKey)

    case 'jira':
      // Usually project-number format
      return /^[A-Z]{2,10}-\d+$/.test(ticketKey)

    default:
      return false
  }
}

export function extractTicketNumber(ticketKey: string, provider: ProviderName): string {
  switch (provider) {
    case 'github':
      const match = ticketKey.match(/#(\d+)$/)
      return match ? match[1] : ticketKey

    case 'linear':
    case 'jira':
      // For both Linear and Jira, the key itself is what we use
      return ticketKey

    default:
      return ticketKey
  }
}

export function extractRepoFromGitHubKey(ticketKey: string): { owner: string; repo: string; number: string } | null {
  const match = ticketKey.match(/^([^/]+)\/([^#]+)#(\d+)$/)
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      number: match[3]
    }
  }
  return null
}