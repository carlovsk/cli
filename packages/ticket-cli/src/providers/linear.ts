import { GraphQLClient, gql } from 'graphql-request'
import { TicketProvider, ProviderConfig, ListOptions, StandupOptions, AuthResult } from './base.js'
import { Ticket, TicketTree } from '../schemas/ticket.js'
import { normalizeStatus, normalizePriority, normalizeType } from '../schemas/normalize.js'

interface LinearIssue {
  id: string
  identifier: string
  title: string
  description?: string
  priority: number
  state: {
    id: string
    name: string
    type: string
  }
  assignee?: {
    id: string
    name: string
  }
  creator: {
    id: string
    name: string
  }
  labels: {
    nodes: Array<{ name: string }>
  }
  project?: {
    id: string
    name: string
  }
  team: {
    id: string
    name: string
    key: string
  }
  parent?: {
    id: string
    identifier: string
    title: string
  }
  url: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  canceledAt?: string
}

interface LinearConfig {
  apiKey: string
}

export class LinearProvider extends TicketProvider {
  name = 'linear'
  aliases = ['linear']

  private client?: GraphQLClient

  private getClient(config: LinearConfig): GraphQLClient {
    if (!this.client) {
      this.client = new GraphQLClient('https://api.linear.app/graphql', {
        headers: {
          Authorization: config.apiKey // Linear uses direct API key, no Bearer prefix
        }
      })
    }
    return this.client
  }

  isConfigured(config: ProviderConfig): boolean {
    return !!(config as LinearConfig)?.apiKey
  }

  async authenticate(config: ProviderConfig): Promise<AuthResult> {
    try {
      const linearConfig = config as LinearConfig
      const client = this.getClient(linearConfig)

      const query = gql`
        query {
          viewer {
            id
            name
          }
        }
      `

      const result = await client.request(query)
      return {
        valid: true,
        user: result.viewer.name
      }
    } catch (error) {
      return {
        valid: false,
        user: ''
      }
    }
  }

  async listTickets(options: ListOptions, config?: ProviderConfig): Promise<Ticket[]> {
    if (!config) throw new Error('Linear configuration required')

    const linearConfig = config as LinearConfig
    const client = this.getClient(linearConfig)

    const filter = this.buildFilter(options)

    const query = gql`
      query Issues($first: Int, $filter: IssueFilter) {
        issues(first: $first, filter: $filter) {
          nodes {
            id
            identifier
            title
            description
            priority
            state { id name type }
            assignee { id name }
            creator { id name }
            labels { nodes { name } }
            project { id name }
            team { id name key }
            parent { id identifier title }
            url
            createdAt
            updatedAt
            completedAt
            canceledAt
          }
        }
      }
    `

    const variables = {
      first: options.limit,
      filter
    }

    const result = await client.request(query, variables)
    return result.issues.nodes.map((issue: LinearIssue) => this.convertToTicket(issue))
  }

  async getTicket(id: string, config?: ProviderConfig): Promise<Ticket> {
    if (!config) throw new Error('Linear configuration required')

    const linearConfig = config as LinearConfig
    const client = this.getClient(linearConfig)

    // Try by ID first, then by identifier
    let query: string
    let variables: any

    if (id.startsWith('lin_')) {
      // It's an ID
      query = gql`
        query Issue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            priority
            state { id name type }
            assignee { id name }
            creator { id name }
            labels { nodes { name } }
            project { id name }
            team { id name key }
            parent { id identifier title }
            url
            createdAt
            updatedAt
            completedAt
            canceledAt
          }
        }
      `
      variables = { id }
    } else {
      // It's an identifier, search for it
      query = gql`
        query Issues($filter: IssueFilter) {
          issues(first: 1, filter: $filter) {
            nodes {
              id
              identifier
              title
              description
              priority
              state { id name type }
              assignee { id name }
              creator { id name }
              labels { nodes { name } }
              project { id name }
              team { id name key }
              parent { id identifier title }
              url
              createdAt
              updatedAt
              completedAt
              canceledAt
            }
          }
        }
      `
      variables = {
        filter: {
          identifier: { eq: id }
        }
      }
    }

    const result = await client.request(query, variables)
    const issue = id.startsWith('lin_') ? result.issue : result.issues.nodes[0]

    if (!issue) {
      throw new Error(`Ticket not found: ${id}`)
    }

    return this.convertToTicket(issue)
  }

