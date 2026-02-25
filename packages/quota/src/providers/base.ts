import { Config, QuotaResult, Provider } from '../types';

export abstract class BaseProvider implements Provider {
  abstract name: string;
  abstract aliases: string[];
  abstract hasApi: boolean;

  abstract checkQuota(config: Config): Promise<QuotaResult>;
}