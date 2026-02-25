export interface Config {
  zaiApiKey?: string;
  geminiRefreshToken?: string;
}

export interface LiveData {
  used: number;
  total: number;
  percentage: number;
  resetTime?: Date;
  planName?: string;
}

export type QuotaResult =
  | { type: 'live'; data: LiveData }
  | { type: 'browser'; url: string }
  | { type: 'error'; message: string; fallbackUrl: string };

export interface Provider {
  name: string;
  aliases: string[];
  hasApi: boolean;
  checkQuota(config: Config): Promise<QuotaResult>;
}