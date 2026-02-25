import axios from 'axios';
import { BaseProvider } from './base';
import { Config, QuotaResult, LiveData } from '../types';

export class ZaiProvider extends BaseProvider {
  name = 'Z.ai';
  aliases = ['zai', 'z.ai'];
  hasApi = true;

  async checkQuota(config: Config): Promise<QuotaResult> {
    if (!config.zaiApiKey) {
      return {
        type: 'error',
        message: 'Z.ai API key not configured. Run: quota config zai',
        fallbackUrl: 'https://bigmodel.cn/usercenter/apikeys'
      };
    }

    try {
      const response = await axios.get(
        'https://bigmodel.cn/api/monitor/usage/quota/limit',
        {
          headers: {
            'Authorization': `Bearer ${config.zaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      if (!data.success || !data.data) {
        return {
          type: 'error',
          message: 'Invalid response from Z.ai API',
          fallbackUrl: 'https://bigmodel.cn/usercenter/apikeys'
        };
      }

      const quotaData = data.data;
      const used = quotaData.used || 0;
      const total = quotaData.total || 0;
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

      let resetTime: Date | undefined;
      if (quotaData.resetTime) {
        resetTime = new Date(quotaData.resetTime);
      }

      const liveData: LiveData = {
        used,
        total,
        percentage,
        resetTime,
        planName: quotaData.planName || 'Pro'
      };

      return {
        type: 'live',
        data: liveData
      };
    } catch (error: any) {
      let message = 'Failed to fetch Z.ai quota';

      if (error.response?.status === 401) {
        message = 'Invalid Z.ai API key. Please reconfigure: quota config zai';
      } else if (error.response?.status === 429) {
        message = 'Rate limited by Z.ai API. Please try again later.';
      } else if (error.message) {
        message = `Z.ai API error: ${error.message}`;
      }

      return {
        type: 'error',
        message,
        fallbackUrl: 'https://bigmodel.cn/usercenter/apikeys'
      };
    }
  }
}