  async getTicketTree(id: string, config?: ProviderConfig): Promise<TicketTree> {
    if (!config) throw new Error('Linear configuration required')

    const ticket = await this.getTicket(id, config)
    const children = await this.getChildren(ticket.id, config as LinearConfig)

    return {
      ...ticket,
      children
    }
  }

  async getRecentActivity(options: StandupOptions, config?: ProviderConfig): Promise<Ticket[]> {
    if (!config) throw new Error('Linear configuration required')

    const linearConfig = config as LinearConfig
    const client = this.getClient(linearConfig)

    const filter: any = {
      updatedAt: { gt: options.since.toISOString() }
    }

    if (options.assignee === 'me') {
      filter.assignee = { isMe: { eq: true } }
    } else {
      filter.assignee = { name: { contains: options.assignee } }
    }

    const query = gql`
      query Issues($filter: IssueFilter) {
        issues(first: 100, filter: $filter) {
          nodes {
            id
            identifier
            title
            description
            priority
            state { id name type }
            assignee { id name }
            creator { id name }
            labels { nodes { name } }
            project { id name }
            team { id name key }
            parent { id identifier title }
            url
            createdAt
            updatedAt
            completedAt
            canceledAt
          }
        }
      }
    `

    const result = await client.request(query, { filter })
    return result.issues.nodes.map((issue: LinearIssue) => this.convertToTicket(issue))
  }

  private async getChildren(parentId: string, config: LinearConfig): Promise<TicketTree[]> {
    const client = this.getClient(config)

    const query = gql`
      query Children($parentId: String!) {
        issue(id: $parentId) {
          children {
            nodes {
              id
              identifier
              title
              description
              priority
              state { id name type }
              assignee { id name }
              creator { id name }
              labels { nodes { name } }
              project { id name }
              team { id name key }
              parent { id identifier title }
              url
              createdAt
              updatedAt
              completedAt
              canceledAt
            }
          }
        }
      }
    `

    const result = await client.request(query, { parentId })
    const children = result.issue?.children?.nodes || []

    return Promise.all(
      children.map(async (child: LinearIssue) => {
        const childrenOfChild = await this.getChildren(child.id, config)
        return {
          ...this.convertToTicket(child),
          children: childrenOfChild
        }
      })
    )
  }

  private buildFilter(options: ListOptions): any {
    const filter: any = {}

    if (options.status) {
      filter.state = { name: { eq: options.status } }
    }

    if (options.assignee) {
      if (options.assignee === 'me') {
        filter.assignee = { isMe: { eq: true } }
      } else {
        filter.assignee = { name: { contains: options.assignee } }
      }
    }

    if (options.team) {
      filter.team = { name: { eq: options.team } }
    }

    if (options.project) {
      filter.project = { name: { eq: options.project } }
    }

    if (options.type) {
      // Linear often uses labels for types
      filter.labels = { name: { eq: options.type } }
    }

    return filter
  }

  private convertToTicket(issue: LinearIssue): Ticket {
    const labels = issue.labels.nodes.map(label => label.name)
    const statusRaw = issue.state.name
    const typeRaw = labels.find(label => ['Bug', 'Feature', 'Task', 'Epic', 'Story'].includes(label)) || 'Issue'

    return {
      id: issue.id,
      key: issue.identifier,
      title: issue.title,
      description: issue.description || null,
      status: normalizeStatus('linear', statusRaw),
      statusRaw,
      type: normalizeType('linear', typeRaw, labels),
      typeRaw,
      priority: normalizePriority('linear', issue.priority),
      priorityRaw: issue.priority.toString(),
      assignee: issue.assignee?.name || null,
      reporter: issue.creator.name,
      labels,
      project: issue.project?.name || null,
      team: issue.team.name,
      epic: issue.parent?.identifier || null,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      closedAt: issue.completedAt || issue.canceledAt || null,
      provider: 'linear',
      raw: issue as unknown as Record<string, unknown>
    }
  }
}