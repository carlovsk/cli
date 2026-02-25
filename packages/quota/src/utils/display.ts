import chalk from 'chalk';
import { LiveData } from '../types';

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes}B`;
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)}K`;
  if (bytes < 1000000000) return `${(bytes / 1000000).toFixed(1)}M`;
  return `${(bytes / 1000000000).toFixed(1)}B`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  if (tokens < 1000000000) return `${(tokens / 1000000).toFixed(1)}M`;
  return `${(tokens / 1000000000).toFixed(1)}B`;
}

export function createProgressBar(percentage: number, width: number = 22): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const filledChar = '█';
  const emptyChar = '░';

  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

export function formatTimeRemaining(resetTime: Date): string {
  const now = new Date();
  const diff = resetTime.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Now';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function displayLiveQuota(providerName: string, data: LiveData): void {
  const planText = data.planName ? ` — ${data.planName}` : '';
  const progressBar = createProgressBar(data.percentage);

  let colorFunction = chalk.green;
  if (data.percentage > 80) colorFunction = chalk.red;
  else if (data.percentage > 60) colorFunction = chalk.yellow;

  console.log(chalk.bold(`${providerName}${planText}`));
  console.log('─'.repeat(33));
  console.log(`Tokens used:   ${colorFunction(progressBar)}  ${data.percentage}%`);
  console.log(`Used:          ${formatTokens(data.used)} / ${formatTokens(data.total)}`);

  if (data.resetTime) {
    console.log(`Resets in:     ${formatTimeRemaining(data.resetTime)}`);
  }
}

export function displayBrowserProvider(providerName: string, url: string): void {
  console.log(chalk.bold(`${providerName} — No API available`));
  console.log(`Opening ${chalk.blue(url)} ...`);
}

export function displayError(providerName: string, message: string, fallbackUrl?: string): void {
  console.log(chalk.bold.red(`${providerName} — Error`));
  console.log(chalk.red(message));

  if (fallbackUrl) {
    console.log(`Opening dashboard: ${chalk.blue(fallbackUrl)} ...`);
  }
}

export function displaySeparator(): void {
  console.log();
}