import axios from 'axios';
import { BaseProvider } from './base';
import { Config, QuotaResult, LiveData } from '../types';

export class GeminiProvider extends BaseProvider {
  name = 'Gemini';
  aliases = ['gemini', 'google'];
  hasApi = true;

  async checkQuota(config: Config): Promise<QuotaResult> {
    if (!config.geminiRefreshToken) {
      return {
        type: 'error',
        message: 'Gemini OAuth not configured. Run: quota config gemini',
        fallbackUrl: 'https://makersuite.google.com/app/apikey'
      };
    }

    try {
      const accessToken = await this.refreshAccessToken(config.geminiRefreshToken);

      const response = await axios.get(
        'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const models = response.data?.models || [];

      let totalUsed = 0;
      let totalLimit = 0;
      const modelQuotas = [];

      for (const model of models) {
        if (model.quota) {
          const used = model.quota.used || 0;
          const limit = model.quota.limit || 0;

          totalUsed += used;
          totalLimit += limit;

          modelQuotas.push({
            name: model.name,
            used,
            limit,
            percentage: limit > 0 ? Math.round((used / limit) * 100) : 0
          });
        }
      }

      const percentage = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

      let resetTime: Date | undefined;
      if (models[0]?.quota?.resetTime) {
        resetTime = new Date(models[0].quota.resetTime);
      }

      const liveData: LiveData = {
        used: totalUsed,
        total: totalLimit,
        percentage,
        resetTime,
        planName: 'Google AI Studio'
      };

      return {
        type: 'live',
        data: liveData
      };
    } catch (error: any) {
      let message = 'Failed to fetch Gemini quota';

      if (error.response?.status === 401) {
        message = 'Gemini OAuth token expired. Please reconfigure: quota config gemini';
      } else if (error.response?.status === 403) {
        message = 'Access denied to Gemini API. Check permissions.';
      } else if (error.message) {
        message = `Gemini API error: ${error.message}`;
      }

      return {
        type: 'error',
        message,
        fallbackUrl: 'https://makersuite.google.com/app/apikey'
      };
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: 'your-client-id', // This would need to be configured
        client_secret: 'your-client-secret', // This would need to be configured
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return response.data.access_token;
    } catch (error) {
      throw new Error('Failed to refresh Google OAuth token');
    }
  }
}