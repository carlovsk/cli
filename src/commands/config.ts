import {Command, Args, Flags} from '@oclif/core';
import {loadConfig, saveConfig, validateProjectRoot} from '../lib/config';

export default class Config extends Command {
  static override description = 'Manage rr configuration';

  static override examples = [
    'rr config',
    'rr config set projectRoot /path/to/api',
  ];

  static override args = {
    action: Args.string({
      description: 'Action to perform',
      required: false,
      options: ['set'],
    }),
    key: Args.string({
      description: 'Configuration key to set',
      required: false,
    }),
    value: Args.string({
      description: 'Configuration value to set',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {args} = await this.parse(Config);

    if (!args.action) {
      await this.showConfig();
      return;
    }

    if (args.action === 'set') {
      if (!args.key || !args.value) {
        this.error('Usage: rr config set <key> <value>');
      }

      if (args.key === 'projectRoot') {
        await this.setProjectRoot(args.value);
      } else {
        this.error(`Unknown configuration key: ${args.key}`);
      }
    }
  }

  private async showConfig(): Promise<void> {
    const config = loadConfig();

    if (!config) {
      this.log('No configuration found. Run "rr config set projectRoot <path>" to get started.');
      return;
    }

    this.log('Current configuration:');
    this.log(`  projectRoot: ${config.projectRoot}`);
  }

  private async setProjectRoot(projectRoot: string): Promise<void> {
    const validation = validateProjectRoot(projectRoot);

    if (!validation.valid) {
      this.error(validation.error || 'Invalid project root');
    }

    const config = {projectRoot};
    saveConfig(config);

    this.log(`Configuration saved: projectRoot = ${projectRoot}`);
  }
}