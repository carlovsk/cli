import { Command, Args, Flags } from '@oclif/core';
import { readConfig, updateConfig, maskConfig } from '../utils/config';
import inquirer from 'inquirer';
import chalk from 'chalk';

export default class Config extends Command {
  static description = 'Manage quota-cli configuration';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --show',
    '<%= config.bin %> <%= command.id %> zai',
    '<%= config.bin %> <%= command.id %> gemini',
  ];

  static args = {
    provider: Args.string({
      description: 'Provider to configure (zai, gemini)',
      required: false,
    }),
  };

  static flags = {
    show: Flags.boolean({
      description: 'Show current configuration with masked values',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Config);
    const config = readConfig();

    if (flags.show) {
      this.showConfig(config);
      return;
    }

    if (!args.provider) {
      this.showConfig(config);
      return;
    }

    switch (args.provider.toLowerCase()) {
      case 'zai':
      case 'z.ai':
        await this.configureZai();
        break;

      case 'gemini':
      case 'google':
        await this.configureGemini();
        break;

      default:
        this.error(`Unknown provider: ${args.provider}. Supported providers: zai, gemini`);
    }
  }

  private showConfig(config: any): void {
    const maskedConfig = maskConfig(config);

    console.log(chalk.bold('Current Configuration:'));
    console.log('─'.repeat(25));

    if (maskedConfig.zaiApiKey) {
      console.log(`Z.ai API Key:     ${maskedConfig.zaiApiKey}`);
    } else {
      console.log(`Z.ai API Key:     ${chalk.gray('Not configured')}`);
    }

    if (maskedConfig.geminiRefreshToken) {
      console.log(`Gemini OAuth:     ${maskedConfig.geminiRefreshToken}`);
    } else {
      console.log(`Gemini OAuth:     ${chalk.gray('Not configured')}`);
    }

    if (!maskedConfig.zaiApiKey && !maskedConfig.geminiRefreshToken) {
      console.log(chalk.yellow('\nNo providers configured yet.'));
      console.log('Run: quota config <provider> to set up a provider');
    }
  }

  private async configureZai(): Promise<void> {
    console.log(chalk.bold('Configure Z.ai API Key'));
    console.log('─'.repeat(25));
    console.log('Get your API key from: https://bigmodel.cn/usercenter/apikeys\n');

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Z.ai API key:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key cannot be empty';
          }
          return true;
        },
      },
    ]);

    updateConfig({ zaiApiKey: apiKey.trim() });
    console.log(chalk.green('✓ Z.ai API key configured successfully'));
  }

  private async configureGemini(): Promise<void> {
    console.log(chalk.bold('Configure Gemini OAuth'));
    console.log('─'.repeat(25));
    console.log(chalk.yellow('Note: OAuth setup for Gemini is complex and requires additional setup.'));
    console.log('For now, this will be a placeholder for the refresh token.\n');

    const { refreshToken } = await inquirer.prompt([
      {
        type: 'password',
        name: 'refreshToken',
        message: 'Enter your Google OAuth refresh token:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Refresh token cannot be empty';
          }
          return true;
        },
      },
    ]);

    updateConfig({ geminiRefreshToken: refreshToken.trim() });
    console.log(chalk.green('✓ Gemini OAuth token configured successfully'));
    console.log(chalk.yellow('Note: Full OAuth flow implementation needed for production use'));
  }
}