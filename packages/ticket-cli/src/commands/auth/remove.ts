import { Command, Args } from '@oclif/core'
import inquirer from 'inquirer'
import { getProvider } from '../../providers/index.js'
import { removeProviderConfig, hasProviderConfig } from '../../utils/config.js'
import chalk from 'chalk'

export default class AuthRemove extends Command {
  static override description = 'Remove authentication for a ticket provider'

  static override examples = [
    '$ ticket auth remove linear',
    '$ ticket auth remove jira',
    '$ ticket auth remove github',
  ]

  static override args = {
    provider: Args.string({
      description: 'Provider to remove authentication for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(AuthRemove)

    const provider = getProvider(args.provider)
    if (!provider) {
      this.error(`Unknown provider: ${args.provider}. Available providers: linear, jira, github`)
    }

    if (!hasProviderConfig(provider.name)) {
      this.log(`${chalk.yellow('!')} No authentication configured for ${provider.name}`)
      return
    }

    // Confirm removal
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove authentication for ${chalk.cyan(provider.name)}?`,
        default: false,
      },
    ])

    if (!confirm) {
      this.log('Cancelled.')
      return
    }

    try {
      removeProviderConfig(provider.name)
      this.log(`${chalk.green('✓')} Removed authentication for ${provider.name}`)
    } catch (error) {
      this.error(`Failed to remove authentication: ${error}`)
    }
  }
}