import axios, { AxiosInstance } from 'axios'
import { TicketProvider, ProviderConfig, ListOptions, StandupOptions, AuthResult } from './base.js'
import { Ticket, TicketTree } from '../schemas/ticket.js'
import { normalizeStatus, normalizePriority, normalizeType } from '../schemas/normalize.js'

interface JiraIssue {
  id: string
  key: string
  self: string
  fields: {
    summary: string
    description?: {
      type: string
      version: number
      content: any[]
    } | string | null
    status: {
      name: string
      statusCategory: {
        name: string
      }
    }
    assignee?: {
      displayName: string
      emailAddress: string
    } | null
    reporter: {
      displayName: string
      emailAddress: string
    }
    priority?: {
      name: string
    } | null
    issuetype: {
      name: string
      subtask: boolean
    }
    labels: string[]
    project: {
      key: string
      name: string
    }
    parent?: {
      id: string
      key: string
      fields: {
        summary: string
      }
    }
    subtasks?: Array<{
      id: string
      key: string
      fields: {
        summary: string
        status: {
          name: string
        }
      }
    }>
    created: string
    updated: string
    resolutiondate?: string | null
  }
}

interface JiraConfig {
  domain: string
  email: string
  apiToken: string
}

export class JiraProvider extends TicketProvider {
  name = 'jira'
  aliases = ['jira']

  private client?: AxiosInstance

  private getClient(config: JiraConfig): AxiosInstance {
    if (!this.client) {
      const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')

      this.client = axios.create({
        baseURL: `https://${config.domain}/rest/api/3`,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      })
    }
    return this.client
  }

  isConfigured(config: ProviderConfig): boolean {
    const jiraConfig = config as JiraConfig
    return !!(jiraConfig?.domain && jiraConfig?.email && jiraConfig?.apiToken)
  }

  async authenticate(config: ProviderConfig): Promise<AuthResult> {
    try {
      const jiraConfig = config as JiraConfig
      const client = this.getClient(jiraConfig)

      const response = await client.get('/myself')
      return {
        valid: true,
        user: response.data.displayName
      }
    } catch (error) {
      return {
        valid: false,
        user: ''
      }
    }
  }

  async listTickets(options: ListOptions, config?: ProviderConfig): Promise<Ticket[]> {
    if (!config) throw new Error('Jira configuration required')

    const jiraConfig = config as JiraConfig
    const client = this.getClient(jiraConfig)

    const jql = this.buildJQL(options)
    const fields = [
      'summary',
      'description',
      'status',
      'assignee',
      'reporter',
      'priority',
      'issuetype',
      'labels',
      'project',
      'parent',
      'created',
      'updated',
      'resolutiondate'
    ]

    try {
      // Try the new JQL endpoint first
      const response = await client.post('/search/jql', {
        jql,
        fields,
        maxResults: options.limit
      })

      return response.data.issues.map((issue: JiraIssue) => this.convertToTicket(issue, jiraConfig.domain))
    } catch (error) {
      // Fallback to the older endpoint if JQL endpoint fails
      const response = await client.post('/search', {
        jql,
        fields,
        maxResults: options.limit,
        startAt: 0
      })

      return response.data.issues.map((issue: JiraIssue) => this.convertToTicket(issue, jiraConfig.domain))
    }
  }

  async getTicket(id: string, config?: ProviderConfig): Promise<Ticket> {
    if (!config) throw new Error('Jira configuration required')

    const jiraConfig = config as JiraConfig
    const client = this.getClient(jiraConfig)

    const fields = [
      'summary',
      'description',
      'status',
      'assignee',
      'reporter',
      'priority',
      'issuetype',
      'labels',
      'project',
      'parent',
      'subtasks',
      'created',
      'updated',
      'resolutiondate'
    ]

    const response = await client.get(`/issue/${id}?fields=${fields.join(',')}`)
    return this.convertToTicket(response.data, jiraConfig.domain)
  }

  async getTicketTree(id: string, config?: ProviderConfig): Promise<TicketTree> {
    if (!config) throw new Error('Jira configuration required')

    const jiraConfig = config as JiraConfig
    const client = this.getClient(jiraConfig)

    const ticket = await this.getTicket(id, config)
    const children = await this.getChildren(ticket, client, jiraConfig.domain)

    return {
      ...ticket,
      children
    }
  }

