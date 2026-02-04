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
  groupId?: string; // Required for MiniMax usage tracking
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

export type RotationStrategy =
  | "round-robin"
  | "least-used"
  | "priority"
  | "random";

export interface RotationConfig {
  enabled: boolean;
  strategy: RotationStrategy;
  crossProvider: boolean;
  maxUsesPerKey?: number;
  lastRotation?: string;
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
  rotation: RotationConfig;
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
    enabled: true,
    strategy: "least-used",
    crossProvider: true,
  },
};

export function getConfigPathV2(): string {
  return `${process.env.HOME || process.env.USERPROFILE}/.claude/cohe.json`;
}

export function loadConfigV2(): ImBIOSConfigV2 {
  try {
    const fs = require("node:fs");
    const _path = require("node:path");
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
  defaultModel: string,
  groupId?: string
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
    ...(groupId && { groupId }),
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
    if (!alert.enabled) {
      continue;
    }

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
  if (port) {
    config.dashboard.port = port;
  }
  if (host) {
    config.dashboard.host = host;
  }
  if (enabled && !config.dashboard.authToken) {
    config.dashboard.authToken = `imbios_${Math.random()
      .toString(36)
      .slice(2, 16)}`;
  }
  saveConfigV2(config);
}

export function configureRotation(
  enabled: boolean,
  strategy?: RotationStrategy,
  crossProvider?: boolean
): void {
  const config = loadConfigV2();
  config.rotation.enabled = enabled;
  if (strategy) {
    config.rotation.strategy = strategy;
  }
  if (crossProvider !== undefined) {
    config.rotation.crossProvider = crossProvider;
  }
  saveConfigV2(config);
}

/**
 * Fetch real usage data from provider API and update account config
 * This ensures least-used rotation uses accurate, up-to-date data
 *
 * For rotation comparison, uses the DISPLAYED percentage:
 * - ZAI: Uses MCP usage percentage (mcpUsage.percentUsed)
 * - MiniMax: Uses remaining percentage (percentRemaining) - what's displayed
 *
 * This ensures rotation matches what the user sees in `cohe usage`
 */
async function fetchAndUpdateUsage(account: AccountConfig): Promise<number> {
  try {
    // Dynamically import providers to avoid circular dependencies
    const { zaiProvider } = await import("../providers/zai.js");
    const { minimaxProvider } = await import("../providers/minimax.js");

    const provider = account.provider === "zai" ? zaiProvider : minimaxProvider;

    // Pass account-specific options to getUsage
    const usage = await provider.getUsage({
      apiKey: account.apiKey,
      groupId: account.groupId,
    });

    // Update account config with real usage data
    if (usage.limit > 0) {
      updateAccount(account.id, {
        usage: {
          used: usage.used,
          limit: usage.limit,
          lastUpdated: new Date().toISOString(),
        },
      });

      // For rotation, use the DISPLAYED percentage (matches `cohe usage`)
      // ZAI: use mcpUsage.percentUsed (35% displayed)
      // MiniMax: use percentRemaining (0% displayed when full)
      if (account.provider === "zai" && usage.mcpUsage) {
        return usage.mcpUsage.percentUsed;
      }
      // MiniMax: use displayed percentage (percentRemaining if available)
      return usage.percentRemaining ?? usage.percentUsed;
    }
  } catch {
    // Silently fail and fall back to cached usage
  }

  // Fallback to cached usage percentage
  if (account.usage && account.usage.limit > 0) {
    return (account.usage.used / account.usage.limit) * 100;
  }
  return 0;
}

export async function rotateAcrossProviders(): Promise<AccountConfig | null> {
  const config = loadConfigV2();
  const allAccounts = Object.values(config.accounts).filter((a) => a.isActive);

  if (allAccounts.length === 0) {
    return null;
  }

  const currentId = config.activeAccountId;
  let nextAccount: AccountConfig | null = null;

  switch (config.rotation.strategy) {
    case "random": {
      const otherAccounts = allAccounts.filter((a) => a.id !== currentId);
      if (otherAccounts.length === 0) {
        nextAccount = allAccounts[0];
      } else {
        nextAccount =
          otherAccounts[Math.floor(Math.random() * otherAccounts.length)];
      }
      break;
    }

    case "round-robin": {
      const sorted = allAccounts.sort((a, b) => a.priority - b.priority);
      const currentIndex = sorted.findIndex((a) => a.id === currentId);
      const nextIndex = (currentIndex + 1) % sorted.length;
      nextAccount = sorted[nextIndex];
      break;
    }

    case "least-used": {
      // Fetch real usage data from all provider APIs
      const accountsWithUsage = await Promise.all(
        allAccounts.map(async (acc) => ({
          account: acc,
          usage: await fetchAndUpdateUsage(acc),
        }))
      );

      // Sort by actual usage (lowest first)
      accountsWithUsage.sort((a, b) => a.usage - b.usage);
      nextAccount = accountsWithUsage[0].account;
      break;
    }

    case "priority": {
      const sorted = allAccounts.sort((a, b) => b.priority - a.priority);
      nextAccount = sorted[0];
      break;
    }
  }

  if (nextAccount && nextAccount.id !== currentId) {
    config.activeAccountId = nextAccount.id;
    nextAccount.lastUsed = new Date().toISOString();
    config.rotation.lastRotation = new Date().toISOString();
    saveConfigV2(config);
  }

  return nextAccount;
}
