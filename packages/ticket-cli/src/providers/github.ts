import axios, { AxiosInstance } from 'axios'
import { TicketProvider, ProviderConfig, ListOptions, StandupOptions, AuthResult } from './base.js'
import { Ticket, TicketTree } from '../schemas/ticket.js'
import { normalizeStatus, normalizeType, extractPriorityFromLabels } from '../schemas/normalize.js'
import { extractRepoFromGitHubKey } from '../utils/infer-provider.js'

interface GitHubIssue {
  id: number
  number: number
  title: string
  body?: string | null
  state: 'open' | 'closed'
  state_reason?: string | null
  assignee?: {
    login: string
    html_url: string
  } | null
  user: {
    login: string
    html_url: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  html_url: string
  repository_url: string
  created_at: string
  updated_at: string
  closed_at?: string | null
  pull_request?: any // Filter out PRs
}

interface GitHubRepo {
  owner: {
    login: string
  }
  name: string
  full_name: string
}

interface GitHubConfig {
  token: string
  defaultRepo?: string
}

export class GitHubProvider extends TicketProvider {
  name = 'github'
  aliases = ['github', 'gh']

  private client?: AxiosInstance

  private getClient(config: GitHubConfig): AxiosInstance {
    if (!this.client) {
      this.client = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
    }
    return this.client
  }

  isConfigured(config: ProviderConfig): boolean {
    return !!(config as GitHubConfig)?.token
  }

  async authenticate(config: ProviderConfig): Promise<AuthResult> {
    try {
      const githubConfig = config as GitHubConfig
      const client = this.getClient(githubConfig)

      const response = await client.get('/user')
      return {
        valid: true,
        user: response.data.login
      }
    } catch (error) {
      return {
        valid: false,
        user: ''
      }
    }
  }

  async listTickets(options: ListOptions, config?: ProviderConfig): Promise<Ticket[]> {
    if (!config) throw new Error('GitHub configuration required')

    const githubConfig = config as GitHubConfig
    const client = this.getClient(githubConfig)

    let url = '/issues'
    const params: any = {
      per_page: Math.min(options.limit, 100),
      sort: 'updated',
      direction: 'desc'
    }

    // If we have a default repo, use repo-specific endpoint
    if (githubConfig.defaultRepo) {
      const [owner, repo] = githubConfig.defaultRepo.split('/')
      url = `/repos/${owner}/${repo}/issues`
    } else {
      // Use global issues endpoint with filter
      params.filter = options.assignee === 'me' ? 'assigned' : 'all'
    }

    if (options.status) {
      params.state = options.status === 'done' ? 'closed' : 'open'
    }

    if (options.assignee && options.assignee !== 'me' && !githubConfig.defaultRepo) {
      params.assignee = options.assignee
    }

    const response = await client.get(url, { params })

    // Filter out pull requests and convert to tickets
    const issues = response.data.filter((issue: GitHubIssue) => !issue.pull_request)
    return issues.map((issue: GitHubIssue) => this.convertToTicket(issue))
  }

  async getTicket(id: string, config?: ProviderConfig): Promise<Ticket> {
    if (!config) throw new Error('GitHub configuration required')

    const githubConfig = config as GitHubConfig
    const client = this.getClient(githubConfig)

    // Parse GitHub ticket key (owner/repo#number)
    const repoInfo = extractRepoFromGitHubKey(id)
    if (!repoInfo) {
      throw new Error(`Invalid GitHub issue format: ${id}. Use format: owner/repo#number`)
    }

    const response = await client.get(`/repos/${repoInfo.owner}/${repoInfo.repo}/issues/${repoInfo.number}`)

    if (response.data.pull_request) {
      throw new Error(`${id} is a pull request, not an issue`)
    }

    return this.convertToTicket(response.data)
  }

  async getTicketTree(id: string, config?: ProviderConfig): Promise<TicketTree> {
    if (!config) throw new Error('GitHub configuration required')

    const ticket = await this.getTicket(id, config)
    const children = await this.parseTaskListFromBody(ticket.description || '', config as GitHubConfig)

    return {
      ...ticket,
      children
    }
  }

  async getRecentActivity(options: StandupOptions, config?: ProviderConfig): Promise<Ticket[]> {
    if (!config) throw new Error('GitHub configuration required')

    const githubConfig = config as GitHubConfig
    const client = this.getClient(githubConfig)

    const params: any = {
      per_page: 100,
      sort: 'updated',
      since: options.since.toISOString()
    }

    if (options.assignee === 'me') {
      params.filter = 'assigned'
    } else {
      params.assignee = options.assignee
    }

    let url = '/issues'
    if (githubConfig.defaultRepo) {
      const [owner, repo] = githubConfig.defaultRepo.split('/')
      url = `/repos/${owner}/${repo}/issues`
      delete params.filter // repo endpoint doesn't support filter param
    }

    const response = await client.get(url, { params })

    // Filter out pull requests
    const issues = response.data.filter((issue: GitHubIssue) => !issue.pull_request)
    return issues.map((issue: GitHubIssue) => this.convertToTicket(issue))
  }

  private async parseTaskListFromBody(body: string, config: GitHubConfig): Promise<TicketTree[]> {
    if (!body) return []

    const client = this.getClient(config)
    const taskListRegex = /- \[[ x]\] .*?#(\d+)/g
    const children: TicketTree[] = []

    let match
    while ((match = taskListRegex.exec(body)) !== null) {
      try {
        const issueNumber = match[1]
        // This is a simplified approach - in reality we'd need to know which repo the reference is for
        // For now, assume it's the same repo as the parent issue
        const repoMatch = body.match(/github\.com\/([^/]+\/[^/\s]+)/)
        if (repoMatch) {
          const [owner, repo] = repoMatch[1].split('/')
          const ticketKey = `${owner}/${repo}#${issueNumber}`
          const childTicket = await this.getTicket(ticketKey, { token: config.token })
          const grandChildren = await this.parseTaskListFromBody(childTicket.description || '', config)

          children.push({
            ...childTicket,
            children: grandChildren
          })
        }
      } catch (error) {
        // Skip if we can't fetch the referenced issue
      }
    }

    return children
  }

  private convertToTicket(issue: GitHubIssue): Ticket {
    const labels = issue.labels.map(label => label.name)
    const statusRaw = issue.state
    const typeRaw = 'Issue' // GitHub doesn't have native types

    // Determine status based on state and state_reason
    let status = normalizeStatus('github', statusRaw)
    if (issue.state === 'closed' && issue.state_reason === 'not_planned') {
      status = 'cancelled'
    } else if (issue.state === 'open' && issue.assignee) {
      status = 'in_progress'
    }

    // Extract repo info from repository_url or html_url
    const repoMatch = issue.html_url.match(/github\.com\/([^/]+)\/([^/]+)/)
    const owner = repoMatch ? repoMatch[1] : 'unknown'
    const repo = repoMatch ? repoMatch[2] : 'unknown'

    return {
      id: issue.id.toString(),
      key: `${owner}/${repo}#${issue.number}`,
      title: issue.title,
      description: issue.body || null,
      status,
      statusRaw,
      type: normalizeType('github', typeRaw, labels),
      typeRaw,
      priority: extractPriorityFromLabels(labels),
      priorityRaw: null,
      assignee: issue.assignee?.login || null,
      reporter: issue.user.login,
      labels,
      project: repo,
      team: owner,
      epic: null, // GitHub doesn't have native epics
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at || null,
      provider: 'github',
      raw: issue as unknown as Record<string, unknown>
    }
  }
}