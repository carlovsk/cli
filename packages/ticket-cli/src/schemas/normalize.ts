import { TicketStatus, TicketPriority, TicketType } from './ticket.js'

// Status normalization mappings
export const STATUS_MAPPINGS = {
  // Linear status mappings
  linear: {
    'Backlog': 'backlog' as TicketStatus,
    'Todo': 'todo' as TicketStatus,
    'In Progress': 'in_progress' as TicketStatus,
    'Done': 'done' as TicketStatus,
    'Cancelled': 'cancelled' as TicketStatus
  },
  // Jira status mappings
  jira: {
    'Backlog': 'backlog' as TicketStatus,
    'Open': 'backlog' as TicketStatus,
    'To Do': 'todo' as TicketStatus,
    'Selected for Development': 'todo' as TicketStatus,
    'In Progress': 'in_progress' as TicketStatus,
    'In Review': 'in_progress' as TicketStatus,
    'Done': 'done' as TicketStatus,
    'Closed': 'done' as TicketStatus,
    'Resolved': 'done' as TicketStatus,
    'Cancelled': 'cancelled' as TicketStatus,
    'Won\'t Do': 'cancelled' as TicketStatus
  },
  // GitHub status mappings
  github: {
    'open': 'todo' as TicketStatus,
    'closed': 'done' as TicketStatus
  }
}

// Priority normalization mappings
export const PRIORITY_MAPPINGS = {
  // Linear priority mappings (0-4 numeric values)
  linear: {
    0: 'none' as TicketPriority,
    1: 'urgent' as TicketPriority,
    2: 'high' as TicketPriority,
    3: 'medium' as TicketPriority,
    4: 'low' as TicketPriority
  },
  // Jira priority mappings
  jira: {
    'Highest': 'urgent' as TicketPriority,
    'Blocker': 'urgent' as TicketPriority,
    'High': 'high' as TicketPriority,
    'Critical': 'high' as TicketPriority,
    'Medium': 'medium' as TicketPriority,
    'Low': 'low' as TicketPriority,
    'Lowest': 'low' as TicketPriority
  },
  // GitHub has no native priority - check labels for priority:* pattern
  github: {}
}

// Type normalization mappings
export const TYPE_MAPPINGS = {
  // Linear uses labels for types in most setups
  linear: {
    'Bug': 'bug' as TicketType,
    'Feature': 'feature' as TicketType,
    'Task': 'task' as TicketType,
    'Epic': 'epic' as TicketType,
    'Story': 'story' as TicketType,
    'Subtask': 'subtask' as TicketType
  },
  // Jira issue types
  jira: {
    'Bug': 'bug' as TicketType,
    'Feature': 'feature' as TicketType,
    'Task': 'task' as TicketType,
    'Epic': 'epic' as TicketType,
    'Story': 'story' as TicketType,
    'Sub-task': 'subtask' as TicketType,
    'Subtask': 'subtask' as TicketType
  },
  // GitHub Issues - all are "issue" by default unless labels specify otherwise
  github: {
    'bug': 'bug' as TicketType,
    'enhancement': 'feature' as TicketType,
    'feature': 'feature' as TicketType,
    'task': 'task' as TicketType
  }
}

export function normalizeStatus(provider: string, rawStatus: string): TicketStatus {
  const mappings = STATUS_MAPPINGS[provider as keyof typeof STATUS_MAPPINGS]
  if (mappings && rawStatus in mappings) {
    return mappings[rawStatus as keyof typeof mappings]
  }
  // Best-effort fallback - try to guess from the raw status
  const lowerStatus = rawStatus.toLowerCase()
  if (lowerStatus.includes('progress') || lowerStatus.includes('review')) return 'in_progress'
  if (lowerStatus.includes('done') || lowerStatus.includes('closed') || lowerStatus.includes('resolved')) return 'done'
  if (lowerStatus.includes('cancelled') || lowerStatus.includes('won\'t')) return 'cancelled'
  if (lowerStatus.includes('backlog')) return 'backlog'
  return 'todo' // default fallback
}

export function normalizePriority(provider: string, rawPriority: string | number | null): TicketPriority {
  if (rawPriority === null || rawPriority === undefined) return 'none'

  const mappings = PRIORITY_MAPPINGS[provider as keyof typeof PRIORITY_MAPPINGS]

  if (provider === 'linear' && typeof rawPriority === 'number') {
    return mappings[rawPriority as keyof typeof mappings] || 'none'
  }

  if (mappings && typeof rawPriority === 'string' && rawPriority in mappings) {
    return mappings[rawPriority as keyof typeof mappings]
  }

  return 'none'
}

export function normalizeType(provider: string, rawType: string, labels: string[] = []): TicketType {
  const mappings = TYPE_MAPPINGS[provider as keyof typeof TYPE_MAPPINGS]

  if (mappings && rawType in mappings) {
    return mappings[rawType as keyof typeof mappings]
  }

  // For GitHub, check labels for type hints
  if (provider === 'github') {
    for (const label of labels) {
      const lowerLabel = label.toLowerCase()
      if (lowerLabel === 'bug') return 'bug'
      if (lowerLabel === 'enhancement' || lowerLabel === 'feature') return 'feature'
      if (lowerLabel === 'task') return 'task'
    }
  }

  // Default fallback
  return 'issue'
}

// Extract priority from GitHub labels (priority:high, priority:medium, etc.)
export function extractPriorityFromLabels(labels: string[]): TicketPriority {
  for (const label of labels) {
    const match = label.toLowerCase().match(/^priority:(.+)$/)
    if (match) {
      const priority = match[1]
      if (priority === 'urgent' || priority === 'critical') return 'urgent'
      if (priority === 'high') return 'high'
      if (priority === 'medium') return 'medium'
      if (priority === 'low') return 'low'
    }
  }
  return 'none'
}