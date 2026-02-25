import { BaseProvider } from './base';
import { Config, QuotaResult } from '../types';

export class ClaudeProvider extends BaseProvider {
  name = 'Claude';
  aliases = ['claude', 'anthropic'];
  hasApi = false;

  async checkQuota(config: Config): Promise<QuotaResult> {
    return {
      type: 'browser',
      url: 'https://claude.ai/settings/limits'
    };
  }
}