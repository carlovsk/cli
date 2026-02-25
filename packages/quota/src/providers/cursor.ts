import { BaseProvider } from './base';
import { Config, QuotaResult } from '../types';

export class CursorProvider extends BaseProvider {
  name = 'Cursor';
  aliases = ['cursor'];
  hasApi = false;

  async checkQuota(config: Config): Promise<QuotaResult> {
    return {
      type: 'browser',
      url: 'https://cursor.com/settings'
    };
  }
}