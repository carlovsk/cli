import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface TicketCliConfig {
  providers: {
    linear?: {
      apiKey: string
    }
    jira?: {
      domain: string
      email: string
      apiToken: string
    }
    github?: {
      token: string
      defaultRepo?: string
    }
  }
  defaults: {
    provider?: string | null
    output: 'table' | 'json'
    limit: number
  }
}

const CONFIG_DIR = path.join(os.homedir(), '.ticket-cli')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export function getConfigPath(): string {
  return CONFIG_FILE
}

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function loadConfig(): TicketCliConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return getDefaultConfig()
    }

    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8')
    const config = JSON.parse(configContent)

    // Merge with defaults to ensure all required fields exist
    return {
      providers: config.providers || {},
      defaults: {
        ...getDefaultConfig().defaults,
        ...config.defaults
      }
    }
  } catch (error) {
    console.error(`Error loading config from ${CONFIG_FILE}:`, error)
    return getDefaultConfig()
  }
}

export function saveConfig(config: TicketCliConfig): void {
  try {
    ensureConfigDir()
    const configContent = JSON.stringify(config, null, 2)
    fs.writeFileSync(CONFIG_FILE, configContent, 'utf8')

    // Set secure file permissions (0600 = read/write for owner only)
    fs.chmodSync(CONFIG_FILE, 0o600)
  } catch (error) {
    throw new Error(`Failed to save config to ${CONFIG_FILE}: ${error}`)
  }
}

export function getDefaultConfig(): TicketCliConfig {
  return {
    providers: {},
    defaults: {
      provider: null,
      output: 'table',
      limit: 50
    }
  }
}

export function updateProviderConfig(providerName: string, providerConfig: any): void {
  const config = loadConfig()
  config.providers[providerName as keyof typeof config.providers] = providerConfig
  saveConfig(config)
}

export function removeProviderConfig(providerName: string): void {
  const config = loadConfig()
  delete config.providers[providerName as keyof typeof config.providers]
  saveConfig(config)
}

export function getProviderConfig(providerName: string): any {
  const config = loadConfig()
  return config.providers[providerName as keyof typeof config.providers] || null
}

export function hasProviderConfig(providerName: string): boolean {
  const providerConfig = getProviderConfig(providerName)
  return providerConfig !== null && Object.keys(providerConfig).length > 0
}

export function maskCredentials(config: any, provider: string): any {
  const masked = { ...config }

  switch (provider) {
    case 'linear':
      if (masked.apiKey) {
        masked.apiKey = `${masked.apiKey.slice(0, 8)}...`
      }
      break
    case 'jira':
      if (masked.apiToken) {
        masked.apiToken = `${masked.apiToken.slice(0, 8)}...`
      }
      break
    case 'github':
      if (masked.token) {
        masked.token = `${masked.token.slice(0, 8)}...`
      }
      break
  }

  return masked
}