  async getRecentActivity(options: StandupOptions, config?: ProviderConfig): Promise<Ticket[]> {
    if (!config) throw new Error('Jira configuration required')

    const jiraConfig = config as JiraConfig
    const client = this.getClient(jiraConfig)

    const sinceDate = options.since.toISOString().split('T')[0] // YYYY-MM-DD format

    let assigneeClause = ''
    if (options.assignee === 'me') {
      assigneeClause = 'assignee = currentUser()'
    } else {
      assigneeClause = `assignee = "${options.assignee}"`
    }

    const jql = `${assigneeClause} AND updated >= "${sinceDate}" ORDER BY updated DESC`

    const fields = [
      'summary',
      'description',
      'status',
      'assignee',
      'reporter',
      'priority',
      'issuetype',
      'labels',
      'project',
      'parent',
      'created',
      'updated',
      'resolutiondate'
    ]

    try {
      const response = await client.post('/search/jql', {
        jql,
        fields,
        maxResults: 100
      })

      return response.data.issues.map((issue: JiraIssue) => this.convertToTicket(issue, jiraConfig.domain))
    } catch (error) {
      // Fallback to older endpoint
      const response = await client.post('/search', {
        jql,
        fields,
        maxResults: 100,
        startAt: 0
      })

      return response.data.issues.map((issue: JiraIssue) => this.convertToTicket(issue, jiraConfig.domain))
    }
  }

  private async getChildren(parent: Ticket, client: AxiosInstance, domain: string): Promise<TicketTree[]> {
    const children: TicketTree[] = []

    // Get subtasks
    if (parent.raw && (parent.raw as any).fields.subtasks) {
      const subtasks = (parent.raw as any).fields.subtasks
      for (const subtask of subtasks) {
        const subtaskTicket = await this.getTicket(subtask.key, { domain, email: '', apiToken: '' })
        const subtaskChildren = await this.getChildren(subtaskTicket, client, domain)
        children.push({
          ...subtaskTicket,
          children: subtaskChildren
        })
      }
    }

    // For epics, get issues linked to this epic
    if (parent.type === 'epic') {
      try {
        const jql = `"Epic Link" = ${parent.key}`
        const response = await client.post('/search', {
          jql,
          fields: ['summary', 'status', 'assignee', 'issuetype'],
          maxResults: 50
        })

        for (const issue of response.data.issues) {
          const childTicket = this.convertToTicket(issue, domain)
          const childChildren = await this.getChildren(childTicket, client, domain)
          children.push({
            ...childTicket,
            children: childChildren
          })
        }
      } catch (error) {
        // Epic Link field might not exist in all Jira instances
      }
    }

    return children
  }

  private buildJQL(options: ListOptions): string {
    const clauses: string[] = []

    if (options.status) {
      clauses.push(`status = "${options.status}"`)
    }

    if (options.assignee) {
      if (options.assignee === 'me') {
        clauses.push('assignee = currentUser()')
      } else {
        clauses.push(`assignee = "${options.assignee}"`)
      }
    }

    if (options.project) {
      clauses.push(`project = "${options.project}"`)
    }

    if (options.type) {
      clauses.push(`issuetype = "${options.type}"`)
    }

    let jql = clauses.length > 0 ? clauses.join(' AND ') : ''
    if (!jql) {
      jql = 'order by updated DESC'
    } else {
      jql += ' ORDER BY updated DESC'
    }

    return jql
  }

  private convertToTicket(issue: JiraIssue, domain: string): Ticket {
    const fields = issue.fields
    const statusRaw = fields.status.name
    const typeRaw = fields.issuetype.name

    // Extract description text
    let description: string | null = null
    if (fields.description) {
      if (typeof fields.description === 'string') {
        description = fields.description
      } else if (fields.description.content) {
        // Extract text from Atlassian Document Format
        description = this.extractTextFromADF(fields.description.content)
      }
    }

    return {
      id: issue.id,
      key: issue.key,
      title: fields.summary,
      description,
      status: normalizeStatus('jira', statusRaw),
      statusRaw,
      type: normalizeType('jira', typeRaw, fields.labels),
      typeRaw,
      priority: normalizePriority('jira', fields.priority?.name || null),
      priorityRaw: fields.priority?.name || null,
      assignee: fields.assignee?.displayName || null,
      reporter: fields.reporter.displayName,
      labels: fields.labels,
      project: fields.project.name,
      team: fields.project.key,
      epic: fields.parent?.key || null,
      url: `https://${domain}/browse/${issue.key}`,
      createdAt: fields.created,
      updatedAt: fields.updated,
      closedAt: fields.resolutiondate || null,
      provider: 'jira',
      raw: issue as unknown as Record<string, unknown>
    }
  }

  private extractTextFromADF(content: any[]): string {
    let text = ''
    for (const node of content) {
      if (node.type === 'paragraph' && node.content) {
        for (const textNode of node.content) {
          if (textNode.type === 'text' && textNode.text) {
            text += textNode.text
          }
        }
        text += '\n'
      } else if (node.type === 'text' && node.text) {
        text += node.text
      }
    }
    return text.trim()
  }
}