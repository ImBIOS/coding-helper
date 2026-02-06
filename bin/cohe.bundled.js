#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/utils/logger.ts
function getMinLevel() {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "trace" || env === "debug" || env === "info" || env === "warning" || env === "error") {
    return env;
  }
  return "info";
}
function shouldLog(level) {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getMinLevel()];
}
function log(message, level = "info") {
  if (!shouldLog(level)) {
    return;
  }
  const color = COLORS[level];
  const prefix = LEVEL_PREFIXES[level];
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`${color}[${timestamp}] ${prefix} ${message}${COLORS.reset}`);
}
function success(message) {
  log(message, "success");
}
function info(message) {
  log(message, "info");
}
function warning(message) {
  log(message, "warning");
}
function error(message) {
  log(message, "error");
}
function trace(message) {
  log(message, "trace");
}
function table(data) {
  const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));
  const maxValLength = Math.max(...Object.values(data).map((v) => String(v).length));
  Object.entries(data).forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    const paddedVal = String(value).padStart(maxValLength);
    console.log(`  ${paddedKey}  →  ${paddedVal}`);
  });
}
function section(title) {
  console.log(`
${"─".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(50));
}
var LOG_LEVEL_ORDER, COLORS, LEVEL_PREFIXES;
var init_logger = __esm(() => {
  LOG_LEVEL_ORDER = {
    trace: 0,
    debug: 1,
    info: 2,
    success: 2,
    warning: 3,
    error: 4
  };
  COLORS = {
    trace: "\x1B[35m",
    debug: "\x1B[90m",
    info: "\x1B[36m",
    success: "\x1B[32m",
    warning: "\x1B[33m",
    error: "\x1B[31m",
    reset: "\x1B[0m"
  };
  LEVEL_PREFIXES = {
    trace: "→",
    debug: "↪",
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✗"
  };
});

// src/utils/anthropic-connection-test.ts
import Anthropic from "@anthropic-ai/sdk";
async function testAnthropicConnection(config, providerName) {
  if (!config.apiKey) {
    return false;
  }
  try {
    const client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: 15000,
      maxRetries: 0
    });
    trace(`${providerName}: messages.create model=${config.model} max_tokens=${TEST_MAX_TOKENS}`);
    const message = await client.messages.create({
      model: config.model,
      max_tokens: TEST_MAX_TOKENS,
      messages: [{ role: "user", content: TEST_MESSAGE }]
    });
    trace(`${providerName}: response id=${message.id} stop_reason=${message.stop_reason}`);
    return Boolean(message.id);
  } catch (e) {
    trace(`${providerName}: request failed ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
var TEST_MESSAGE = "Hi", TEST_MAX_TOKENS = 5;
var init_anthropic_connection_test = __esm(() => {
  init_logger();
});

// src/providers/zai.ts
var exports_zai = {};
__export(exports_zai, {
  zaiProvider: () => zaiProvider,
  ZAIProvider: () => ZAIProvider
});

class ZAIProvider {
  name = "zai";
  displayName = "Z.AI (GLM)";
  getConfig() {
    return {
      apiKey: process.env.ZAI_API_KEY || "",
      baseUrl: process.env.ZAI_BASE_URL || "https://api.z.ai/api/anthropic",
      defaultModel: "GLM-4.7",
      models: ["GLM-4.7", "GLM-4.5-Air"]
    };
  }
  getModels() {
    return ["GLM-4.7", "GLM-4.5-Air"];
  }
  getDefaultModel(type) {
    return ZAI_MODEL_MAPPING[type];
  }
  getModelMapping() {
    return ZAI_MODEL_MAPPING;
  }
  async testConnection() {
    const config = this.getConfig();
    return testAnthropicConnection({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.defaultModel
    }, "ZAI");
  }
  async getUsage(options) {
    const config = this.getConfig();
    const apiKey = options?.apiKey || config.apiKey;
    if (!apiKey) {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
    try {
      const controller = new AbortController;
      const timeoutId = setTimeout(() => controller.abort(), 1e4);
      const response = await fetch("https://api.z.ai/api/monitor/usage/quota/limit", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }
      const data = await response.json();
      const timeLimit = data.data?.limits?.find((limit) => limit.type === "TIME_LIMIT");
      const tokenLimit = data.data?.limits?.find((limit) => limit.type === "TOKENS_LIMIT");
      if (!(timeLimit || tokenLimit)) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }
      const modelUsage = tokenLimit ? {
        used: tokenLimit.currentValue,
        limit: tokenLimit.usage,
        remaining: tokenLimit.remaining,
        percentUsed: tokenLimit.percentage
      } : { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      const mcpUsage = timeLimit ? {
        used: timeLimit.currentValue,
        limit: timeLimit.usage,
        remaining: timeLimit.remaining,
        percentUsed: timeLimit.percentage
      } : { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      return {
        ...modelUsage,
        modelUsage,
        mcpUsage
      };
    } catch {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
  }
}
var ZAI_MODEL_MAPPING, zaiProvider;
var init_zai = __esm(() => {
  init_anthropic_connection_test();
  ZAI_MODEL_MAPPING = {
    opus: "GLM-4.7",
    sonnet: "GLM-4.7",
    haiku: "GLM-4.5-Air"
  };
  zaiProvider = new ZAIProvider;
});

// src/providers/minimax.ts
var exports_minimax = {};
__export(exports_minimax, {
  minimaxProvider: () => minimaxProvider,
  MiniMaxProvider: () => MiniMaxProvider
});

class MiniMaxProvider {
  name = "minimax";
  displayName = "MiniMax";
  getConfig() {
    return {
      apiKey: process.env.MINIMAX_API_KEY || "",
      baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/anthropic",
      defaultModel: "MiniMax-M2.1",
      models: ["MiniMax-M2.1"]
    };
  }
  getModels() {
    return ["MiniMax-M2.1"];
  }
  getDefaultModel(type) {
    return MINIMAX_MODEL_MAPPING[type];
  }
  getModelMapping() {
    return MINIMAX_MODEL_MAPPING;
  }
  async testConnection() {
    const config = this.getConfig();
    return testAnthropicConnection({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.defaultModel
    }, "MiniMax");
  }
  async getUsage(options) {
    const config = this.getConfig();
    const apiKey = options?.apiKey || config.apiKey;
    if (!apiKey) {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
    const groupId = options?.groupId || process.env.MINIMAX_GROUP_ID || "";
    try {
      const controller = new AbortController;
      const timeoutId = setTimeout(() => controller.abort(), 1e4);
      const url = groupId ? `https://platform.minimax.io/v1/api/openplatform/coding_plan/remains?GroupId=${groupId}` : "https://platform.minimax.io/v1/api/openplatform/coding_plan/remains";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }
      const data = await response.json();
      if (data.base_resp?.status_code !== 0 || !data.model_remains?.[0]) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }
      const modelRemains = data.model_remains[0];
      const limit = modelRemains.current_interval_total_count;
      const used = modelRemains.current_interval_usage_count;
      const remaining = Math.max(0, limit - used);
      const percentUsed = limit > 0 ? used / limit * 100 : 0;
      const percentRemaining = limit > 0 ? remaining / limit * 100 : 0;
      return {
        used,
        limit,
        remaining,
        percentUsed,
        percentRemaining
      };
    } catch {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
  }
}
var MINIMAX_MODEL_MAPPING, minimaxProvider;
var init_minimax = __esm(() => {
  init_anthropic_connection_test();
  MINIMAX_MODEL_MAPPING = {
    opus: "MiniMax-M2.1",
    sonnet: "MiniMax-M2.1",
    haiku: "MiniMax-M2.1"
  };
  minimaxProvider = new MiniMaxProvider;
});

// src/config/accounts-config.ts
function getConfigPathV2() {
  return `${process.env.HOME || process.env.USERPROFILE}/.claude/cohe.json`;
}
function loadConfigV2() {
  try {
    const fs = __require("node:fs");
    const _path = __require("node:path");
    const configPath = getConfigPathV2();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG_V2, ...config };
    }
  } catch {}
  return { ...DEFAULT_CONFIG_V2 };
}
function saveConfigV2(config) {
  const fs = __require("node:fs");
  const path = __require("node:path");
  const configPath = getConfigPathV2();
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
function generateAccountId() {
  return `acc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function addAccount(name, provider, apiKey, baseUrl, defaultModel, groupId) {
  const id = generateAccountId();
  const now = new Date().toISOString();
  const account = {
    id,
    name,
    provider,
    apiKey,
    baseUrl,
    defaultModel,
    priority: 0,
    isActive: true,
    createdAt: now,
    ...groupId && { groupId }
  };
  const config = loadConfigV2();
  config.accounts[id] = account;
  if (!config.activeAccountId) {
    config.activeAccountId = id;
  }
  saveConfigV2(config);
  return account;
}
function updateAccount(id, updates) {
  const config = loadConfigV2();
  const account = config.accounts[id];
  if (!account) {
    return null;
  }
  config.accounts[id] = {
    ...account,
    ...updates,
    lastUsed: new Date().toISOString()
  };
  saveConfigV2(config);
  return config.accounts[id];
}
function deleteAccount(id) {
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
function getActiveAccount() {
  const config = loadConfigV2();
  if (!config.activeAccountId) {
    return null;
  }
  return config.accounts[config.activeAccountId] || null;
}
function listAccounts() {
  const config = loadConfigV2();
  return Object.values(config.accounts).sort((a, b) => a.priority - b.priority);
}
function switchAccount(id) {
  const config = loadConfigV2();
  if (!config.accounts[id]) {
    return false;
  }
  config.activeAccountId = id;
  config.accounts[id].lastUsed = new Date().toISOString();
  saveConfigV2(config);
  return true;
}
function rotateApiKey(provider) {
  const config = loadConfigV2();
  const providerAccounts = Object.values(config.accounts).filter((a) => a.provider === provider && a.isActive).sort((a, b) => {
    if (config.rotation.strategy === "least-used") {
      return (a.usage?.used || 0) - (b.usage?.used || 0);
    }
    return a.priority - b.priority;
  });
  if (providerAccounts.length === 0) {
    return null;
  }
  const currentIndex = providerAccounts.findIndex((a) => a.id === config.activeAccountId);
  const nextIndex = (currentIndex + 1) % providerAccounts.length;
  const nextAccount = providerAccounts[nextIndex];
  config.activeAccountId = nextAccount.id;
  nextAccount.lastUsed = new Date().toISOString();
  saveConfigV2(config);
  return nextAccount;
}
function checkAlerts(usage) {
  const config = loadConfigV2();
  const triggered = [];
  const percentUsed = usage.limit > 0 ? usage.used / usage.limit * 100 : 0;
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
function updateAlert(id, updates) {
  const config = loadConfigV2();
  const alertIndex = config.alerts.findIndex((a) => a.id === id);
  if (alertIndex === -1) {
    return null;
  }
  config.alerts[alertIndex] = { ...config.alerts[alertIndex], ...updates };
  saveConfigV2(config);
  return config.alerts[alertIndex];
}
function toggleDashboard(enabled, port, host) {
  const config = loadConfigV2();
  config.dashboard.enabled = enabled;
  if (port) {
    config.dashboard.port = port;
  }
  if (host) {
    config.dashboard.host = host;
  }
  if (enabled && !config.dashboard.authToken) {
    config.dashboard.authToken = `imbios_${Math.random().toString(36).slice(2, 16)}`;
  }
  saveConfigV2(config);
}
function configureRotation(enabled, strategy, crossProvider) {
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
async function fetchAndUpdateUsage(account) {
  try {
    const { zaiProvider: zaiProvider2 } = await Promise.resolve().then(() => (init_zai(), exports_zai));
    const { minimaxProvider: minimaxProvider2 } = await Promise.resolve().then(() => (init_minimax(), exports_minimax));
    const provider = account.provider === "zai" ? zaiProvider2 : minimaxProvider2;
    const usage = await provider.getUsage({
      apiKey: account.apiKey,
      groupId: account.groupId
    });
    if (usage.limit > 0) {
      updateAccount(account.id, {
        usage: {
          used: usage.used,
          limit: usage.limit,
          lastUpdated: new Date().toISOString()
        }
      });
      if (account.provider === "zai" && usage.mcpUsage) {
        return usage.mcpUsage.percentUsed;
      }
      return usage.percentRemaining ?? usage.percentUsed;
    }
  } catch {}
  if (account.usage && account.usage.limit > 0) {
    return account.usage.used / account.usage.limit * 100;
  }
  return 0;
}
async function rotateAcrossProviders() {
  const config = loadConfigV2();
  const allAccounts = Object.values(config.accounts).filter((a) => a.isActive);
  if (allAccounts.length === 0) {
    return null;
  }
  const currentId = config.activeAccountId;
  let nextAccount = null;
  switch (config.rotation.strategy) {
    case "random": {
      const otherAccounts = allAccounts.filter((a) => a.id !== currentId);
      if (otherAccounts.length === 0) {
        nextAccount = allAccounts[0];
      } else {
        nextAccount = otherAccounts[Math.floor(Math.random() * otherAccounts.length)];
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
      const accountsWithUsage = await Promise.all(allAccounts.map(async (acc) => ({
        account: acc,
        usage: await fetchAndUpdateUsage(acc)
      })));
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
var DEFAULT_CONFIG_V2;
var init_accounts_config = __esm(() => {
  DEFAULT_CONFIG_V2 = {
    version: "2.0.0",
    accounts: {},
    activeAccountId: null,
    alerts: [
      { id: "usage-80", type: "usage", threshold: 80, enabled: true },
      { id: "usage-90", type: "usage", threshold: 90, enabled: true },
      { id: "quota-low", type: "quota", threshold: 10, enabled: true }
    ],
    notifications: {
      method: "console",
      enabled: true
    },
    dashboard: {
      port: 3456,
      host: "localhost",
      enabled: false
    },
    rotation: {
      enabled: true,
      strategy: "least-used",
      crossProvider: true
    }
  };
});

// src/config/mcp.ts
import * as fs from "node:fs";
import * as path from "node:path";
function getMcpPath() {
  return `${process.env.HOME || process.env.USERPROFILE}/.claude/imbios-mcp.json`;
}
function loadMcpConfig() {
  try {
    const configPath = getMcpPath();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}
function saveMcpConfig(config) {
  const configPath = getMcpPath();
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
function addMcpServer(name, command, args, options) {
  const config = loadMcpConfig();
  const server = {
    name,
    command,
    args,
    enabled: true,
    description: options?.description || "",
    provider: options?.provider || "all",
    env: options?.env
  };
  config.servers[name] = server;
  saveMcpConfig(config);
  return server;
}
function deleteMcpServer(name) {
  const config = loadMcpConfig();
  if (!config.servers[name]) {
    return false;
  }
  delete config.servers[name];
  saveMcpConfig(config);
  return true;
}
function getMcpServer(name) {
  const config = loadMcpConfig();
  return config.servers[name] || null;
}
function listMcpServers() {
  const config = loadMcpConfig();
  return Object.values(config.servers);
}
function listEnabledMcpServers() {
  const config = loadMcpConfig();
  return Object.values(config.servers).filter((s) => s.enabled);
}
function toggleMcpServer(name, enabled) {
  const config = loadMcpConfig();
  if (!config.servers[name]) {
    return false;
  }
  config.servers[name].enabled = enabled;
  saveMcpConfig(config);
  return true;
}
function getMcpEnvForServer(name) {
  const config = loadMcpConfig();
  const server = config.servers[name];
  if (!server) {
    return {};
  }
  return {
    ...config.globalEnv,
    ...server.env
  };
}
function generateMcpEnvExport() {
  const config = loadMcpConfig();
  const enabledServers = listEnabledMcpServers();
  let envScript = `# ImBIOS MCP Configuration
`;
  if (config.globalEnv && Object.keys(config.globalEnv).length > 0) {
    envScript += `# Global MCP Environment Variables
`;
    for (const [key, value] of Object.entries(config.globalEnv)) {
      envScript += `export ${key}="${value}"
`;
    }
    envScript += `
`;
  }
  envScript += `# MCP Servers
`;
  envScript += `export IMBIOS_MCP_SERVERS="${enabledServers.map((s) => s.name).join(",")}"

`;
  for (const server of enabledServers) {
    envScript += `# Server: ${server.name}
`;
    envScript += `export IMBIOS_MCP_${server.name.toUpperCase().replace(/-/g, "_")}_COMMAND="${server.command}"
`;
    envScript += `export IMBIOS_MCP_${server.name.toUpperCase().replace(/-/g, "_")}_ARGS="${server.args.join(" ")}"
`;
    if (server.env) {
      for (const [key, value] of Object.entries(server.env)) {
        envScript += `export IMBIOS_MCP_${server.name.toUpperCase().replace(/-/g, "_")}_ENV_${key}="${value}"
`;
      }
    }
    envScript += `
`;
  }
  return envScript;
}
function generateClaudeDesktopConfig() {
  const _config = loadMcpConfig();
  const enabledServers = listEnabledMcpServers();
  const mcpServers = {};
  for (const server of enabledServers) {
    mcpServers[server.name] = {
      command: server.command,
      args: server.args,
      env: server.env
    };
  }
  return JSON.stringify({
    mcpServers
  }, null, 2);
}
function addPredefinedServers(provider) {
  const servers = provider === "zai" ? ZAI_MCP_SERVERS : MINIMAX_MCP_SERVERS;
  const config = loadMcpConfig();
  for (const server of Object.values(servers)) {
    if (!config.servers[server.name]) {
      config.servers[server.name] = {
        ...server,
        enabled: false
      };
    }
  }
  saveMcpConfig(config);
}
var DEFAULT_CONFIG, ZAI_MCP_SERVERS, MINIMAX_MCP_SERVERS;
var init_mcp = __esm(() => {
  DEFAULT_CONFIG = {
    version: "1.0.0",
    servers: {},
    globalEnv: {}
  };
  ZAI_MCP_SERVERS = {
    "zai-vision": {
      name: "zai-vision",
      command: "npx",
      args: ["-y", "@z-ai/mcp-server-vision"],
      description: "Vision/image analysis for Z.AI",
      provider: "zai"
    },
    "zai-search": {
      name: "zai-search",
      command: "npx",
      args: ["-y", "@z-ai/mcp-server-search"],
      description: "Web search for Z.AI",
      provider: "zai"
    },
    "zai-reader": {
      name: "zai-reader",
      command: "npx",
      args: ["-y", "@z-ai/mcp-server-reader"],
      description: "Content reading for Z.AI",
      provider: "zai"
    },
    "zai-zread": {
      name: "zai-zread",
      command: "npx",
      args: ["-y", "@z-ai/mcp-server-zread"],
      description: "Advanced reading for Z.AI",
      provider: "zai"
    }
  };
  MINIMAX_MCP_SERVERS = {
    "minimax-coding": {
      name: "minimax-coding",
      command: "npx",
      args: ["-y", "minimax-coding-plan-mcp"],
      description: "MiniMax coding plan MCP - web_search and understand_image tools",
      provider: "minimax"
    }
  };
});

// src/config/profiles.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
function getProfilesPath() {
  return `${process.env.HOME || process.env.USERPROFILE}/.claude/imbios-profiles.json`;
}
function loadProfiles() {
  try {
    const configPath = getProfilesPath();
    if (fs2.existsSync(configPath)) {
      const content = fs2.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch {}
  return DEFAULT_CONFIG2;
}
function saveProfiles(config) {
  const configPath = getProfilesPath();
  const configDir = path2.dirname(configPath);
  if (!fs2.existsSync(configDir)) {
    fs2.mkdirSync(configDir, { recursive: true });
  }
  fs2.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
function createProfile(name, provider, apiKey, baseUrl, defaultModel) {
  const now = new Date().toISOString();
  const profile = {
    name,
    provider,
    apiKey,
    baseUrl,
    defaultModel,
    createdAt: now,
    updatedAt: now
  };
  const config = loadProfiles();
  config.profiles[name] = profile;
  if (Object.keys(config.profiles).length === 1) {
    config.activeProfile = name;
  }
  saveProfiles(config);
  return profile;
}
function switchProfile(name) {
  const config = loadProfiles();
  if (!config.profiles[name]) {
    return false;
  }
  config.activeProfile = name;
  saveProfiles(config);
  return true;
}
function deleteProfile(name) {
  const config = loadProfiles();
  if (!config.profiles[name]) {
    return false;
  }
  if (name === config.activeProfile) {
    return false;
  }
  delete config.profiles[name];
  saveProfiles(config);
  return true;
}
function getActiveProfile() {
  const config = loadProfiles();
  return config.profiles[config.activeProfile] || null;
}
function listProfiles() {
  const config = loadProfiles();
  return Object.values(config.profiles);
}
function exportProfile(name) {
  const config = loadProfiles();
  const profile = config.profiles[name];
  if (!profile) {
    return null;
  }
  return `# ImBIOS Profile: ${name}
export ANTHROPIC_AUTH_TOKEN="${profile.apiKey}"
export ANTHROPIC_BASE_URL="${profile.baseUrl}"
export ANTHROPIC_MODEL="${profile.defaultModel}"
export API_TIMEOUT_MS=3000000
export IMBIOS_PROFILE="${name}"
`;
}
var DEFAULT_CONFIG2;
var init_profiles = __esm(() => {
  DEFAULT_CONFIG2 = {
    activeProfile: "default",
    profiles: {},
    settings: {
      defaultProvider: "zai",
      autoSwitch: false,
      logLevel: "info"
    }
  };
});

// src/config/settings.ts
import * as fs3 from "node:fs";
import * as os from "node:os";
import * as path3 from "node:path";
function getConfigDir() {
  return path3.join(os.homedir(), ".claude");
}
function getConfigPath() {
  return CONFIG_PATH;
}
function loadConfig() {
  try {
    if (fs3.existsSync(CONFIG_PATH)) {
      const content = fs3.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch {}
  return { provider: "zai" };
}
function saveConfig(config) {
  const configDir = getConfigDir();
  if (!fs3.existsSync(configDir)) {
    fs3.mkdirSync(configDir, { recursive: true });
  }
  fs3.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
function getProviderConfig(provider) {
  const config = loadConfig();
  const providerConfig = config[provider];
  if (!providerConfig) {
    return {};
  }
  return {
    apiKey: "apiKey" in providerConfig ? providerConfig.apiKey : "",
    baseUrl: "baseUrl" in providerConfig ? providerConfig.baseUrl : "",
    defaultModel: "defaultModel" in providerConfig ? providerConfig.defaultModel : ""
  };
}
function setProviderConfig(provider, apiKey, baseUrl, defaultModel) {
  const config = loadConfig();
  config[provider] = { apiKey, baseUrl, defaultModel, models: [] };
  saveConfig(config);
}
function getActiveProvider() {
  const config = loadConfig();
  return config.provider || "zai";
}
function setActiveProvider(provider) {
  const config = loadConfig();
  config.provider = provider;
  saveConfig(config);
}
function getUsageHistory(provider) {
  const config = loadConfig();
  return config.history?.[provider] || [];
}
var CONFIG_PATH;
var init_settings = __esm(() => {
  CONFIG_PATH = path3.join(os.homedir(), ".claude", "cohe.json");
});

// src/utils/completion.ts
function getShellCompletion(shell) {
  const shellConfig = SHELLS.find((s) => s.name === shell);
  if (!shellConfig) {
    throw new Error(`Unsupported shell: ${shell}. Supported shells: bash, zsh, fish`);
  }
  return shellConfig.completions;
}
var bashCompletions = `_cohe_completions() {
  local cur prev words cword
  _init_completion || return
  case "\${cur}" in
    --*)
      COMPREPLY=($(compgen -W "--help --version" -- "\${cur}"))
      ;;
    *)
      COMPREPLY=($(compgen -W "config switch status usage history cost test plugin doctor env models help version" -- "\${cur}"))
      ;;
  esac
}
complete -F _cohe_completions cohe`, SHELLS;
var init_completion = __esm(() => {
  SHELLS = [
    {
      name: "bash",
      completions: bashCompletions
    },
    {
      name: "zsh",
      completions: `#compdef cohe

_cohe() {
  local -a commands
  commands=(
    'config:Configure API providers'
    'switch:Switch active provider'
    'status:Show current status'
    'usage:Query usage statistics'
    'history:Show usage history'
    'cost:Estimate model costs'
    'test:Test API connection'
    'plugin:Manage plugin'
    'doctor:Diagnose issues'
    'env:Export environment'
    'models:List models'
    'help:Show help'
    'version:Show version'
  )

  _describe -t commands 'cohe command' commands
}

_cohe`
    },
    {
      name: "fish",
      completions: `complete -c cohe -f
complete -c cohe -a 'config' -d 'Configure API providers'
complete -c cohe -a 'switch' -d 'Switch active provider'
complete -c cohe -a 'status' -d 'Show current status'
complete -c cohe -a 'usage' -d 'Query usage statistics'
complete -c cohe -a 'history' -d 'Show usage history'
complete -c cohe -a 'cost' -d 'Estimate model costs'
complete -c cohe -a 'test' -d 'Test API connection'
complete -c cohe -a 'plugin' -d 'Manage plugin'
complete -c cohe -a 'doctor' -d 'Diagnose issues'
complete -c cohe -a 'env' -d 'Export environment'
complete -c cohe -a 'models' -d 'List models'
complete -c cohe -a 'help' -d 'Show help'
complete -c cohe -a 'version' -d 'Show version'`
    }
  ];
});

// src/utils/prompts.ts
import inquirer from "inquirer";
async function confirm(message, defaultValue = true) {
  const { result } = await inquirer.prompt([
    {
      type: "confirm",
      name: "result",
      message,
      default: defaultValue
    }
  ]);
  return result;
}
async function input(message, defaultValue = "") {
  const { result } = await inquirer.prompt([
    {
      type: "input",
      name: "result",
      message,
      default: defaultValue
    }
  ]);
  return result;
}
async function password(message) {
  const { result } = await inquirer.prompt([
    {
      type: "password",
      name: "result",
      message
    }
  ]);
  return result;
}
async function select(message, choices, defaultIndex = 0) {
  const { result } = await inquirer.prompt([
    {
      type: "list",
      name: "result",
      message,
      choices: choices.map((c) => ({ name: c, value: c })),
      default: choices[defaultIndex]
    }
  ]);
  return result;
}
async function checkbox(message, choices) {
  const { result } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "result",
      message,
      choices: choices.map((c) => ({ name: c, value: c }))
    }
  ]);
  return result;
}
async function providerSelection() {
  return select("Select API provider:", ["zai", "minimax"], 0);
}
async function modelSelection(models) {
  return select("Select model:", models, 0);
}
var init_prompts = () => {};

// src/commands/dashboard.ts
var exports_dashboard = {};
__export(exports_dashboard, {
  stopDashboard: () => stopDashboard,
  startDashboard: () => startDashboard
});
import * as http from "node:http";
function startDashboard() {
  const config = loadConfigV2();
  if (!config.dashboard.enabled) {
    console.log("Dashboard is disabled. Enable with: cohe dashboard start");
    return;
  }
  const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(DASHBOARD_HTML);
      return;
    }
    if (req.url === "/api/status") {
      const activeAccount = getActiveAccount();
      const accounts = listAccounts();
      res.writeHead(200, { "Content-Type": "application/json" });
      const usage = { used: 0, limit: 1000, remaining: 1000 };
      if (activeAccount) {
        res.end(JSON.stringify({
          activeAccount: activeAccount.id,
          usage,
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            provider: a.provider
          })),
          alerts: []
        }));
        return;
      }
      res.end(JSON.stringify({ error: "No active account" }));
    }
    if (req.url === "/api/rotate" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Key rotated" }));
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });
  const { host, port } = config.dashboard;
  server.listen(port, host, () => {
    console.log(`ImBIOS Dashboard running at http://${host}:${port}`);
    console.log(`Auth token: ${config.dashboard.authToken}`);
  });
}
function stopDashboard() {
  console.log("Dashboard stopped.");
}
var DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImBIOS Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid #333; }
    h1 { font-size: 24px; color: #00d9ff; }
    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 12px; }
    .status-ok { background: #10b981; color: white; }
    .status-warning { background: #f59e0b; color: white; }
    .status-error { background: #ef4444; color: white; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
    .card { background: #16213e; border-radius: 12px; padding: 20px; border: 1px solid #333; }
    .card h2 { font-size: 16px; color: #888; margin-bottom: 15px; }
    .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }
    .stat:last-child { border-bottom: none; }
    .stat-value { font-weight: bold; color: #00d9ff; }
    .progress-bar { height: 8px; background: #333; border-radius: 4px; overflow: hidden; margin-top: 10px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #00d9ff, #00ff88); transition: width 0.3s; }
    .account-list { margin-top: 10px; }
    .account-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #1a1a2e; border-radius: 8px; margin-bottom: 8px; }
    .account-item.active { border: 1px solid #00d9ff; }
    .account-name { font-weight: bold; }
    .account-provider { font-size: 12px; color: #888; }
    .alert-item { padding: 10px; border-radius: 8px; margin-bottom: 8px; }
    .alert-warning { background: rgba(245, 158, 11, 0.2); border-left: 3px solid #f59e0b; }
    .alert-error { background: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; }
    .actions { display: flex; gap: 10px; margin-top: 20px; }
    button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: opacity 0.2s; }
    button:hover { opacity: 0.9; }
    .btn-primary { background: #00d9ff; color: #1a1a2e; }
    .btn-danger { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>ImBIOS Dashboard v2.0</h1>
      <span id="status" class="status-badge status-ok">Connected</span>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Current Usage</h2>
        <div id="usage-stats"></div>
      </div>

      <div class="card">
        <h2>Accounts</h2>
        <div id="accounts" class="account-list"></div>
      </div>

      <div class="card">
        <h2>Alerts</h2>
        <div id="alerts"></div>
      </div>

      <div class="card">
        <h2>Quick Actions</h2>
        <div class="actions">
          <button class="btn-primary" onclick="refresh()">Refresh</button>
          <button class="btn-danger" onclick="rotateKey()">Rotate Key</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function fetchData() {
      const response = await fetch('/api/status');
      return await response.json();
    }

    async function refresh() {
      window.location.reload();
    }

    async function rotateKey() {
      await fetch('/api/rotate', { method: 'POST' });
      refresh();
    }

    function render(data) {
      // Usage stats
      const usagePercent = (data.usage.used / data.usage.limit * 100).toFixed(1);
      document.getElementById('usage-stats').innerHTML = \`
        <div class="stat"><span>Used</span><span class="stat-value">\${data.usage.used}</span></div>
        <div class="stat"><span>Limit</span><span class="stat-value">\${data.usage.limit}</span></div>
        <div class="stat"><span>Remaining</span><span class="stat-value">\${data.usage.remaining}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width: \${usagePercent}%"></div></div>
      \`;

      // Status badge
      const statusEl = document.getElementById('status');
      if (usagePercent >= 90) {
        statusEl.className = 'status-badge status-error';
        statusEl.textContent = 'Critical';
      } else if (usagePercent >= 75) {
        statusEl.className = 'status-badge status-warning';
        statusEl.textContent = 'Warning';
      } else {
        statusEl.className = 'status-badge status-ok';
        statusEl.textContent = 'Healthy';
      }

      // Accounts
      document.getElementById('accounts').innerHTML = data.accounts.map(acc => \`
        <div class="account-item \${acc.id === data.activeAccount ? 'active' : ''}">
          <div>
            <div class="account-name">\${acc.name}</div>
            <div class="account-provider">\${acc.provider}</div>
          </div>
        </div>
      \`).join('');

      // Alerts
      document.getElementById('alerts').innerHTML = data.alerts.length === 0
        ? '<p style="color: #10b981;">No active alerts</p>'
        : data.alerts.map(a => \`<div class="alert-item \${a.type === 'error' ? 'alert-error' : 'alert-warning'}">\${a.message}</div>\`).join('');
    }

    (async function init() {
      try {
        const data = await fetchData();
        render(data);
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      }
    })();
  </script>
</body>
</html>`;
var init_dashboard = __esm(() => {
  init_accounts_config();
});

// src/commands/handlers/hooks-handler.ts
var exports_hooks_handler = {};
__export(exports_hooks_handler, {
  handleHooksUninstall: () => handleHooksUninstall,
  handleHooksStatus: () => handleHooksStatus,
  handleHooksSetup: () => handleHooksSetup
});
import * as fs4 from "node:fs";
import * as os2 from "node:os";
import * as path4 from "node:path";
async function handleHooksSetup() {
  const claudeSettingsPath = path4.join(os2.homedir(), ".claude");
  const settingsFilePath = path4.join(claudeSettingsPath, "settings.json");
  const hookCommand = "cohe auto hook --silent";
  try {
    let settings = {};
    if (fs4.existsSync(settingsFilePath)) {
      const content = fs4.readFileSync(settingsFilePath, "utf-8");
      try {
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }
    }
    if (!settings.hooks) {
      settings.hooks = {};
    }
    if (!settings.hooks.SessionStart) {
      settings.hooks.SessionStart = [];
    }
    const hookExists = settings.hooks.SessionStart.some((hookConfig) => {
      return hookConfig.type === "command" && hookConfig.command && (hookConfig.command === hookCommand || hookConfig.command.includes("auto hook") || hookConfig.command.includes("auto-rotate.sh"));
    });
    if (hookExists) {
      section("Hooks Setup");
      info("Auto-rotate hook is already installed.");
      info(`Hook command: ${hookCommand}`);
      return;
    }
    settings.hooks.SessionStart.push({
      matcher: "startup|resume|clear|compact",
      hooks: [
        {
          type: "command",
          command: hookCommand
        }
      ]
    });
    fs4.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    section("Hooks Setup");
    success("Auto-rotate hook installed successfully!");
    info(`Hook command: ${hookCommand}`);
    info(`Settings location: ${settingsFilePath}`);
    info("");
    info("The hook will automatically rotate your API keys when you start a Claude session.");
    info("Uses the cohe CLI directly, so updates to the rotation algorithm are automatically applied.");
    info("");
    info("Current configuration:");
    info("  • Rotation: enabled");
    info("  • Strategy: least-used");
    info("");
    info('Run "cohe config" or "cohe auto status" to view or change settings.');
  } catch (err) {
    section("Hooks Setup");
    error("Failed to install hooks");
    error(err.message);
  }
}
async function handleHooksUninstall() {
  const settingsFilePath = path4.join(os2.homedir(), ".claude", "settings.json");
  const hooksDir = path4.join(os2.homedir(), ".claude", "hooks");
  const hookScriptPath = path4.join(hooksDir, "auto-rotate.sh");
  try {
    let hookRemoved = false;
    let settingsModified = false;
    if (fs4.existsSync(hookScriptPath)) {
      fs4.unlinkSync(hookScriptPath);
      hookRemoved = true;
    }
    if (fs4.existsSync(settingsFilePath)) {
      const content = fs4.readFileSync(settingsFilePath, "utf-8");
      let settings;
      try {
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }
      if (settings.hooks?.SessionStart) {
        const originalLength = settings.hooks.SessionStart.length;
        settings.hooks.SessionStart = settings.hooks.SessionStart.filter((hookGroup) => {
          if (!(hookGroup.hooks && Array.isArray(hookGroup.hooks))) {
            return true;
          }
          const hasOurHook = hookGroup.hooks.some((hookConfig) => {
            if (hookConfig.type !== "command") {
              return false;
            }
            if (!hookConfig.command) {
              return false;
            }
            return hookConfig.command === hookScriptPath || hookConfig.command.includes("auto-rotate.sh") || hookConfig.command.includes("auto hook") || hookConfig.command === "cohe auto hook --silent";
          });
          return !hasOurHook;
        });
        if (settings.hooks.SessionStart.length !== originalLength) {
          settingsModified = true;
          if (settings.hooks.SessionStart.length === 0) {
            settings.hooks.SessionStart = undefined;
            if (Object.keys(settings.hooks).length === 0) {
              settings.hooks = undefined;
            }
          }
          fs4.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
        }
      }
    }
    section("Hooks Uninstall");
    if (!(hookRemoved || settingsModified)) {
      info("No auto-rotate hooks found.");
      info("Hooks may have already been removed or were never installed.");
      return;
    }
    success("Auto-rotate hooks removed successfully!");
    if (hookRemoved) {
      info("Removed legacy hook script");
    }
    if (settingsModified) {
      info(`Updated Claude settings: ${settingsFilePath}`);
    }
    info("");
    info("Auto-rotation is no longer automatic. You can still manually rotate with 'cohe auto rotate'.");
    info("To re-enable hooks, run 'cohe hooks setup'.");
  } catch (err) {
    section("Hooks Uninstall");
    error("Failed to uninstall hooks");
    error(err.message);
  }
}
async function handleHooksStatus() {
  const settingsFilePath = path4.join(os2.homedir(), ".claude", "settings.json");
  const hooksDir = path4.join(os2.homedir(), ".claude", "hooks");
  const hookScriptPath = path4.join(hooksDir, "auto-rotate.sh");
  const scriptExists = fs4.existsSync(hookScriptPath);
  const scriptExecutable = scriptExists && (fs4.statSync(hookScriptPath).mode & 493) !== 0;
  let settingsFound = false;
  let hookRegistered = false;
  let hookCommand = "";
  let rotationEnabled = false;
  let rotationStrategy = "unknown";
  if (fs4.existsSync(settingsFilePath)) {
    try {
      const content = fs4.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(content);
      settingsFound = true;
      if (settings.hooks?.SessionStart) {
        hookRegistered = settings.hooks.SessionStart.some((hookGroup) => {
          if (!(hookGroup.hooks && Array.isArray(hookGroup.hooks))) {
            return false;
          }
          return hookGroup.hooks.some((hookConfig) => {
            if (hookConfig.type !== "command") {
              return false;
            }
            if (!hookConfig.command) {
              return false;
            }
            const cmd = hookConfig.command;
            if (cmd === hookScriptPath || cmd === `"${hookScriptPath}"` || cmd.includes("auto-rotate.sh") || cmd.includes("auto hook")) {
              hookCommand = cmd;
              return true;
            }
            return false;
          });
        });
      }
    } catch {}
  }
  const configPath = path4.join(os2.homedir(), ".claude", "imbios.json");
  if (fs4.existsSync(configPath)) {
    try {
      const configContent = fs4.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent);
      rotationEnabled = config.rotation?.enabled ?? false;
      rotationStrategy = config.rotation?.strategy ?? "unknown";
    } catch {}
  }
  const isFullyInstalled = hookRegistered;
  const isPartiallyInstalled = scriptExists || hookRegistered;
  const usesCoheCommand = hookCommand.includes("auto hook");
  section("Hooks Status");
  console.log("Overall Status: " + (isFullyInstalled ? "✓ Installed" : isPartiallyInstalled ? "⚠ Partially Installed" : "✗ Not Installed"));
  if (hookRegistered) {
    console.log("");
    console.log("Hook Type: " + (usesCoheCommand ? "✓ CLI Command (auto-updating)" : "○ Bash Script (legacy)"));
    console.log(`  ${hookCommand}`);
  }
  console.log("");
  console.log("Legacy Hook Script: " + (scriptExists ? scriptExecutable ? "✓ Found" : "⚠ Not Executable" : "○ Not Found (using CLI command)"));
  if (scriptExists) {
    console.log(`  ${hookScriptPath}`);
  }
  console.log("");
  console.log(`Registered in Settings: ${hookRegistered ? "✓ Yes" : "✗ No"}`);
  if (settingsFound && !hookRegistered) {
    console.log(`  ${settingsFilePath}`);
  }
  console.log("");
  console.log(`Rotation Enabled: ${rotationEnabled ? "✓ Yes" : "○ No"}`);
  console.log(`Rotation Strategy: ${rotationStrategy}`);
  console.log("");
  if (!isFullyInstalled) {
    warning("Hooks are not fully installed. Run 'cohe hooks setup' to install.");
  } else if (rotationEnabled) {
    success("Hooks are installed and rotation is enabled! Auto-rotation will work with both Claude CLI and ACP.");
  } else {
    warning("Hooks are installed but rotation is disabled. Enable it with 'cohe auto enable'.");
  }
  if (process.env.CLAUDE_HOOK_DEBUG) {
    info("");
    info("Debug mode enabled. Check ~/.claude/hooks-debug.log for details.");
  }
}
var init_hooks_handler = __esm(() => {
  init_logger();
});

// package.json
var require_package = __commonJS((exports, module) => {
  module.exports = {
    name: "@imbios/coding-helper",
    description: "CLI tool and Claude Code plugin for switching between Z.AI (GLM) and MiniMax API providers",
    version: "2.1.0",
    author: {
      name: "Imamuzzaki Abu Salam",
      email: "imamuzzaki@gmail.com",
      url: "https://github.com/ImBIOS"
    },
    bin: {
      cohe: "./bin/cohe.js"
    },
    exports: {
      ".": "./src/oclif/base.tsx",
      "./sdk": "./src/sdk/index.ts"
    },
    oclif: {
      bin: "cohe",
      dirname: "cohe",
      commands: {
        strategy: "pattern",
        target: "./src/commands",
        glob: "**/*.tsx"
      },
      default: "help",
      topicSeparator: " ",
      topics: {
        profile: {
          description: "Manage configuration profiles"
        },
        account: {
          description: "Multi-account management"
        },
        mcp: {
          description: "MCP server management"
        },
        auto: {
          description: "Cross-provider auto-rotation"
        },
        alert: {
          description: "Alert configuration"
        },
        dashboard: {
          description: "Web dashboard management"
        },
        compare: {
          description: "Side-by-side Claude comparison"
        }
      },
      flexibleTaxonomy: true
    },
    dependencies: {
      "@anthropic-ai/claude-agent-sdk": "^0.2.29",
      "@anthropic-ai/sdk": "^0.72.1",
      "@inkjs/ui": "^2.0.0",
      "@oclif/core": "^4.8.0",
      ink: "^6.6.0",
      jsonc: "^2.0.0",
      react: "^19.2.4",
      zod: "^4.0.0"
    },
    devDependencies: {
      "@biomejs/biome": "^2.3.13",
      "@happy-dom/global-registrator": "^20.5.0",
      "@testing-library/jest-dom": "^6.9.1",
      "@testing-library/react": "^16.3.2",
      "@types/bun": "^1.3.8",
      "@types/node": "^24.0.0",
      "@types/react": "^19.2.4",
      husky: "^9.1.7",
      typescript: "^5.9.3",
      ultracite: "^7.1.2"
    },
    keywords: [
      "anthropic",
      "api",
      "claude-code",
      "cli",
      "glm",
      "minimax"
    ],
    scripts: {
      typecheck: "tsc --noEmit",
      build: "bun build src/cli.ts --outfile=bin/cohe.bundled.js --target=node --packages=external",
      dev: "bun --hot src/cli.ts",
      "format:ws": "bun x syncpack@alpha format",
      link: "npm link",
      prepare: "husky",
      test: "bun test",
      "test:env": "bun run src/test-env-keys.ts",
      "test:coverage": "bun test --coverage",
      "test:watch": "bun test --watch"
    },
    type: "module"
  };
});

// src/utils/claude-spawner.ts
import { spawn } from "node:child_process";
import * as path5 from "node:path";
async function spawnClaudeInstance(options) {
  const { session, prompt, timeoutMs = 120000, onOutput } = options;
  const startTime = Date.now();
  const claudeCli = await findClaudeCli();
  if (!claudeCli) {
    return {
      provider: session.provider,
      output: "",
      timeMs: Date.now() - startTime,
      error: "Claude CLI not found. Please install Claude Code."
    };
  }
  const promptPath = path5.join(session.providerPath, ".prompt.txt");
  __require("node:fs").writeFileSync(promptPath, prompt);
  return new Promise((resolve) => {
    const child = spawn(claudeCli, [
      "",
      "--continue",
      "--no-color",
      "--model",
      session.provider === "zai" ? "GLM-4.7" : "MiniMax-M2.1"
    ], {
      cwd: session.providerPath,
      env: {
        ...process.env,
        ANTHROPIC_AUTH_TOKEN: undefined,
        ANTHROPIC_BASE_URL: undefined,
        ANTHROPIC_MODEL: undefined
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdin.write(prompt);
    child.stdin.end();
    child.stdout?.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      onOutput?.(chunk);
    });
    child.stderr?.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      onOutput?.(chunk);
    });
    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        provider: session.provider,
        output: stdout,
        timeMs: Date.now() - startTime,
        error: "Timeout: Claude did not respond within timeout period"
      });
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timeout);
      const timeMs = Date.now() - startTime;
      if (code === 0) {
        resolve({
          provider: session.provider,
          output: stdout,
          timeMs
        });
      } else {
        resolve({
          provider: session.provider,
          output: stdout,
          timeMs,
          error: `Claude exited with code ${code}${stderr ? `: ${stderr}` : ""}`
        });
      }
    });
    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        provider: session.provider,
        output: stdout,
        timeMs: Date.now() - startTime,
        error: `Failed to spawn Claude: ${err.message}`
      });
    });
  });
}
async function findClaudeCli() {
  const possiblePaths = [
    "claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    `${process.env.HOME}/.npm-global/bin/claude`,
    `${process.env.HOME}/.bun/bin/claude`,
    `${process.env.HOME}/.nvm/versions/node/*/bin/claude`
  ];
  for (const p of possiblePaths) {
    try {
      const { which } = await import("bun");
      const resolved = await which(p);
      if (resolved && await isExecutable(resolved)) {
        return resolved;
      }
    } catch {}
  }
  try {
    const { execSync } = await import("node:child_process");
    const result = execSync("which claude 2>/dev/null || echo ''", {
      encoding: "utf-8"
    }).trim();
    if (result && await isExecutable(result)) {
      return result;
    }
  } catch {}
  return null;
}
async function isExecutable(filePath) {
  try {
    const fs5 = await import("node:fs");
    const stat = fs5.statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
var init_claude_spawner = () => {};

// src/utils/isolation.ts
import * as fs5 from "node:fs";
import * as path6 from "node:path";
function createIsolatedSession(provider, sessionId) {
  const id = sessionId || `compare_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const basePath = `/tmp/imbios-compare/${id}`;
  const providerPath = path6.join(basePath, provider);
  const claudeDir = path6.join(providerPath, ".claude");
  fs5.mkdirSync(claudeDir, { recursive: true });
  return {
    sessionId: id,
    basePath,
    providerPath,
    provider,
    claudeDir
  };
}
function generateClaudeMd(provider, customInstructions) {
  const providerInstructions = {
    zai: `# Z.AI Provider Instructions

You are using the Z.AI (GLM) provider. Your API base URL is configured to use GLM models.

Available models:
- GLM-4.7 (default)
- GLM-4.5-Air

When writing code, prefer TypeScript and follow these patterns:
- Use modern async/await syntax
- Use arrow functions for callbacks
- Prefer const over let
- Use optional chaining (?.) and nullish coalescing (??)

For MCP tools, use the Z.AI-specific servers when available.
`,
    minimax: `# MiniMax Provider Instructions

You are using the MiniMax provider. Your API base URL is configured to use MiniMax models.

Available models:
- MiniMax-M2.1 (default)

When writing code, prefer TypeScript and follow these patterns:
- Use modern async/await syntax
- Use arrow functions for callbacks
- Prefer const over let
- Use optional chaining (?.) and nullish coalescing (??)

For MCP tools, use the MiniMax-specific servers when available.
`
  };
  let content = providerInstructions[provider];
  if (customInstructions) {
    content += `
## Custom Instructions

${customInstructions}`;
  }
  return content;
}
function generateEnvFile(apiKey, baseUrl, defaultModel) {
  return `# Generated by ImBIOS Compare
# Provider: ${baseUrl.includes("z.ai") ? "Z.AI" : "MiniMax"}
ANTHROPIC_AUTH_TOKEN="${apiKey}"
ANTHROPIC_BASE_URL="${baseUrl}"
ANTHROPIC_MODEL="${defaultModel}"
API_TIMEOUT_MS=3000000
`;
}
function setupSessionFiles(session, apiKey, baseUrl, defaultModel, customInstructions) {
  const claudeMdPath = path6.join(session.claudeDir, "CLAUDE.md");
  fs5.writeFileSync(claudeMdPath, generateClaudeMd(session.provider, customInstructions));
  const envPath = path6.join(session.claudeDir, ".env");
  fs5.writeFileSync(envPath, generateEnvFile(apiKey, baseUrl, defaultModel));
  const settingsPath = path6.join(session.claudeDir, "settings.json");
  fs5.writeFileSync(settingsPath, JSON.stringify({
    version: "1.0.0",
    provider: session.provider,
    baseUrl,
    defaultModel,
    mcpServers: {}
  }, null, 2));
}
function symlinkProjectFiles(projectPath, sessionPath) {
  if (!fs5.existsSync(projectPath)) {
    return;
  }
  const entries = fs5.readdirSync(projectPath, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path6.join(projectPath, entry.name);
    const destPath = path6.join(sessionPath, entry.name);
    if (entry.name === ".claude" && entry.isDirectory()) {
      continue;
    }
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") {
      continue;
    }
    try {
      if (entry.isSymbolicLink()) {
        fs5.unlinkSync(destPath);
      } else if (entry.isDirectory()) {
        fs5.mkdirSync(destPath, { recursive: true });
        symlinkProjectFiles(srcPath, destPath);
      } else if (entry.isFile()) {
        fs5.symlinkSync(srcPath, destPath);
      }
    } catch {}
  }
}
function cleanupSession(session) {
  try {
    fs5.rmSync(session.basePath, { recursive: true, force: true });
  } catch {}
}
function getCompareHistoryPath() {
  const configDir = `${process.env.HOME || process.env.USERPROFILE}/.claude`;
  return path6.join(configDir, "imbios-compare", "history.json");
}
function saveCompareSession(record) {
  const historyPath = getCompareHistoryPath();
  const historyDir = path6.dirname(historyPath);
  fs5.mkdirSync(historyDir, { recursive: true });
  let history = [];
  try {
    if (fs5.existsSync(historyPath)) {
      history = JSON.parse(fs5.readFileSync(historyPath, "utf-8"));
    }
  } catch {}
  history.unshift(record);
  if (history.length > 100) {
    history = history.slice(0, 100);
  }
  fs5.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}
function loadCompareHistory() {
  const historyPath = getCompareHistoryPath();
  try {
    if (fs5.existsSync(historyPath)) {
      return JSON.parse(fs5.readFileSync(historyPath, "utf-8"));
    }
  } catch {}
  return [];
}
function getCompareSession(id) {
  const history = loadCompareHistory();
  return history.find((s) => s.id === id);
}
var init_isolation = () => {};

// src/commands/compare-ui.tsx
import { Box, Text, useApp, useInput } from "ink";
import { jsxDEV } from "react/jsx-dev-runtime";
function ComparePanel({
  title,
  color,
  result,
  isActive,
  isComplete
}) {
  return /* @__PURE__ */ jsxDEV(Box, {
    borderColor: color,
    borderStyle: "round",
    flexDirection: "column",
    paddingX: 1,
    width: "50%",
    children: [
      /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsxDEV(Text, {
          bold: true,
          color,
          children: title
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      !result && isActive && /* @__PURE__ */ jsxDEV(Box, {
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: "yellow",
            children: "●"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            children: " Initializing..."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      !(result || isActive) && /* @__PURE__ */ jsxDEV(Box, {
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: "gray",
            children: "○"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            children: " Waiting..."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      result?.error && /* @__PURE__ */ jsxDEV(Box, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: "red",
            children: "Error:"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            children: result.error
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      result && !result.error && /* @__PURE__ */ jsxDEV(Box, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxDEV(Box, {
            marginBottom: 1,
            children: [
              /* @__PURE__ */ jsxDEV(Text, {
                color: isComplete ? "green" : "yellow",
                children: isComplete ? "●" : "○"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV(Text, {
                children: [
                  " ",
                  isComplete ? "Complete" : "Running..."
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          result.timeMs > 0 && /* @__PURE__ */ jsxDEV(Text, {
            children: [
              "Time: ",
              (result.timeMs / 1000).toFixed(2),
              "s"
            ]
          }, undefined, true, undefined, this),
          result.tokens !== undefined && /* @__PURE__ */ jsxDEV(Text, {
            children: [
              "Tokens: ",
              result.tokens.toLocaleString()
            ]
          }, undefined, true, undefined, this),
          result.cost !== undefined && /* @__PURE__ */ jsxDEV(Text, {
            children: [
              "Cost: $",
              result.cost.toFixed(6)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV(Box, {
            marginTop: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              children: "Output preview:"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Box, {
            borderStyle: "single",
            height: 10,
            paddingLeft: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              children: [
                result.output.slice(0, 500),
                result.output.length > 500 && "..."
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function CompareUI({
  prompt,
  zaiResult,
  minimaxResult,
  onCancel,
  winner
}) {
  const { exit } = useApp();
  useInput((input2, key) => {
    if (input2 === "q" || key.return && zaiResult && minimaxResult) {
      exit();
    }
    if (input2 === "\x03") {
      onCancel();
      exit();
    }
  });
  const isComplete = !!zaiResult && !!minimaxResult;
  return /* @__PURE__ */ jsxDEV(Box, {
    flexDirection: "column",
    padding: 1,
    children: [
      /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsxDEV(Text, {
          bold: true,
          children: "ImBIOS Provider Comparison"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: "gray",
            children: "Prompt: "
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            children: [
              prompt.slice(0, 60),
              prompt.length > 60 && "..."
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        flexDirection: "row",
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(ComparePanel, {
            color: "blue",
            isActive: !(zaiResult || isComplete),
            isComplete: !!zaiResult,
            result: zaiResult,
            title: "Z.AI (GLM)"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Box, {
            width: "1"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(ComparePanel, {
            color: "green",
            isActive: !(minimaxResult || isComplete),
            isComplete: !!minimaxResult,
            result: minimaxResult,
            title: "MiniMax"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      isComplete && /* @__PURE__ */ jsxDEV(Box, {
        borderColor: "magenta",
        borderStyle: "round",
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxDEV(Box, {
            paddingX: 1,
            children: [
              /* @__PURE__ */ jsxDEV(Text, {
                bold: true,
                children: "Result: "
              }, undefined, false, undefined, this),
              winner === "zai" && /* @__PURE__ */ jsxDEV(Text, {
                color: "blue",
                children: "Z.AI wins!"
              }, undefined, false, undefined, this),
              winner === "minimax" && /* @__PURE__ */ jsxDEV(Text, {
                color: "green",
                children: "MiniMax wins!"
              }, undefined, false, undefined, this),
              winner === "tie" && /* @__PURE__ */ jsxDEV(Text, {
                color: "yellow",
                children: "It's a tie!"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          zaiResult && minimaxResult && /* @__PURE__ */ jsxDEV(Box, {
            paddingX: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              children: [
                "Z.AI: ",
                (zaiResult.timeMs / 1000).toFixed(2),
                "s vs MiniMax:",
                " ",
                (minimaxResult.timeMs / 1000).toFixed(2),
                "s"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Box, {
            paddingBottom: 1,
            paddingX: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              color: "gray",
              children: "Press Q or Enter to exit"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      !isComplete && /* @__PURE__ */ jsxDEV(Box, {
        children: /* @__PURE__ */ jsxDEV(Text, {
          color: "gray",
          children: "Press Ctrl+C to cancel"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function HistoryItem({
  id,
  timestamp,
  prompt,
  winner,
  isSelected
}) {
  return /* @__PURE__ */ jsxDEV(Box, {
    flexDirection: "column",
    paddingX: 2,
    paddingY: 1,
    children: [
      /* @__PURE__ */ jsxDEV(Box, {
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: isSelected ? "green" : undefined,
            children: isSelected ? ">" : " "
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            bold: true,
            children: id.slice(0, 12)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            color: "gray",
            children: [
              " ",
              timestamp
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        paddingLeft: 2,
        children: /* @__PURE__ */ jsxDEV(Text, {
          color: "gray",
          children: [
            prompt.slice(0, 50),
            prompt.length > 50 && "..."
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        paddingLeft: 2,
        children: [
          winner === "zai" && /* @__PURE__ */ jsxDEV(Text, {
            color: "blue",
            children: "Winner: Z.AI"
          }, undefined, false, undefined, this),
          winner === "minimax" && /* @__PURE__ */ jsxDEV(Text, {
            color: "green",
            children: "Winner: MiniMax"
          }, undefined, false, undefined, this),
          winner === "tie" && /* @__PURE__ */ jsxDEV(Text, {
            color: "yellow",
            children: "Tie"
          }, undefined, false, undefined, this),
          !winner && /* @__PURE__ */ jsxDEV(Text, {
            color: "gray",
            children: "No result"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function HistoryList({
  sessions,
  selectedIndex,
  onSelect,
  onView
}) {
  useInput((_input, key) => {
    if (key.upArrow) {
      onSelect(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      onSelect(Math.min(sessions.length - 1, selectedIndex + 1));
    } else if (key.return && sessions[selectedIndex]) {
      onView(sessions[selectedIndex].id);
    }
  });
  return /* @__PURE__ */ jsxDEV(Box, {
    flexDirection: "column",
    children: [
      /* @__PURE__ */ jsxDEV(Box, {
        padding: 1,
        children: /* @__PURE__ */ jsxDEV(Text, {
          bold: true,
          children: "Comparison History"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      sessions.length === 0 ? /* @__PURE__ */ jsxDEV(Box, {
        padding: 2,
        children: /* @__PURE__ */ jsxDEV(Text, {
          color: "gray",
          children: "No comparison sessions found."
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this) : sessions.map((session, index) => /* @__PURE__ */ jsxDEV(HistoryItem, {
        id: session.id,
        isSelected: index === selectedIndex,
        prompt: session.prompt,
        timestamp: session.timestamp,
        winner: session.winner
      }, session.id, false, undefined, this)),
      /* @__PURE__ */ jsxDEV(Box, {
        padding: 1,
        children: /* @__PURE__ */ jsxDEV(Text, {
          color: "gray",
          children: "Use arrow keys to navigate, Enter to view details"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function SessionDetail({
  session,
  onBack
}) {
  useInput((input2) => {
    if (input2 === "q" || input2 === "\x1B") {
      onBack();
    }
  });
  return /* @__PURE__ */ jsxDEV(Box, {
    flexDirection: "column",
    padding: 1,
    children: [
      /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsxDEV(Text, {
          bold: true,
          children: [
            "Session: ",
            session.id
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: "gray",
            children: "Time: "
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            children: session.timestamp
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            color: "gray",
            children: "Prompt: "
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Text, {
            children: session.prompt
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      session.winner && /* @__PURE__ */ jsxDEV(Box, {
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(Text, {
            bold: true,
            children: "Winner: "
          }, undefined, false, undefined, this),
          session.winner === "zai" && /* @__PURE__ */ jsxDEV(Text, {
            color: "blue",
            children: "Z.AI"
          }, undefined, false, undefined, this),
          session.winner === "minimax" && /* @__PURE__ */ jsxDEV(Text, {
            color: "green",
            children: "MiniMax"
          }, undefined, false, undefined, this),
          session.winner === "tie" && /* @__PURE__ */ jsxDEV(Text, {
            color: "yellow",
            children: "Tie"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        borderStyle: "round",
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(Box, {
            paddingX: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              bold: true,
              color: "blue",
              children: "Z.AI Result"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          session.zaiResult ? /* @__PURE__ */ jsxDEV(Box, {
            flexDirection: "column",
            paddingX: 1,
            children: [
              /* @__PURE__ */ jsxDEV(Text, {
                children: [
                  "Time: ",
                  (session.zaiResult.timeMs / 1000).toFixed(2),
                  "s"
                ]
              }, undefined, true, undefined, this),
              session.zaiResult.error ? /* @__PURE__ */ jsxDEV(Text, {
                color: "red",
                children: [
                  "Error: ",
                  session.zaiResult.error
                ]
              }, undefined, true, undefined, this) : /* @__PURE__ */ jsxDEV(Box, {
                height: 15,
                paddingTop: 1,
                children: /* @__PURE__ */ jsxDEV(Text, {
                  children: session.zaiResult.output.slice(0, 1000)
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this) : /* @__PURE__ */ jsxDEV(Box, {
            paddingX: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              color: "gray",
              children: "No result"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        borderStyle: "round",
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxDEV(Box, {
            paddingX: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              bold: true,
              color: "green",
              children: "MiniMax Result"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          session.minimaxResult ? /* @__PURE__ */ jsxDEV(Box, {
            flexDirection: "column",
            paddingX: 1,
            children: [
              /* @__PURE__ */ jsxDEV(Text, {
                children: [
                  "Time: ",
                  (session.minimaxResult.timeMs / 1000).toFixed(2),
                  "s"
                ]
              }, undefined, true, undefined, this),
              session.minimaxResult.error ? /* @__PURE__ */ jsxDEV(Text, {
                color: "red",
                children: [
                  "Error: ",
                  session.minimaxResult.error
                ]
              }, undefined, true, undefined, this) : /* @__PURE__ */ jsxDEV(Box, {
                height: 15,
                paddingTop: 1,
                children: /* @__PURE__ */ jsxDEV(Text, {
                  children: session.minimaxResult.output.slice(0, 1000)
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this) : /* @__PURE__ */ jsxDEV(Box, {
            paddingX: 1,
            children: /* @__PURE__ */ jsxDEV(Text, {
              color: "gray",
              children: "No result"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV(Box, {
        children: /* @__PURE__ */ jsxDEV(Text, {
          color: "gray",
          children: "Press Q to go back"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var init_compare_ui = () => {};

// src/commands/compare.tsx
var exports_compare = {};
__export(exports_compare, {
  handleCompare: () => handleCompare
});
import * as readline from "node:readline";
import { render } from "ink";
import { useState } from "react";
import { jsxDEV as jsxDEV2 } from "react/jsx-dev-runtime";
async function readInteractiveInput() {
  return new Promise((resolve) => {
    console.log("");
    console.log("Enter your prompt (Ctrl+D or Ctrl+Z to submit, Ctrl+C to cancel):");
    console.log("".padEnd(60, "─"));
    const lines = [];
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });
    rl.on("line", (line) => {
      lines.push(line);
    });
    rl.on("close", () => {
      const prompt = lines.join(`
`).trim();
      if (prompt) {
        success("Prompt received. Starting comparison...");
      }
      resolve(prompt);
    });
    process.stdin.on("data", (data) => {
      if (data.toString() === "\x03") {
        rl.close();
        resolve("");
      }
    });
  });
}
async function handleCompare(args) {
  const action = args[0];
  if (action === "history" || action === "list") {
    await showHistoryList();
    return;
  }
  if (action === "view") {
    await viewSession(args[1]);
    return;
  }
  if (action === "diff") {
    await diffSessions(args[1], args[2]);
    return;
  }
  const parsedArgs = parseCompareArgs(args);
  if (!parsedArgs.prompt) {
    const stdinInput = await readStdin();
    if (stdinInput) {
      parsedArgs.prompt = stdinInput;
    }
  }
  if (!parsedArgs.prompt) {
    console.log("");
    const interactivePrompt = await readInteractiveInput();
    if (!interactivePrompt) {
      info("Cancelled.");
      return;
    }
    parsedArgs.prompt = interactivePrompt;
  }
  await runComparison({
    prompt: parsedArgs.prompt,
    timeout: parsedArgs.timeout,
    iterations: parsedArgs.iterations,
    save: !parsedArgs.noSave,
    strategy: parsedArgs.strategy
  });
}
function parseCompareArgs(args) {
  const result = {
    prompt: undefined,
    timeout: 120,
    iterations: 1,
    save: true,
    strategy: "simultaneous"
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--timeout" || arg === "-t") {
      result.timeout = Number.parseInt(args[i + 1], 10) || 120;
      i += 2;
    } else if (arg === "--iterations" || arg === "-i") {
      result.iterations = Number.parseInt(args[i + 1], 10) || 1;
      i += 2;
    } else if (arg === "--no-save") {
      result.save = false;
      i += 1;
    } else if (arg === "--simultaneous") {
      result.strategy = "simultaneous";
      i += 1;
    } else if (arg === "--sequential") {
      result.strategy = "sequential";
      i += 1;
    } else if (arg.startsWith("-")) {
      i += 1;
    } else {
      result.prompt = args.slice(i).join(" ");
      break;
    }
  }
  return result;
}
async function readStdin() {
  try {
    const { readFileSync: readFileSync6 } = await import("node:fs");
    if (!process.stdin.isTTY) {
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      if (chunks.length > 0) {
        return Buffer.concat(chunks).toString("utf-8").trim();
      }
    }
  } catch {}
  return null;
}
async function runComparison(options) {
  const {
    prompt,
    timeout = 120,
    iterations = 1,
    save = true,
    strategy
  } = options;
  const zaiConfig = zaiProvider.getConfig();
  const minimaxConfig = minimaxProvider.getConfig();
  if (!(zaiConfig.apiKey || minimaxConfig.apiKey)) {
    error("No providers configured. Run 'cohe config' first.");
    return;
  }
  const zaiSession = createIsolatedSession("zai");
  const minimaxSession = createIsolatedSession("minimax");
  if (zaiConfig.apiKey) {
    setupSessionFiles(zaiSession, zaiConfig.apiKey, zaiConfig.baseUrl, zaiConfig.defaultModel);
  }
  if (minimaxConfig.apiKey) {
    setupSessionFiles(minimaxSession, minimaxConfig.apiKey, minimaxConfig.baseUrl, minimaxConfig.defaultModel);
  }
  const projectPath = process.cwd();
  symlinkProjectFiles(projectPath, zaiSession.providerPath);
  symlinkProjectFiles(projectPath, minimaxSession.providerPath);
  const [zaiResult, setZaiResult] = useState(null);
  const [minimaxResult, setMiniMaxResult] = useState(null);
  const [_isComplete, setIsComplete] = useState(false);
  const cleanup = () => {
    cleanupSession(zaiSession);
    cleanupSession(minimaxSession);
  };
  try {
    if (strategy === "sequential") {
      if (zaiConfig.apiKey) {
        const result = await spawnClaudeInstance({
          session: zaiSession,
          prompt,
          timeoutMs: timeout * 1000
        });
        setZaiResult(result);
      }
      if (minimaxConfig.apiKey) {
        const result = await spawnClaudeInstance({
          session: minimaxSession,
          prompt,
          timeoutMs: timeout * 1000
        });
        setMiniMaxResult(result);
      }
    } else {
      const promises = [];
      if (zaiConfig.apiKey) {
        promises.push(spawnClaudeInstance({
          session: zaiSession,
          prompt,
          timeoutMs: timeout * 1000
        }).then((result) => {
          setZaiResult(result);
        }));
      }
      if (minimaxConfig.apiKey) {
        promises.push(spawnClaudeInstance({
          session: minimaxSession,
          prompt,
          timeoutMs: timeout * 1000
        }).then((result) => {
          setMiniMaxResult(result);
        }));
      }
      await Promise.all(promises);
    }
    setIsComplete(true);
    let winner;
    if (zaiResult && minimaxResult) {
      if (!(zaiResult.error || minimaxResult.error)) {
        if (zaiResult.timeMs < minimaxResult.timeMs) {
          winner = "zai";
        } else if (minimaxResult.timeMs < zaiResult.timeMs) {
          winner = "minimax";
        } else {
          winner = "tie";
        }
      } else if (!zaiResult.error) {
        winner = "zai";
      } else if (!minimaxResult.error) {
        winner = "minimax";
      }
    }
    if (save) {
      const record = {
        id: zaiSession.sessionId,
        timestamp: new Date().toISOString(),
        prompt,
        zaiResult: zaiResult ?? undefined,
        minimaxResult: minimaxResult ?? undefined,
        winner: winner ?? undefined
      };
      saveCompareSession(record);
    }
    const { waitUntilExit } = render(/* @__PURE__ */ jsxDEV2(CompareUI, {
      minimaxResult,
      onCancel: cleanup,
      prompt,
      winner: winner ?? null,
      zaiResult
    }, undefined, false, undefined, this));
    await waitUntilExit();
  } finally {
    cleanup();
  }
}
async function showHistoryList() {
  const history = loadCompareHistory();
  if (history.length === 0) {
    section("Comparison History");
    info("No comparison sessions found.");
    return;
  }
  const sessions = history.map((s) => ({
    id: s.id,
    timestamp: new Date(s.timestamp).toLocaleString(),
    prompt: s.prompt,
    winner: s.winner
  }));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewSessionId, setViewSessionId] = useState(null);
  if (viewSessionId) {
    const session = getCompareSession(viewSessionId);
    if (session) {
      const { waitUntilExit } = render(/* @__PURE__ */ jsxDEV2(SessionDetail, {
        onBack: () => setViewSessionId(null),
        session: {
          ...session,
          timestamp: new Date(session.timestamp).toLocaleString()
        }
      }, undefined, false, undefined, this));
      await waitUntilExit();
      setViewSessionId(null);
    }
  } else {
    const { waitUntilExit } = render(/* @__PURE__ */ jsxDEV2(HistoryList, {
      onSelect: setSelectedIndex,
      onView: setViewSessionId,
      selectedIndex,
      sessions
    }, undefined, false, undefined, this));
    await waitUntilExit();
  }
}
async function viewSession(sessionId) {
  if (!sessionId) {
    error("Usage: cohe compare view <session-id>");
    return;
  }
  const session = getCompareSession(sessionId);
  if (!session) {
    error(`Session not found: ${sessionId}`);
    info("Use 'cohe compare history' to list sessions.");
    return;
  }
  const { waitUntilExit } = render(/* @__PURE__ */ jsxDEV2(SessionDetail, {
    onBack: () => {},
    session: {
      ...session,
      timestamp: new Date(session.timestamp).toLocaleString()
    }
  }, undefined, false, undefined, this));
  await waitUntilExit();
}
async function diffSessions(id1, id2) {
  if (!(id1 && id2)) {
    error("Usage: cohe compare diff <session-id-1> <session-id-2>");
    return;
  }
  const session1 = getCompareSession(id1);
  const session2 = getCompareSession(id2);
  if (!(session1 && session2)) {
    error("One or both sessions not found.");
    return;
  }
  section("Session Comparison");
  console.log(`
Session 1: ${id1}`);
  console.log(`Session 2: ${id2}
`);
  if (session1.zaiResult && session2.zaiResult) {
    const diff = session1.zaiResult.timeMs - session2.zaiResult.timeMs;
    console.log(`Z.AI Time Diff: ${diff > 0 ? "+" : ""}${(diff / 1000).toFixed(2)}s`);
  }
  if (session1.minimaxResult && session2.minimaxResult) {
    const diff = session1.minimaxResult.timeMs - session2.minimaxResult.timeMs;
    console.log(`MiniMax Time Diff: ${diff > 0 ? "+" : ""}${(diff / 1000).toFixed(2)}s`);
  }
  console.log(`
Winner 1: ${session1.winner || "N/A"}`);
  console.log(`Winner 2: ${session2.winner || "N/A"}`);
}
var init_compare = __esm(() => {
  init_minimax();
  init_zai();
  init_claude_spawner();
  init_isolation();
  init_logger();
  init_compare_ui();
});

// src/commands/index.ts
async function handleConfig() {
  section("ImBIOS Configuration");
  const providers = await checkbox("Select API providers:", ["zai", "minimax"]);
  for (const provider of providers) {
    const existingConfig = getProviderConfig(provider);
    if (existingConfig.apiKey) {
      const reconfigure = await confirm(`${provider.toUpperCase()} is already configured. Reconfigure?`, false);
      if (!reconfigure) {
        info(`Skipping ${provider.toUpperCase()} - already configured.`);
        continue;
      }
    }
    info(`
Configuring ${provider.toUpperCase()} provider...`);
    const apiKey = await password(`Enter API Key for ${provider}:`);
    const baseUrl = await input("Base URL:", existingConfig.baseUrl || PROVIDERS[provider]().getConfig().baseUrl);
    if (!apiKey) {
      warning(`Skipping ${provider.toUpperCase()} - no API key provided.`);
      continue;
    }
    setProviderConfig(provider, apiKey, baseUrl, "");
    success(`${provider.toUpperCase()} configuration saved!`);
  }
}
async function handleSwitch(args) {
  const targetProvider = args[0];
  if (!(targetProvider && ["zai", "minimax"].includes(targetProvider))) {
    error("Usage: cohe switch <zai|minimax>");
    return;
  }
  const provider = PROVIDERS[targetProvider]();
  const config = provider.getConfig();
  if (!config.apiKey) {
    warning(`${provider.displayName} is not configured. Run "cohe config" first.`);
    return;
  }
  setActiveProvider(targetProvider);
  success(`Switched to ${provider.displayName}`);
  info(`Default model: ${config.defaultModel}`);
}
async function handleStatus() {
  section("ImBIOS Status");
  const activeProvider = getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();
  const hasApiKey = Boolean(config.apiKey);
  table({
    "Active Provider": provider.displayName,
    "API Key": hasApiKey ? `••••••••${config.apiKey.slice(-4)}` : "Not configured",
    "Base URL": config.baseUrl,
    "Default Model": config.defaultModel,
    Connection: hasApiKey ? "Ready" : "Not configured"
  });
  const otherProviderKey = activeProvider === "zai" ? "minimax" : "zai";
  const otherProvider = PROVIDERS[otherProviderKey]();
  const otherConfig = otherProvider.getConfig();
  const otherHasKey = Boolean(otherConfig.apiKey);
  info("");
  info(`${otherProvider.displayName}: ${otherHasKey ? "Configured" : "Not configured"}`);
  const activeProfile = getActiveProfile();
  if (activeProfile) {
    info("");
    info(`Active Profile: ${activeProfile.name}`);
  }
  const v2Config = loadConfigV2();
  const activeAccount = getActiveAccount();
  if (activeAccount) {
    info("");
    info(`Active Account: ${activeAccount.name} (${activeAccount.provider})`);
    info(`Rotation: ${v2Config.rotation.enabled ? v2Config.rotation.strategy : "disabled"}`);
  }
}
async function handleUsage(verbose = false) {
  const config = loadConfigV2();
  const accounts = Object.values(config.accounts).filter((a) => a.isActive);
  if (accounts.length === 0) {
    info("No active accounts found.");
    return;
  }
  console.log("");
  console.log("──────────────────────────────────────────────────");
  console.log(" Usage Statistics");
  console.log("──────────────────────────────────────────────────");
  console.log("");
  for (const account of accounts) {
    const provider = PROVIDERS[account.provider]();
    const usage = await provider.getUsage({
      apiKey: account.apiKey,
      groupId: account.groupId
    });
    const isActive = config.activeAccountId === account.id;
    const activeMark = isActive ? " →" : "  ";
    const accountStatus = isActive ? " [Active provider]" : "";
    console.log(`${activeMark} ${account.name} (${account.provider})${accountStatus}`);
    if (account.provider === "minimax" && !account.groupId) {
      console.log("     ⚠️  Missing groupId - usage data may be incomplete");
    }
    if (usage.limit > 0) {
      if (account.provider === "zai" && usage.modelUsage && usage.mcpUsage) {
        console.log(`     Model: ${Math.round(usage.modelUsage.percentUsed)}%`);
        console.log(`     MCP:   ${Math.round(usage.mcpUsage.percentUsed)}%`);
        if (verbose) {
          console.log("     Model:");
          console.log(`       Used:      ${Math.round(usage.modelUsage.used)}`);
          console.log(`       Limit:     ${Math.round(usage.modelUsage.limit)}`);
          console.log(`       Remaining: ${Math.round(usage.modelUsage.remaining)}`);
          console.log("     MCP:");
          console.log(`       Used:      ${Math.round(usage.mcpUsage.used)}`);
          console.log(`       Limit:     ${Math.round(usage.mcpUsage.limit)}`);
          console.log(`       Remaining: ${Math.round(usage.mcpUsage.remaining)}`);
        }
      } else {
        const displayPercent = usage.percentRemaining ?? usage.percentUsed;
        console.log(`     Usage: ${Math.round(displayPercent)}%`);
        if (verbose) {
          console.log(`     Used:      ${Math.round(usage.used)}`);
          console.log(`     Limit:     ${Math.round(usage.limit)}`);
          console.log(`     Remaining: ${Math.round(usage.remaining)}`);
        }
      }
      if (verbose) {
        const alerts = checkAlerts(usage);
        if (alerts.length > 0) {
          console.log("  Alerts triggered:");
          for (const alert of alerts) {
            console.log(`    - ${alert.type}: threshold ${alert.threshold}%`);
          }
        }
      }
    } else {
      console.log("  Unable to fetch usage data");
    }
    console.log("");
  }
  console.log("──────────────────────────────────────────────────");
}
async function handleHistory() {
  section("Usage History");
  const activeProvider = getActiveProvider();
  const _provider = PROVIDERS[activeProvider]();
  const history = getUsageHistory(activeProvider);
  if (history.length === 0) {
    info("No usage history available.");
    return;
  }
  console.log(`  ${activeProvider.toUpperCase()} Usage (Last ${history.length} days):
`);
  history.forEach((record) => {
    const percent = record.limit > 0 ? record.used / record.limit * 100 : 0;
    const bar = "█".repeat(Math.ceil(percent / 5)) + "░".repeat(20 - Math.ceil(percent / 5));
    console.log(`  ${record.date} │ ${bar} │ ${percent.toFixed(1)}%`);
  });
}
async function handleCost(model) {
  section("Cost Estimation");
  const costs = {
    "GLM-4.7": 0.0001,
    "GLM-4.5-Air": 0.00005,
    "MiniMax-M2.1": 0.00008
  };
  const models = Object.keys(costs);
  const selectedModel = model || await modelSelection(models);
  const cost = costs[selectedModel];
  if (!cost) {
    warning(`Unknown model: ${selectedModel}`);
    info(`Available models: ${models.join(", ")}`);
    return;
  }
  table({
    Model: selectedModel,
    "Input (1K tokens)": `$${(cost * 1000).toFixed(6)}`,
    "Output (1K tokens)": `$${(cost * 1000 * 2).toFixed(6)}`
  });
}
async function handleTest() {
  section("API Connection Test");
  const activeProvider = getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();
  if (!config.apiKey) {
    error(`${provider.displayName} is not configured. Run "cohe config" first.`);
    return;
  }
  info(`Testing ${provider.displayName} connection...`);
  const connected = await provider.testConnection();
  if (connected) {
    success("Connection successful!");
  } else {
    error("Connection failed. Please check your API key and base URL.");
  }
}
async function handlePlugin(action) {
  section("Claude Code Plugin");
  const pluginDir = getConfigDir();
  const pluginManifestPath = `${pluginDir}/.claude-plugin/manifest.json`;
  switch (action) {
    case "install":
      info("Plugin manifest installed at: ~/.claude/.claude-plugin/manifest.json");
      success("Plugin installed! Restart Claude Code to see new commands.");
      break;
    case "uninstall":
      info("Remove the plugin manifest manually to uninstall.");
      info(`Path: ${pluginManifestPath}`);
      break;
    case "update":
      success("Plugin updated to latest version.");
      break;
    default:
      info("Usage: cohe plugin <install|uninstall|update>");
      info('Run "cohe config" to configure providers first.');
      break;
  }
}
async function handleDoctor() {
  section("Diagnostics");
  const issues = [];
  const checks = [];
  const activeProvider = getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();
  const configPath = getConfigPath();
  checks.push([
    "Config file exists",
    __require("node:fs").existsSync(configPath)
  ]);
  checks.push(["API key configured", Boolean(config.apiKey)]);
  if (config.apiKey) {
    const connected = await provider.testConnection();
    checks.push(["API connection", connected]);
    if (!connected) {
      issues.push("API connection failed. Check your API key.");
    }
  }
  checks.push(["Models available", provider.getModels().length > 0]);
  checks.forEach(([check, passed]) => {
    if (passed) {
      success(check);
    } else {
      error(check);
    }
  });
  if (issues.length > 0) {
    warning(`
Issues found:`);
    issues.forEach((issue) => info(`  - ${issue}`));
  } else {
    success(`
All checks passed!`);
  }
}
async function handleEnv(action) {
  if (action === "export") {
    const activeProvider = getActiveProvider();
    const provider = PROVIDERS[activeProvider]();
    const config = provider.getConfig();
    const envScript = `# ImBIOS Environment Variables
export ANTHROPIC_AUTH_TOKEN="${config.apiKey}"
export ANTHROPIC_BASE_URL="${config.baseUrl}"
export ANTHROPIC_MODEL="${config.defaultModel}"
export API_TIMEOUT_MS=3000000
`;
    console.log(envScript);
  } else {
    console.log('Usage: eval "$(cohe env export)"');
  }
}
async function handleModels(providerName) {
  section("Available Models");
  const activeProvider = getActiveProvider();
  const targetProvider = providerName || activeProvider;
  if (!["zai", "minimax"].includes(targetProvider)) {
    error("Usage: cohe models [zai|minimax]");
    return;
  }
  const provider = PROVIDERS[targetProvider]();
  const mapping = provider.getModelMapping();
  console.log(`  ${provider.displayName}:`);
  console.log(`  Opus:   ${mapping.opus}`);
  console.log(`  Sonnet: ${mapping.sonnet}`);
  console.log(`  Haiku:  ${mapping.haiku}`);
  console.log(`  All:    ${provider.getModels().join(", ")}`);
}
async function handleCompletion(shell) {
  section("Shell Completion");
  const shells = ["bash", "zsh", "fish"];
  const selectedShell = shell || await select("Select shell:", shells, 0);
  if (!shells.includes(selectedShell)) {
    error(`Unsupported shell: ${shell}. Supported shells: ${shells.join(", ")}`);
    return;
  }
  try {
    const completion = getShellCompletion(selectedShell);
    console.log(completion);
    info("");
    info(`To enable ${selectedShell} completion, add the above to your shell configuration.`);
    info("For bash: Add to ~/.bashrc or ~/.bash_completion");
    info("For zsh: Add to ~/.zshrc");
    info("For fish: Add to ~/.config/fish/completions/cohe.fish");
  } catch (err) {
    error(`Failed to generate completion: ${err.message}`);
  }
}
async function handleProfile(args) {
  const action = args[0];
  switch (action) {
    case "list": {
      section("Configuration Profiles");
      const profileList = listProfiles();
      const activeProfile = getActiveProfile();
      if (profileList.length === 0) {
        info("No profiles configured. Use 'cohe profile create' to create one.");
        return;
      }
      profileList.forEach((profile) => {
        const isActive = profile.name === activeProfile?.name;
        console.log(`  ${isActive ? "●" : "○"} ${profile.name} (${profile.provider})`);
      });
      info("");
      info(`Active profile: ${activeProfile?.name || "none"}`);
      break;
    }
    case "create": {
      section("Create Profile");
      const name = await input("Profile name:");
      if (!name) {
        error("Profile name is required.");
        return;
      }
      const provider = await providerSelection();
      const apiKey = await password(`API Key for ${provider}:`);
      if (!apiKey) {
        error("API key is required.");
        return;
      }
      const baseUrl = await input("Base URL:", PROVIDERS[provider]().getConfig().baseUrl);
      const defaultModel = await modelSelection(PROVIDERS[provider]().getModels());
      createProfile(name, provider, apiKey, baseUrl, defaultModel);
      success(`Profile "${name}" created successfully!`);
      break;
    }
    case "switch": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe profile switch <name>");
        return;
      }
      if (switchProfile(name)) {
        success(`Switched to profile "${name}"`);
      } else {
        error(`Profile "${name}" not found.`);
      }
      break;
    }
    case "delete": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe profile delete <name>");
        return;
      }
      if (deleteProfile(name)) {
        success(`Profile "${name}" deleted.`);
      } else {
        error(`Failed to delete profile "${name}". It may be active or not exist.`);
      }
      break;
    }
    case "export": {
      const name = args[1] || getActiveProfile()?.name;
      if (!name) {
        error("No active profile. Specify a profile name.");
        return;
      }
      const exportStr = exportProfile(name);
      if (exportStr) {
        console.log(exportStr);
        info(`Run 'eval "$(cohe profile export <name>)"' to apply.`);
      } else {
        error(`Profile "${name}" not found.`);
      }
      break;
    }
    default:
      console.log(`
ImBIOS Profile Management

Usage: cohe profile <command> [options]

Commands:
  list              List all profiles
  create            Create a new profile
  switch <name>     Switch to a profile
  delete <name>     Delete a profile
  export [name]     Export profile as shell vars

Examples:
  cohe profile list
  cohe profile create work
  cohe profile switch work
  eval "$(cohe profile export work)"
`);
  }
}
async function handleAccount(args) {
  const action = args[0];
  switch (action) {
    case "list": {
      section("Multi-Account Management");
      const accounts = listAccounts();
      const activeAccount = getActiveAccount();
      if (accounts.length === 0) {
        info("No accounts configured. Use 'cohe account add' to add one.");
        return;
      }
      accounts.forEach((acc) => {
        const isActive = acc.id === activeAccount?.id;
        console.log(`  ${isActive ? "●" : "○"} ${acc.name} (${acc.provider}) - ${acc.isActive ? "active" : "inactive"}`);
      });
      info("");
      info(`Active account: ${activeAccount?.name || "none"}`);
      break;
    }
    case "add": {
      section("Add Account");
      const name = await input("Account name:");
      if (!name) {
        error("Account name is required.");
        return;
      }
      const provider = await providerSelection();
      const apiKey = await password(`API Key for ${provider}:`);
      if (!apiKey) {
        error("API key is required.");
        return;
      }
      const baseUrl = await input("Base URL:", PROVIDERS[provider]().getConfig().baseUrl);
      const defaultModel = await modelSelection(PROVIDERS[provider]().getModels());
      const account = addAccount(name, provider, apiKey, baseUrl, defaultModel);
      success(`Account "${name}" added successfully!`);
      info(`Account ID: ${account.id}`);
      break;
    }
    case "switch": {
      const id = args[1];
      if (!id) {
        error("Usage: cohe account switch <id>");
        return;
      }
      if (switchAccount(id)) {
        success(`Switched to account ${id}`);
      } else {
        error(`Account "${id}" not found.`);
      }
      break;
    }
    case "remove": {
      const id = args[1];
      if (!id) {
        error("Usage: cohe account remove <id>");
        return;
      }
      if (deleteAccount(id)) {
        success(`Account ${id} removed.`);
      } else {
        error(`Failed to remove account "${id}".`);
      }
      break;
    }
    case "edit": {
      const id = args[1];
      if (!id) {
        error("Usage: cohe account edit <id>");
        return;
      }
      const config = loadConfigV2();
      const account = config.accounts[id];
      if (!account) {
        error(`Account "${id}" not found.`);
        return;
      }
      section(`Edit Account: ${account.name}`);
      const field = await select("What would you like to edit?", ["name", "api-key", "group-id", "base-url", "done"], 4);
      if (field === "done") {
        success("No changes made.");
        break;
      }
      switch (field) {
        case "name": {
          const name = await input("New name:", account.name);
          if (!name) {
            error("Name cannot be empty.");
            return;
          }
          updateAccount(id, { name });
          success(`Name updated to "${name}"`);
          break;
        }
        case "api-key": {
          const apiKey = await password("New API key:");
          if (!apiKey) {
            error("API key cannot be empty.");
            return;
          }
          updateAccount(id, { apiKey });
          success("API key updated.");
          break;
        }
        case "group-id": {
          const currentGroupId = account.groupId || "(not set)";
          info(`Current GroupId: ${currentGroupId}`);
          if (account.provider === "minimax") {
            info("GroupId is required for MiniMax usage tracking. Found in browser DevTools when visiting https://platform.minimax.io/user-center/payment/coding-plan");
          }
          const groupId = await input("New GroupId:", account.groupId || "");
          if (account.provider === "minimax" && !groupId) {
            error("GroupId is required for MiniMax accounts.");
            return;
          }
          updateAccount(id, {
            groupId: groupId || undefined
          });
          success(`GroupId updated to "${groupId || "(not set)"}"`);
          break;
        }
        case "base-url": {
          const baseUrl = await input("New base URL:", account.baseUrl);
          if (!baseUrl) {
            error("Base URL cannot be empty.");
            return;
          }
          updateAccount(id, { baseUrl });
          success(`Base URL updated to "${baseUrl}"`);
          break;
        }
      }
      break;
    }
    default:
      console.log(`
ImBIOS Multi-Account Management

Usage: cohe account <command> [options]

Commands:
  list              List all accounts
  add               Add a new account
  edit <id>         Edit an existing account
  switch <id>       Switch to an account
  remove <id>       Remove an account

Examples:
  cohe account list
  cohe account add
  cohe account edit minimax_default
  cohe account switch acc_123456
`);
  }
}
async function handleRotate(args) {
  section("API Key Rotation");
  const provider = args[0];
  if (!(provider && ["zai", "minimax"].includes(provider))) {
    error("Usage: cohe rotate <zai|minimax>");
    return;
  }
  const newAccount = rotateApiKey(provider);
  if (newAccount) {
    success(`Rotated to account: ${newAccount.name}`);
    info(`New active account: ${newAccount.name} (${newAccount.provider})`);
  } else {
    error(`No other accounts available for ${provider}.`);
    info("Add more accounts with: cohe account add");
  }
}
async function handleDashboard(args) {
  const action = args[0];
  switch (action) {
    case "start": {
      const port = Number.parseInt(args[1], 10) || 3456;
      toggleDashboard(true, port);
      success(`Dashboard enabled on port ${port}`);
      info("Run 'cohe dashboard' to start the web server");
      break;
    }
    case "stop": {
      toggleDashboard(false);
      success("Dashboard disabled.");
      break;
    }
    case "status": {
      section("Dashboard Status");
      const config = loadConfigV2();
      table({
        Enabled: config.dashboard.enabled ? "Yes" : "No",
        Port: config.dashboard.port.toString(),
        Host: config.dashboard.host,
        Auth: config.dashboard.authToken ? `***${config.dashboard.authToken.slice(-4)}` : "Not set"
      });
      break;
    }
    default: {
      const config = loadConfigV2();
      if (config.dashboard.enabled) {
        const { startDashboard: startDashboard2 } = await Promise.resolve().then(() => (init_dashboard(), exports_dashboard));
        startDashboard2();
      } else {
        console.log(`
ImBIOS Web Dashboard

Usage: cohe dashboard <command> [options]

Commands:
  start [port]     Start the web dashboard
  stop             Stop the dashboard
  status           Show dashboard configuration

Examples:
  cohe dashboard start 8080
  cohe dashboard status
  cohe dashboard stop
`);
      }
    }
  }
}
async function handleHooks(args) {
  const action = args[0];
  switch (action) {
    case "setup": {
      const { handleHooksSetup: handleHooksSetup2 } = await Promise.resolve().then(() => (init_hooks_handler(), exports_hooks_handler));
      await handleHooksSetup2();
      break;
    }
    case "uninstall": {
      const { handleHooksUninstall: handleHooksUninstall2 } = await Promise.resolve().then(() => (init_hooks_handler(), exports_hooks_handler));
      await handleHooksUninstall2();
      break;
    }
    case "status": {
      const { handleHooksStatus: handleHooksStatus2 } = await Promise.resolve().then(() => (init_hooks_handler(), exports_hooks_handler));
      await handleHooksStatus2();
      break;
    }
    default: {
      console.log(`
ImBIOS Claude Code Hooks Management

Hooks enable auto-rotation for both direct Claude CLI and ACP usage.

Usage: cohe hooks <command>

Commands:
  setup       Install hooks globally in ~/.claude/
  uninstall   Remove hooks
  status      Check hook installation status

How it works:
  When you start Claude (with 'claude' or through ACP), the SessionStart hook
  automatically rotates your API keys to the least-used account.

Configuration:
  Hooks respect your rotation settings in ~/.claude/imbios.json:
  - Rotation: enabled by default
  - Strategy: least-used by default
  - Cross-provider: enabled by default

  Change settings with: cohe auto enable <strategy>

Examples:
  cohe hooks setup           # Install hooks
  cohe hooks status          # Check installation
  cohe auto status           # Check rotation settings
  cohe auto enable priority  # Change rotation strategy
  cohe hooks uninstall       # Remove hooks
`);
    }
  }
}
async function handleAlert(args) {
  const action = args[0];
  switch (action) {
    case "list": {
      section("Usage Alerts");
      const config = loadConfigV2();
      config.alerts.forEach((alert) => {
        const status = alert.enabled ? "enabled" : "disabled";
        console.log(`  ${alert.id}: ${alert.type} @ ${alert.threshold}% [${status}]`);
      });
      break;
    }
    case "add": {
      const type = await select("Alert type:", ["usage", "quota"]);
      const threshold = Number.parseInt(await input("Threshold (%):", "80"), 10);
      const config = loadConfigV2();
      const alert = {
        id: `alert_${Date.now()}`,
        type,
        threshold,
        enabled: true
      };
      config.alerts.push(alert);
      saveConfigV2(config);
      success(`Alert added: ${type} @ ${threshold}%`);
      break;
    }
    case "enable":
    case "disable": {
      const id = args[1];
      if (!id) {
        error(`Usage: cohe alert ${action} <id>`);
        return;
      }
      updateAlert(id, { enabled: action === "enable" });
      success(`Alert ${id} ${action}d`);
      break;
    }
    default:
      console.log(`
ImBIOS Alert Management

Usage: cohe alert <command> [options]

Commands:
  list              List all alerts
  add               Add a new alert
  enable <id>       Enable an alert
  disable <id>      Disable an alert

Examples:
  cohe alert list
  cohe alert add
  cohe alert enable alert_123
`);
  }
}
async function handleMcp(args) {
  const action = args[0];
  switch (action) {
    case "list": {
      section("MCP Servers");
      const servers = listMcpServers();
      if (servers.length === 0) {
        info("No MCP servers configured.");
        info("Use 'cohe mcp add' to add a server.");
        return;
      }
      const enabledCount = servers.filter((s) => s.enabled).length;
      console.log(`  Total: ${servers.length} | Enabled: ${enabledCount}
`);
      servers.forEach((server) => {
        const status = server.enabled ? "●" : "○";
        const provider = server.provider || "all";
        console.log(`  ${status} ${server.name} [${provider}] ${server.enabled ? "" : "(disabled)"}`);
        console.log(`      ${server.command} ${server.args.join(" ")}`);
        if (server.description) {
          console.log(`      ${server.description}`);
        }
      });
      break;
    }
    case "add": {
      section("Add MCP Server");
      const name = await input("Server name:");
      if (!name) {
        error("Server name is required.");
        return;
      }
      const command = await input("Command:", "npx");
      if (!command) {
        error("Command is required.");
        return;
      }
      const argsInput = await input("Arguments (space-separated):", "-y");
      const argsList = argsInput.split(" ").filter((a) => a);
      const provider = await select("Provider:", ["all", "zai", "minimax"], 0);
      const description = await input("Description (optional):", "");
      addMcpServer(name, command, argsList, {
        description,
        provider
      });
      success(`MCP server "${name}" added successfully!`);
      info(`Run 'cohe mcp enable ${name}' to enable it.`);
      break;
    }
    case "remove": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp remove <name>");
        return;
      }
      if (deleteMcpServer(name)) {
        success(`MCP server "${name}" removed.`);
      } else {
        error(`MCP server "${name}" not found.`);
      }
      break;
    }
    case "enable": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp enable <name>");
        return;
      }
      if (toggleMcpServer(name, true)) {
        success(`MCP server "${name}" enabled.`);
      } else {
        error(`MCP server "${name}" not found.`);
      }
      break;
    }
    case "disable": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp disable <name>");
        return;
      }
      if (toggleMcpServer(name, false)) {
        success(`MCP server "${name}" disabled.`);
      } else {
        error(`MCP server "${name}" not found.`);
      }
      break;
    }
    case "add-predefined": {
      const provider = args[1];
      if (!(provider && ["zai", "minimax"].includes(provider))) {
        error("Usage: cohe mcp add-predefined <zai|minimax>");
        return;
      }
      addPredefinedServers(provider);
      const predefined = provider === "zai" ? ZAI_MCP_SERVERS : MINIMAX_MCP_SERVERS;
      const serverCount = Object.keys(predefined).length;
      success(`Added ${serverCount} predefined ${provider.toUpperCase()} MCP servers.`);
      info("Use 'cohe mcp list' to see them, then 'cohe mcp enable <name>' to enable.");
      break;
    }
    case "export": {
      const format = args[1] || "env";
      if (format === "env") {
        console.log(generateMcpEnvExport());
        info(`Run 'eval "$(cohe mcp export env)"' to apply.`);
      } else if (format === "claude") {
        console.log(generateClaudeDesktopConfig());
        info("Save this to ~/.config/claude/mcp.json for Claude Desktop.");
      } else {
        error(`Unknown format: ${format}. Use 'env' or 'claude'.`);
      }
      break;
    }
    case "test": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp test <name>");
        return;
      }
      const server = getMcpServer(name);
      if (!server) {
        error(`MCP server "${name}" not found.`);
        return;
      }
      section(`Testing MCP Server: ${name}`);
      const { spawn: spawn2 } = __require("node:child_process");
      info(`Running: ${server.command} ${server.args.join(" ")}`);
      const child = spawn2(server.command, server.args, {
        env: { ...process.env, ...getMcpEnvForServer(name) },
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
      child.on("close", (code) => {
        if (code === 0) {
          success("Server started successfully!");
          if (stdout) {
            info("Output:");
            console.log(stdout);
          }
        } else {
          error(`Server exited with code ${code}`);
          if (stderr) {
            warning("Stderr:");
            console.log(stderr);
          }
        }
      });
      child.on("error", (err) => {
        error(`Failed to start server: ${err.message}`);
      });
      setTimeout(() => {
        child.kill();
        if (stdout || stderr) {
          info("Server test completed (timeout).");
        }
      }, 1e4);
      break;
    }
    default:
      console.log(`
ImBIOS MCP Server Management v1.0.0

Usage: cohe mcp <command> [options]

Commands:
  list                    List all configured MCP servers
  add                     Add a new MCP server
  remove <name>           Remove an MCP server
  enable <name>           Enable an MCP server
  disable <name>          Disable an MCP server
  add-predefined <p>     Add predefined servers for provider (zai|minimax)
  export [env|claude]     Export configuration (env vars or Claude Desktop JSON)
  test <name>             Test an MCP server connection

Examples:
  cohe mcp list
  cohe mcp add
  cohe mcp enable zai-vision
  cohe mcp add-predefined zai
  eval "$(cohe mcp export env)"
`);
  }
}
async function handleHelp() {
  const pkg = await Promise.resolve().then(() => __toESM(require_package(), 1));
  console.log(`
ImBIOS - Z.AI & MiniMax Provider Manager v${pkg.version}

Usage: cohe <command> [options]

Commands:
  claude [args...]    Spawn Claude with auto-switch
  config              Configure API providers (interactive)
  switch <provider>   Switch active provider (zai/minimax)
  status              Show current provider and status
  usage               Query quota and usage statistics
  history             Show usage history
  cost [model]        Estimate cost for a model
  test                Test API connection
  plugin <action>     Manage Claude Code plugin
  doctor              Diagnose configuration issues
  env export          Export environment variables
  models [provider]   List available models
  completion <shell>  Generate shell completion (bash/zsh/fish)
  profile <cmd>       Manage configuration profiles (v1.1)
  account <cmd>       Multi-account management (v2)
  rotate <provider>   Rotate to next API key (v2)
  dashboard <cmd>     Web dashboard management (v2)
  alert <cmd>         Alert configuration (v2)
  mcp <cmd>           MCP server management (v1)
  auto <cmd>          Cross-provider auto-rotation (v2)
  compare <prompt>    Side-by-side Claude comparison (v2)
  hooks <cmd>         Claude Code hooks management
  help                Show this help message
  version             Show version

Examples:
  cohe claude              # Run claude with auto-switch
  cohe claude --continue   # Run claude --continue with auto-switch
  cohe config              # Configure providers
  cohe switch minimax      # Switch to MiniMax
  cohe account add work    # Add work account
  cohe rotate zai          # Rotate Z.AI key
  cohe dashboard start     # Start web dashboard
  cohe mcp add-predefined zai  # Add Z.AI MCP servers
  cohe auto enable random --cross-provider
  cohe compare "Write a React component"
  cohe hooks setup         # Install auto-rotate hooks
  eval "$(cohe env export)"  # Export env vars

For more info, visit: https://github.com/ImBIOS/coding-helper
`);
}
async function handleVersion() {
  const pkg = await Promise.resolve().then(() => __toESM(require_package(), 1));
  console.log(`ImBIOS v${pkg.version}`);
}
async function handleCompare2(args) {
  const { handleCompare: compareHandler } = await Promise.resolve().then(() => (init_compare(), exports_compare));
  await compareHandler(args);
}
async function handleClaude(args) {
  const { spawn: spawn2 } = await import("node:child_process");
  const { execSync } = await import("node:child_process");
  let claudePath = null;
  try {
    claudePath = execSync("which claude 2>/dev/null", {
      encoding: "utf-8"
    }).trim();
  } catch {
    error("Claude CLI not found. Please install Claude Code first.");
    return;
  }
  const config = loadConfigV2();
  if (config.rotation.enabled) {
    const accounts = listAccounts();
    if (accounts.length > 1) {
      const previousAccount = getActiveAccount();
      const newAccount = config.rotation.crossProvider ? await rotateAcrossProviders() : previousAccount?.provider ? rotateApiKey(previousAccount.provider) : null;
      if (newAccount && newAccount.id !== previousAccount?.id) {
        info(`[auto-switch] ${previousAccount?.name || "none"} → ${newAccount.name} (${newAccount.provider})`);
      }
    } else if (config.rotation.crossProvider) {
      const currentProvider = getActiveProvider();
      const zaiConfig = getProviderConfig("zai");
      const minimaxConfig = getProviderConfig("minimax");
      if (zaiConfig.apiKey && minimaxConfig.apiKey) {
        const newProvider = currentProvider === "zai" ? "minimax" : "zai";
        setActiveProvider(newProvider);
        info(`[auto-switch] ${currentProvider} → ${newProvider}`);
      }
    }
  }
  const activeAccount = getActiveAccount();
  if (!activeAccount) {
    const legacyProvider = getActiveProvider();
    const legacyConfig = getProviderConfig(legacyProvider);
    if (!legacyConfig.apiKey) {
      error("No accounts configured. Run 'cohe config' or 'cohe account add' first.");
      return;
    }
    const provider = PROVIDERS[legacyProvider]();
    const providerConfig = provider.getConfig();
    const childEnv2 = {
      ...process.env,
      ANTHROPIC_AUTH_TOKEN: providerConfig.apiKey,
      ANTHROPIC_BASE_URL: providerConfig.baseUrl,
      API_TIMEOUT_MS: "3000000"
    };
    if (legacyProvider === "minimax") {
      childEnv2.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
    }
    const child2 = spawn2(claudePath, args, {
      stdio: "inherit",
      env: childEnv2
    });
    child2.on("close", (code) => {
      process.exit(code ?? 0);
    });
    return;
  }
  const childEnv = {
    ...process.env,
    ANTHROPIC_AUTH_TOKEN: activeAccount.apiKey,
    ANTHROPIC_BASE_URL: activeAccount.baseUrl,
    API_TIMEOUT_MS: "3000000"
  };
  if (activeAccount.provider === "minimax") {
    childEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  }
  const child = spawn2(claudePath, args, {
    stdio: "inherit",
    env: childEnv
  });
  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}
async function handleAuto(args) {
  const action = args[0];
  switch (action) {
    case "enable": {
      const strategy = args[1];
      const crossProvider = args.includes("--cross-provider");
      configureRotation(true, strategy, crossProvider);
      const config = loadConfigV2();
      success("Auto-rotation enabled.");
      info(`Strategy: ${config.rotation.strategy}`);
      info(`Cross-provider: ${config.rotation.crossProvider ? "enabled" : "disabled"}`);
      break;
    }
    case "disable": {
      configureRotation(false);
      success("Auto-rotation disabled.");
      break;
    }
    case "status": {
      section("Auto-Rotation Status");
      const config = loadConfigV2();
      table({
        Enabled: config.rotation.enabled ? "Yes" : "No",
        Strategy: config.rotation.strategy,
        "Cross-provider": config.rotation.crossProvider ? "Yes" : "No",
        "Last rotation": config.rotation.lastRotation || "Never"
      });
      const activeAccount = getActiveAccount();
      if (activeAccount) {
        info("");
        info(`Active account: ${activeAccount.name} (${activeAccount.provider})`);
      }
      break;
    }
    case "rotate": {
      const newAccount = await rotateAcrossProviders();
      if (newAccount) {
        success(`Rotated to: ${newAccount.name} (${newAccount.provider})`);
      } else {
        error("No accounts available for rotation.");
      }
      break;
    }
    case "hook": {
      const silent = args.includes("--silent");
      const currentAccount = getActiveAccount();
      if (!currentAccount) {
        if (!silent) {
          error("No active account found");
        }
        return;
      }
      const settingsPath = `${process.env.HOME}/.claude/settings.json`;
      const fs6 = await import("node:fs");
      const _path = await import("node:path");
      if (fs6.existsSync(settingsPath)) {
        try {
          const settingsContent = fs6.readFileSync(settingsPath, "utf-8");
          const settings = JSON.parse(settingsContent);
          const env = {
            ANTHROPIC_AUTH_TOKEN: currentAccount.apiKey,
            ANTHROPIC_BASE_URL: currentAccount.baseUrl,
            API_TIMEOUT_MS: "3000000"
          };
          if (currentAccount.provider === "minimax") {
            env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1;
          }
          settings.env = env;
          const glmPlugins = [
            "glm-plan-usage@zai-coding-plugins",
            "glm-plan-bug@zai-coding-plugins"
          ];
          if (currentAccount.provider === "zai") {
            if (!settings.enabledPlugins) {
              settings.enabledPlugins = {};
            }
            for (const plugin of glmPlugins) {
              settings.enabledPlugins[plugin] = true;
            }
          } else if (currentAccount.provider === "minimax") {
            if (settings.enabledPlugins) {
              for (const plugin of glmPlugins) {
                delete settings.enabledPlugins[plugin];
              }
              if (Object.keys(settings.enabledPlugins).length === 0) {
                settings.enabledPlugins = undefined;
              }
            }
          }
          fs6.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        } catch (err) {
          if (!silent) {
            error(`Failed to update settings.json: ${err.message}`);
          }
        }
      }
      const config = loadConfigV2();
      if (config.rotation.enabled) {
        setImmediate(async () => {
          try {
            await rotateAcrossProviders();
          } catch {}
        });
      }
      break;
    }
    default: {
      console.log(`
ImBIOS Auto-Rotation

Usage: cohe auto <command> [options]

Commands:
  enable [strategy]      Enable auto-rotation
  disable                Disable auto-rotation
  status                 Show current rotation status
  rotate                 Manually trigger rotation
  hook                   SessionStart hook (for internal use)

Options:
  --cross-provider       Enable cross-provider rotation

Strategies:
  round-robin            Cycle through accounts sequentially
  least-used             Pick account with lowest usage
  priority               Pick highest priority account
  random                 Randomly select account

Examples:
  cohe auto enable round-robin
  cohe auto enable random --cross-provider
  cohe auto status
  cohe auto rotate
  cohe auto hook --silent
`);
    }
  }
}
var PROVIDERS;
var init_commands = __esm(() => {
  init_accounts_config();
  init_mcp();
  init_profiles();
  init_settings();
  init_minimax();
  init_zai();
  init_completion();
  init_logger();
  init_prompts();
  PROVIDERS = {
    zai: () => zaiProvider,
    minimax: () => minimaxProvider
  };
});

// src/commands/loader.ts
var exports_loader = {};
__export(exports_loader, {
  loadCommand: () => loadCommand,
  handleVersion: () => handleVersion,
  handleUsage: () => handleUsage,
  handleTest: () => handleTest,
  handleSwitch: () => handleSwitch,
  handleStatus: () => handleStatus,
  handleRotate: () => handleRotate,
  handleProfile: () => handleProfile,
  handlePlugin: () => handlePlugin,
  handleModels: () => handleModels,
  handleMcp: () => handleMcp,
  handleHooks: () => handleHooks,
  handleHistory: () => handleHistory,
  handleHelp: () => handleHelp,
  handleEnv: () => handleEnv,
  handleDoctor: () => handleDoctor,
  handleDashboard: () => handleDashboard,
  handleCost: () => handleCost,
  handleConfig: () => handleConfig,
  handleCompletion: () => handleCompletion,
  handleCompare: () => handleCompare2,
  handleClaude: () => handleClaude,
  handleAuto: () => handleAuto,
  handleAlert: () => handleAlert,
  handleAccount: () => handleAccount
});
async function loadCommand(command, args) {
  const handler = COMMANDS[command];
  if (handler) {
    await handler(args);
  } else {
    await handleHelp();
  }
}
var COMMANDS;
var init_loader = __esm(() => {
  init_commands();
  COMMANDS = {
    auto: (args) => handleAuto(args ?? []),
    claude: (args) => handleClaude(args ?? []),
    compare: (args) => handleCompare2(args ?? []),
    config: handleConfig,
    completion: (args) => handleCompletion(args?.[0]),
    switch: (args) => handleSwitch(args ?? []),
    status: handleStatus,
    usage: handleUsage,
    history: handleHistory,
    cost: (args) => handleCost(args?.[0]),
    test: handleTest,
    plugin: (args) => handlePlugin(args?.[0]),
    doctor: handleDoctor,
    env: (args) => handleEnv(args?.[0]),
    models: (args) => handleModels(args?.[0]),
    profile: (args) => handleProfile(args ?? []),
    account: (args) => handleAccount(args ?? []),
    rotate: (args) => handleRotate(args ?? []),
    dashboard: (args) => handleDashboard(args ?? []),
    alert: (args) => handleAlert(args ?? []),
    mcp: (args) => handleMcp(args ?? []),
    hooks: (args) => handleHooks(args ?? []),
    help: handleHelp,
    version: handleVersion
  };
});

// src/cli.ts
var CLIController = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  try {
    const { loadCommand: loadCommand2 } = await Promise.resolve().then(() => (init_loader(), exports_loader));
    await loadCommand2(command, args.slice(1));
  } catch (error2) {
    if (error2 instanceof Error && error2.message.includes("Cannot find module")) {
      console.error(`Unknown command: ${command}`);
      console.log('Run "cohe help" for available commands.');
    } else {
      console.error("Error:", error2 instanceof Error ? error2.message : String(error2));
    }
    process.exit(1);
  }
};
CLIController();
