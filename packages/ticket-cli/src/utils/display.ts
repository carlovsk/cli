import Table from 'cli-table3'
import chalk from 'chalk'
import { Ticket, TicketTree, TicketStatus } from '../schemas/ticket.js'
import { formatRelativeTime } from './date.js'

// Status colors according to PRD
export function getStatusColor(status: TicketStatus): (text: string) => string {
  switch (status) {
    case 'in_progress':
      return chalk.yellow
    case 'done':
      return chalk.green
    case 'todo':
      return chalk.white
    case 'cancelled':
      return chalk.red
    case 'backlog':
      return chalk.gray
    default:
      return chalk.white
  }
}

// Status indicators for tree view
export function getStatusIndicator(status: TicketStatus): string {
  switch (status) {
    case 'done':
      return '✓'
    case 'in_progress':
      return '●'
    case 'todo':
    case 'backlog':
      return '○'
    case 'cancelled':
      return '✗'
    default:
      return '○'
  }
}

export function formatTicketTable(tickets: Ticket[]): void {
  if (tickets.length === 0) {
    console.log('No tickets found.')
    return
  }

  const table = new Table({
    head: [
      chalk.bold('Provider'),
      chalk.bold('Key'),
      chalk.bold('Status'),
      chalk.bold('Type'),
      chalk.bold('Priority'),
      chalk.bold('Assignee'),
      chalk.bold('Title')
    ],
    colWidths: [10, 15, 15, 10, 10, 15, 50],
    wordWrap: true
  })

  tickets.forEach(ticket => {
    const statusColor = getStatusColor(ticket.status as TicketStatus)
    table.push([
      ticket.provider,
      ticket.key,
      statusColor(ticket.status),
      ticket.type,
      ticket.priority,
      ticket.assignee || '—',
      ticket.title.length > 45 ? ticket.title.substring(0, 42) + '...' : ticket.title
    ])
  })

  console.log(table.toString())
}

export function formatTicketDetails(ticket: Ticket): void {
  const statusColor = getStatusColor(ticket.status as TicketStatus)

  console.log(`
┌─────────────────────────────────────────┐
│  ${chalk.bold(ticket.key)} · ${ticket.title}            │
│  ${chalk.cyan(ticket.provider)} · ${statusColor(ticket.status)} · ${ticket.priority} priority   │
├─────────────────────────────────────────┤
│  Type:      ${ticket.type}                        │
│  Assignee:  ${ticket.assignee || '—'}                │
│  Reporter:  ${ticket.reporter || '—'}                │
│  Project:   ${ticket.project || '—'}    │
│  Team:      ${ticket.team || '—'}                 │
│  Labels:    ${ticket.labels.join(', ') || '—'}            │
│  Created:   ${ticket.createdAt}        │
│  Updated:   ${ticket.updatedAt}        │
│  URL:       ${chalk.blue(ticket.url)}      │
├─────────────────────────────────────────┤
│  Description:                           │
│  ${ticket.description || 'No description'}                       │
└─────────────────────────────────────────┘
`)
}

export function formatTicketTree(tree: TicketTree, indent: string = '', isLast: boolean = true): void {
  const statusColor = getStatusColor(tree.status as TicketStatus)
  const indicator = getStatusIndicator(tree.status as TicketStatus)

  const prefix = indent + (isLast ? '└── ' : '├── ')
  const title = tree.title.length > 60 ? tree.title.substring(0, 57) + '...' : tree.title

  console.log(`${prefix}${statusColor(indicator)} ${chalk.bold(tree.key)} [${tree.type}] ${title} (${statusColor(tree.status)})`)

  tree.children.forEach((child, index) => {
    const childIndent = indent + (isLast ? '    ' : '│   ')
    const isLastChild = index === tree.children.length - 1
    formatTicketTree(child, childIndent, isLastChild)
  })
}

export function formatStandupText(tickets: Ticket[], since: Date): void {
  const completed = tickets.filter(t => t.status === 'done' || t.status === 'cancelled')
  const inProgress = tickets.filter(t => t.status === 'in_progress')
  const newTickets = tickets.filter(t => new Date(t.createdAt) >= since && t.status !== 'done' && t.status !== 'cancelled')

  console.log(`${chalk.bold('Standup')} — ${new Date().toLocaleDateString()}`)
  console.log(`Since: ${formatRelativeTime(since)}`)
  console.log()

  if (completed.length > 0) {
    console.log(`${chalk.green('✅ Completed')} (${completed.length})`)
    completed.forEach(ticket => {
      console.log(`  ${chalk.bold(ticket.key)}  ${ticket.title.padEnd(50)}  ${chalk.gray(ticket.provider)}`)
    })
    console.log()
  }

  if (inProgress.length > 0) {
    console.log(`${chalk.yellow('🔄 In Progress')} (${inProgress.length})`)
    inProgress.forEach(ticket => {
      console.log(`  ${chalk.bold(ticket.key)}  ${ticket.title.padEnd(50)}  ${chalk.gray(ticket.provider)}`)
    })
    console.log()
  }

  if (newTickets.length > 0) {
    console.log(`${chalk.blue('📥 New')} (${newTickets.length})`)
    newTickets.forEach(ticket => {
      console.log(`  ${chalk.bold(ticket.key)}  ${ticket.title.padEnd(50)}  ${chalk.gray(ticket.provider)}`)
    })
    console.log()
  }

  if (completed.length === 0 && inProgress.length === 0 && newTickets.length === 0) {
    console.log(chalk.gray('No activity found for the specified time period.'))
  }
}

export function formatStandupMarkdown(tickets: Ticket[], since: Date): string {
  const completed = tickets.filter(t => t.status === 'done' || t.status === 'cancelled')
  const inProgress = tickets.filter(t => t.status === 'in_progress')
  const newTickets = tickets.filter(t => new Date(t.createdAt) >= since && t.status !== 'done' && t.status !== 'cancelled')

  let markdown = `## Standup — ${new Date().toLocaleDateString()}\n\n`

  if (completed.length > 0) {
    markdown += '### ✅ Completed\n'
    completed.forEach(ticket => {
      markdown += `- [${ticket.key}](${ticket.url}) ${ticket.title}\n`
    })
    markdown += '\n'
  }

  if (inProgress.length > 0) {
    markdown += '### 🔄 In Progress\n'
    inProgress.forEach(ticket => {
      markdown += `- [${ticket.key}](${ticket.url}) ${ticket.title}\n`
    })
    markdown += '\n'
  }

  if (newTickets.length > 0) {
    markdown += '### 📥 New\n'
    newTickets.forEach(ticket => {
      markdown += `- [${ticket.key}](${ticket.url}) ${ticket.title}\n`
    })
    markdown += '\n'
  }

  return markdown
}

export function formatAuthList(providers: Array<{ name: string; status: string; user: string | null }>): void {
  const table = new Table({
    head: [chalk.bold('Provider'), chalk.bold('Status'), chalk.bold('User')],
    colWidths: [12, 16, 30]
  })

  providers.forEach(provider => {
    const statusText = provider.status === 'connected'
      ? chalk.green('✓ connected')
      : chalk.red('✗ not configured')

    table.push([
      provider.name,
      statusText,
      provider.user || '—'
    ])
  })

  console.log(table.toString())
}

export function formatWatchOutput(ticketKey: string, field: string, oldValue: any, newValue: any): void {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${chalk.gray(timestamp)}] ${chalk.bold(ticketKey)} ${field}: ${chalk.red(oldValue)} → ${chalk.green(newValue)}`)
}