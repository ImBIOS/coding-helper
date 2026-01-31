export interface AccountConfig {
  id: string;
  name: string;
  provider: "zai" | "minimax";
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  usage?: {
    used: number;
    limit: number;
    lastUpdated: string;
  };
}

export interface AlertConfig {
  id: string;
  type: "usage" | "quota" | "error";
  threshold: number;
  enabled: boolean;
  lastTriggered?: string;
}

export interface NotificationConfig {
  method: "console" | "webhook" | "email";
  endpoint?: string;
  enabled: boolean;
}

export interface ImBIOSConfigV2 {
  version: "2.0.0";
  accounts: Record<string, AccountConfig>;
  activeAccountId: string | null;
  alerts: AlertConfig[];
  notifications: NotificationConfig;
  dashboard: {
    port: number;
    host: string;
    enabled: boolean;
    authToken?: string;
  };
  rotation: {
    enabled: boolean;
    strategy: "round-robin" | "least-used" | "priority";
    maxUsesPerKey?: number;
  };
}

export const DEFAULT_CONFIG_V2: ImBIOSConfigV2 = {
  version: "2.0.0",
  accounts: {},
  activeAccountId: null,
  alerts: [
    { id: "usage-80", type: "usage", threshold: 80, enabled: true },
    { id: "usage-90", type: "usage", threshold: 90, enabled: true },
    { id: "quota-low", type: "quota", threshold: 10, enabled: true },
  ],
  notifications: {
    method: "console",
    enabled: true,
  },
  dashboard: {
    port: 3456,
    host: "localhost",
    enabled: false,
  },
  rotation: {
    enabled: false,
    strategy: "round-robin",
  },
};

export function getConfigPathV2(): string {
  return `${process.env.HOME || process.env.USERPROFILE}/.claude/imbios-v2.json`;
}

export function loadConfigV2(): ImBIOSConfigV2 {
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const configPath = getConfigPathV2();

    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG_V2, ...config };
    }
  } catch {
    // Ignore errors
  }
  return { ...DEFAULT_CONFIG_V2 };
}

export function saveConfigV2(config: ImBIOSConfigV2): void {
  const fs = require("node:fs");
  const path = require("node:path");
  const configPath = getConfigPathV2();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function generateAccountId(): string {
  return `acc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addAccount(
  name: string,
  provider: "zai" | "minimax",
  apiKey: string,
  baseUrl: string,
  defaultModel: string
): AccountConfig {
  const id = generateAccountId();
  const now = new Date().toISOString();

  const account: AccountConfig = {
    id,
    name,
    provider,
    apiKey,
    baseUrl,
    defaultModel,
    priority: 0,
    isActive: true,
    createdAt: now,
  };

  const config = loadConfigV2();
  config.accounts[id] = account;

  if (!config.activeAccountId) {
    config.activeAccountId = id;
  }

  saveConfigV2(config);
  return account;
}

export function updateAccount(
  id: string,
  updates: Partial<AccountConfig>
): AccountConfig | null {
  const config = loadConfigV2();
  const account = config.accounts[id];

  if (!account) {
    return null;
  }

  config.accounts[id] = {
    ...account,
    ...updates,
    lastUsed: new Date().toISOString(),
  };
  saveConfigV2(config);
  return config.accounts[id];
}

export function deleteAccount(id: string): boolean {
  const config = loadConfigV2();

  if (!config.accounts[id]) {
    return false;
  }

  delete config.accounts[id];

  if (config.activeAccountId === id) {
    const remainingIds = Object.keys(config.accounts);
    config.activeAccountId = remainingIds.length > 0 ? remainingIds[0] : null;
  }

  saveConfigV2(config);
  return true;
}

export function getActiveAccount(): AccountConfig | null {
  const config = loadConfigV2();
  if (!config.activeAccountId) {
    return null;
  }
  return config.accounts[config.activeAccountId] || null;
}

export function listAccounts(): AccountConfig[] {
  const config = loadConfigV2();
  return Object.values(config.accounts).sort((a, b) => a.priority - b.priority);
}

export function switchAccount(id: string): boolean {
  const config = loadConfigV2();

  if (!config.accounts[id]) {
    return false;
  }

  config.activeAccountId = id;
  config.accounts[id].lastUsed = new Date().toISOString();
  saveConfigV2(config);
  return true;
}

export function rotateApiKey(
  provider: "zai" | "minimax"
): AccountConfig | null {
  const config = loadConfigV2();
  const providerAccounts = Object.values(config.accounts)
    .filter((a) => a.provider === provider && a.isActive)
    .sort((a, b) => {
      if (config.rotation.strategy === "least-used") {
        return (a.usage?.used || 0) - (b.usage?.used || 0);
      }
      return a.priority - b.priority;
    });

  if (providerAccounts.length === 0) {
    return null;
  }

  const currentIndex = providerAccounts.findIndex(
    (a) => a.id === config.activeAccountId
  );
  const nextIndex = (currentIndex + 1) % providerAccounts.length;
  const nextAccount = providerAccounts[nextIndex];

  config.activeAccountId = nextAccount.id;
  nextAccount.lastUsed = new Date().toISOString();
  saveConfigV2(config);

  return nextAccount;
}

export function checkAlerts(usage: {
  used: number;
  limit: number;
  remaining?: number;
}): AlertConfig[] {
  const config = loadConfigV2();
  const triggered: AlertConfig[] = [];

  const percentUsed = usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0;

  for (const alert of config.alerts) {
    if (!alert.enabled) continue;

    if (alert.type === "usage" && percentUsed >= alert.threshold) {
      triggered.push(alert);
    }
    if (alert.type === "quota" && (usage.remaining ?? 0) <= alert.threshold) {
      triggered.push(alert);
    }
  }

  return triggered;
}

export function updateAlert(
  id: string,
  updates: Partial<AlertConfig>
): AlertConfig | null {
  const config = loadConfigV2();
  const alertIndex = config.alerts.findIndex((a) => a.id === id);

  if (alertIndex === -1) {
    return null;
  }

  config.alerts[alertIndex] = { ...config.alerts[alertIndex], ...updates };
  saveConfigV2(config);
  return config.alerts[alertIndex];
}

export function toggleDashboard(
  enabled: boolean,
  port?: number,
  host?: string
): void {
  const config = loadConfigV2();
  config.dashboard.enabled = enabled;
  if (port) config.dashboard.port = port;
  if (host) config.dashboard.host = host;
  if (enabled && !config.dashboard.authToken) {
    config.dashboard.authToken = `imbios_${Math.random().toString(36).slice(2, 16)}`;
  }
  saveConfigV2(config);
}

export function configureRotation(enabled: boolean, strategy?: string): void {
  const config = loadConfigV2();
  config.rotation.enabled = enabled;
  if (strategy) {
    config.rotation.strategy =
      strategy as ImBIOSConfigV2["rotation"]["strategy"];
  }
  saveConfigV2(config);
}
