export interface Ticket {
  id: string                    // provider's native ID
  key: string                   // human-readable key (e.g. "KOR-123", "PROJ-456", "org/repo#78")
  title: string                 // issue title / summary
  description: string | null    // markdown body
  status: string                // normalized: "backlog" | "todo" | "in_progress" | "done" | "cancelled"
  statusRaw: string             // provider's original status name (e.g. "In Review", "Closed")
  type: string                  // normalized: "issue" | "bug" | "feature" | "epic" | "task" | "story" | "subtask"
  typeRaw: string               // provider's original type name
  priority: string              // normalized: "urgent" | "high" | "medium" | "low" | "none"
  priorityRaw: string | null    // provider's original priority
  assignee: string | null       // display name of assignee
  reporter: string | null       // display name of creator/reporter
  labels: string[]              // label names
  project: string | null        // project name (Linear project, Jira project, GitHub repo)
  team: string | null           // team name (Linear team, Jira project key, GitHub org)
  epic: string | null           // parent epic key if applicable
  url: string                   // direct URL to the ticket in the browser
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601
  closedAt: string | null       // ISO 8601
  provider: string              // "linear" | "jira" | "github"
  raw: Record<string, unknown>  // full original response from the provider API
}

export interface TicketTree extends Ticket {
  children: TicketTree[]
}

export type TicketStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TicketType = 'issue' | 'bug' | 'feature' | 'epic' | 'task' | 'story' | 'subtask'
export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
export type ProviderName = 'linear' | 'jira' | 'github'