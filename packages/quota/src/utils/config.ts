import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.quota-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readConfig(): Config {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading config file:', error);
    return {};
  }
}

export function writeConfig(config: Config): void {
  ensureConfigDir();

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error writing config file:', error);
    throw error;
  }
}

export function updateConfig(updates: Partial<Config>): void {
  const currentConfig = readConfig();
  const newConfig = { ...currentConfig, ...updates };
  writeConfig(newConfig);
}

export function maskConfig(config: Config): Config {
  const masked = { ...config };

  if (masked.zaiApiKey) {
    masked.zaiApiKey = masked.zaiApiKey.substring(0, 8) + '...';
  }

  if (masked.geminiRefreshToken) {
    masked.geminiRefreshToken = masked.geminiRefreshToken.substring(0, 8) + '...';
  }

  return masked;
}