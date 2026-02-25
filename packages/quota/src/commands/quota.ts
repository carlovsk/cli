import { Command, Args } from '@oclif/core';
import { getProvider, getAllProviders } from '../providers';
import { readConfig } from '../utils/config';
import { displayLiveQuota, displayBrowserProvider, displayError, displaySeparator } from '../utils/display';
import { openUrl } from '../utils/browser';

export default class Quota extends Command {
  static description = 'Check AI tool quota/usage across multiple providers';

  static examples = [
    '<%= config.bin %> <%= command.id %> zai',
    '<%= config.bin %> <%= command.id %> gemini',
    '<%= config.bin %> <%= command.id %> claude',
    '<%= config.bin %> <%= command.id %> all',
  ];

  static args = {
    provider: Args.string({
      description: 'Provider name or alias (zai, gemini, claude, github, cursor, all)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Quota);
    const config = readConfig();

    if (args.provider.toLowerCase() === 'all') {
      await this.runAllProviders(config);
      return;
    }

    const provider = getProvider(args.provider);
    if (!provider) {
      this.error(`Unknown provider: ${args.provider}. Supported providers: zai, gemini, claude, github, cursor`);
    }

    await this.runSingleProvider(provider, config);
  }

  private async runAllProviders(config: any): Promise<void> {
    const providers = getAllProviders();
    let isFirst = true;

    for (const provider of providers) {
      if (!isFirst) {
        displaySeparator();
      }
      isFirst = false;

      await this.runSingleProvider(provider, config);
    }
  }

  private async runSingleProvider(provider: any, config: any): Promise<void> {
    try {
      const result = await provider.checkQuota(config);

      switch (result.type) {
        case 'live':
          displayLiveQuota(provider.name, result.data);
          break;

        case 'browser':
          displayBrowserProvider(provider.name, result.url);
          await openUrl(result.url);
          break;

        case 'error':
          displayError(provider.name, result.message, result.fallbackUrl);
          if (result.fallbackUrl) {
            await openUrl(result.fallbackUrl);
          }
          break;
      }
    } catch (error: any) {
      displayError(provider.name, `Unexpected error: ${error.message}`);
    }
  }
}