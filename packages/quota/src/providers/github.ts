import { BaseProvider } from './base';
import { Config, QuotaResult } from '../types';

export class GitHubProvider extends BaseProvider {
  name = 'GitHub Copilot';
  aliases = ['github', 'copilot'];
  hasApi = false;

  async checkQuota(config: Config): Promise<QuotaResult> {
    return {
      type: 'browser',
      url: 'https://github.com/settings/copilot'
    };
  }
}