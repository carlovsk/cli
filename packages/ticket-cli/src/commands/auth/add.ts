import { Command, Args } from '@oclif/core'
import inquirer from 'inquirer'
import { getProvider } from '../../providers/index.js'
import { updateProviderConfig } from '../../utils/config.js'
import chalk from 'chalk'

export default class AuthAdd extends Command {
  static override description = 'Add authentication for a ticket provider'

  static override examples = [
    '$ ticket auth add linear',
    '$ ticket auth add jira',
    '$ ticket auth add github',
  ]

  static override args = {
    provider: Args.string({
      description: 'Provider to authenticate with (linear, jira, github)',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(AuthAdd)

    const provider = getProvider(args.provider)
    if (!provider) {
      this.error(`Unknown provider: ${args.provider}. Available providers: linear, jira, github`)
    }

    this.log(`Setting up authentication for ${chalk.cyan(provider.name)}...`)

    try {
      let providerConfig: any

      switch (provider.name) {
        case 'linear':
          providerConfig = await this.setupLinear()
          break
        case 'jira':
          providerConfig = await this.setupJira()
          break
        case 'github':
          providerConfig = await this.setupGitHub()
          break
        default:
          this.error(`Authentication setup not implemented for ${provider.name}`)
      }

      // Test the authentication
      this.log('Testing authentication...')
      const authResult = await provider.authenticate(providerConfig)

      if (authResult.valid) {
        updateProviderConfig(provider.name, providerConfig)
        this.log(`${chalk.green('✓')} Successfully authenticated as ${chalk.bold(authResult.user)}`)
      } else {
        this.error('Authentication failed. Please check your credentials and try again.')
      }
    } catch (error) {
      this.error(`Failed to set up authentication: ${error}`)
    }
  }

  private async setupLinear(): Promise<any> {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Linear API key (Settings > Account > Security & Access > API):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key is required'
          }
          return true
        },
      },
    ])

    return {
      apiKey: answers.apiKey.trim(),
    }
  }

  private async setupJira(): Promise<any> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'domain',
        message: 'Enter your Jira domain (e.g. mycompany.atlassian.net):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Domain is required'
          }
          // Remove protocol if provided
          const domain = input.replace(/^https?:\/\//, '').replace(/\/$/, '')
          return true
        },
        filter: (input: string) => {
          return input.replace(/^https?:\/\//, '').replace(/\/$/, '')
        },
      },
      {
        type: 'input',
        name: 'email',
        message: 'Enter your Jira email:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Email is required'
          }
          if (!input.includes('@')) {
            return 'Please enter a valid email address'
          }
          return true
        },
      },
      {
        type: 'password',
        name: 'apiToken',
        message: 'Enter your Jira API token (https://id.atlassian.com/manage-profile/security/api-tokens):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API token is required'
          }
          return true
        },
      },
    ])

    return {
      domain: answers.domain.trim(),
      email: answers.email.trim(),
      apiToken: answers.apiToken.trim(),
    }
  }

  private async setupGitHub(): Promise<any> {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your GitHub personal access token (needs `repo` scope):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Token is required'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'defaultRepo',
        message: 'Enter default owner/repo (e.g. org/repo) or leave blank for all:',
        validate: (input: string) => {
          if (input.trim() && !input.includes('/')) {
            return 'Please enter in format: owner/repo'
          }
          return true
        },
      },
    ])

    const config: any = {
      token: answers.token.trim(),
    }

    if (answers.defaultRepo.trim()) {
      config.defaultRepo = answers.defaultRepo.trim()
    }

    return config
  }
}