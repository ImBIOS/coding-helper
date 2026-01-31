#!/usr/bin/env node
var __defProp = Object.defineProperty;
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

// src/config/env.ts
import * as fs from "node:fs";
import * as path from "node:path";
function getEnvPath() {
  return path.join(process.env.HOME || process.env.USERPROFILE || "", ".claude", "imbios.env");
}
function loadEnvVars() {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const vars = {};
  content.split(`
`).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  });
  return vars;
}
function loadEnv() {
  const vars = loadEnvVars();
  for (const [key, value] of Object.entries(vars)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
var init_env = () => {};

// src/config/settings.ts
import * as fs2 from "node:fs";
import * as os from "node:os";
import * as path2 from "node:path";
function getConfigDir() {
  return path2.join(os.homedir(), ".claude");
}
function getConfigPath() {
  return CONFIG_PATH;
}
function loadConfig() {
  try {
    if (fs2.existsSync(CONFIG_PATH)) {
      const content = fs2.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch {}
  return { provider: "zai" };
}
function saveConfig(config) {
  const configDir = getConfigDir();
  if (!fs2.existsSync(configDir)) {
    fs2.mkdirSync(configDir, { recursive: true });
  }
  fs2.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
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
var CONFIG_PATH;
var init_settings = __esm(() => {
  CONFIG_PATH = path2.join(os.homedir(), ".claude", "imbios.json");
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
      models: ["MiniMax-M2.1", "MiniMax-M2"]
    };
  }
  getModels() {
    return ["MiniMax-M2.1", "MiniMax-M2"];
  }
  getDefaultModel(type) {
    return MINIMAX_MODEL_MAPPING[type];
  }
  getModelMapping() {
    return MINIMAX_MODEL_MAPPING;
  }
  async testConnection() {
    const config = this.getConfig();
    if (!config.apiKey) {
      return false;
    }
    try {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }
  async getUsage() {
    const config = this.getConfig();
    if (!config.apiKey) {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
    try {
      const response = await fetch(`${config.baseUrl}/credits`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }
      const data = await response.json();
      const used = data.used || 0;
      const limit = data.limit || 0;
      const remaining = Math.max(0, limit - used);
      return {
        used,
        limit,
        remaining,
        percentUsed: limit > 0 ? used / limit * 100 : 0
      };
    } catch {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
  }
}
var MINIMAX_MODEL_MAPPING, minimaxProvider;
var init_minimax = __esm(() => {
  MINIMAX_MODEL_MAPPING = {
    opus: "MiniMax-M2.1",
    sonnet: "MiniMax-M2.1",
    haiku: "MiniMax-M2"
  };
  minimaxProvider = new MiniMaxProvider;
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
      models: ["GLM-4.7", "GLM-4.5-Air", "GLM-4.5-Air-X"]
    };
  }
  getModels() {
    return ["GLM-4.7", "GLM-4.5-Air", "GLM-4.5-Air-X"];
  }
  getDefaultModel(type) {
    return ZAI_MODEL_MAPPING[type];
  }
  getModelMapping() {
    return ZAI_MODEL_MAPPING;
  }
  async testConnection() {
    const config = this.getConfig();
    if (!config.apiKey) {
      return false;
    }
    try {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }
  async getUsage() {
    const config = this.getConfig();
    if (!config.apiKey) {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
    try {
      const response = await fetch(`${config.baseUrl}/credits`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }
      const data = await response.json();
      const used = data.used || 0;
      const limit = data.limit || 0;
      const remaining = Math.max(0, limit - used);
      return {
        used,
        limit,
        remaining,
        percentUsed: limit > 0 ? used / limit * 100 : 0
      };
    } catch {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
  }
}
var ZAI_MODEL_MAPPING, zaiProvider;
var init_zai = __esm(() => {
  ZAI_MODEL_MAPPING = {
    opus: "GLM-4.7",
    sonnet: "GLM-4.7",
    haiku: "GLM-4.5-Air"
  };
  zaiProvider = new ZAIProvider;
});

// src/utils/logger.ts
function log(message, level = "info") {
  const color = COLORS[level];
  const prefix = LEVEL_PREFIXES[level];
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`${color}[${timestamp}] ${prefix}${level === "debug" ? "" : ""} ${message}${COLORS.reset}`);
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
function error2(message) {
  log(message, "error");
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
var COLORS, LEVEL_PREFIXES;
var init_logger = __esm(() => {
  COLORS = {
    info: "\x1B[36m",
    success: "\x1B[32m",
    warning: "\x1B[33m",
    error: "\x1B[31m",
    debug: "\x1B[90m",
    reset: "\x1B[0m"
  };
  LEVEL_PREFIXES = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✗",
    debug: "↪"
  };
});

// src/utils/prompts.ts
var exports_prompts = {};
__export(exports_prompts, {
  select: () => select,
  providerSelection: () => providerSelection,
  password: () => password,
  modelSelection: () => modelSelection,
  input: () => input,
  confirm: () => confirm,
  checkbox: () => checkbox
});
import inquirer from "inquirer";
async function confirm(message) {
  const { result } = await inquirer.prompt([
    {
      type: "confirm",
      name: "result",
      message,
      default: true
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

// src/oclif/commands/config.ts
var exports_config = {};
__export(exports_config, {
  default: () => configCommand
});
async function configCommand(args) {
  const flags = {};
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.replace(/^--/, "");
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        flags[key] = args[i + 1];
        i++;
      } else if (key === "help" || key === "h") {
        flags.help = "true";
      }
    } else if (arg.startsWith("-")) {
      const key = arg.replace(/^-/, "");
      if (args[i + 1] && !args[i + 1].startsWith("-")) {
        flags[key] = args[i + 1];
        i++;
      }
    }
  }
  if (flags.help || flags.h) {
    console.log(`
Configure API providers

Usage: imbios config [options]

Options:
  --provider, -p <name>  Provider to configure (zai or minimax)
  --api-key, -k <key>    API key
  --base-url, -u <url>   Base URL
  --model, -m <model>    Default model
  --help, -h             Show this help

Examples:
  imbios config              # Interactive configuration
  imbios config -p zai -k xxx  # Configure ZAI with API key
`);
    return;
  }
  section("ImBIOS Configuration");
  let provider;
  if (flags.provider || flags.p) {
    const p = flags.provider || flags.p;
    if (p !== "zai" && p !== "minimax") {
      error2(`Invalid provider: ${p}. Use 'zai' or 'minimax'.`);
      return;
    }
    provider = p;
  } else {
    const { select: select2 } = await Promise.resolve().then(() => (init_prompts(), exports_prompts));
    provider = await select2("Select provider:", ["zai", "minimax"]);
  }
  info(`Configuring ${provider.toUpperCase()} provider...`);
  const existingConfig = getProviderConfig(provider);
  let apiKey = flags.apiKey || flags.k;
  if (!apiKey) {
    const { password: password2 } = await Promise.resolve().then(() => (init_prompts(), exports_prompts));
    apiKey = await password2(`Enter API key for ${provider}:`);
  }
  let baseUrl = flags.baseUrl || flags.u;
  if (!baseUrl) {
    const providerObj = provider === "zai" ? zaiProvider : minimaxProvider;
    const { input: input2 } = await Promise.resolve().then(() => (init_prompts(), exports_prompts));
    baseUrl = await input2("Base URL:", existingConfig.baseUrl || providerObj.getConfig().baseUrl);
  }
  let defaultModel = flags.model || flags.m;
  if (!defaultModel) {
    const providerObj = provider === "zai" ? zaiProvider : minimaxProvider;
    const models = providerObj.getModels();
    const { select: select2 } = await Promise.resolve().then(() => (init_prompts(), exports_prompts));
    defaultModel = await select2("Default model:", models);
  }
  if (!apiKey) {
    error2("API key is required!");
    return;
  }
  setProviderConfig(provider, apiKey, baseUrl, defaultModel);
  success(`${provider.toUpperCase()} configuration saved!`);
}
var init_config = __esm(() => {
  init_settings();
  init_minimax();
  init_zai();
  init_logger();
});

// src/oclif/commands/switch.ts
var exports_switch = {};
__export(exports_switch, {
  default: () => switchCommand
});
async function switchCommand(args) {
  const targetProvider = args[0];
  if (!targetProvider) {
    console.log(`
Switch active provider

Usage: imbios switch <provider>

Arguments:
  provider    Provider to switch to (zai, minimax, or glm)

Examples:
  imbios switch zai      # Switch to ZAI
  imbios switch minimax  # Switch to MiniMax
  imbios switch glm      # Alias for ZAI
`);
    return;
  }
  if (targetProvider === "glm") {
    doSwitch("zai");
    return;
  }
  if (targetProvider !== "zai" && targetProvider !== "minimax") {
    error(`Unknown provider: ${targetProvider}. Use 'zai' or 'minimax'.`);
    return;
  }
  doSwitch(targetProvider);
}
function doSwitch(provider) {
  const currentProvider = getActiveProvider();
  if (currentProvider === provider) {
    info(`Already using ${provider.toUpperCase()}.`);
    return;
  }
  const config = getProviderConfig(provider);
  if (!config.apiKey) {
    warning(`${provider.toUpperCase()} is not configured.`);
    info("Run 'imbios config' to configure the provider first.");
    return;
  }
  setActiveProvider(provider);
  success(`Switched to ${provider.toUpperCase()}.`);
  section("Current Configuration");
  table({
    Provider: provider.toUpperCase(),
    "API Key": config.apiKey ? "***" + config.apiKey.slice(-4) : "Not set",
    "Base URL": config.baseUrl || "Default",
    "Default Model": config.defaultModel
  });
}
var init_switch = __esm(() => {
  init_settings();
  init_logger();
});

// src/oclif/commands/status.ts
var exports_status = {};
__export(exports_status, {
  default: () => statusCommand
});
async function statusCommand() {
  section("ImBIOS Status");
  const provider = getActiveProvider();
  const config = getProviderConfig(provider);
  table({
    Active: provider.toUpperCase(),
    "API Key": config.apiKey ? "***" + config.apiKey.slice(-4) : "Not set",
    "Base URL": config.baseUrl || "Default",
    "Default Model": config.defaultModel
  });
  info("");
  const zaiConfig = getProviderConfig("zai");
  const minimaxConfig = getProviderConfig("minimax");
  info("Provider Configurations:");
  table({
    ZAI: zaiConfig.apiKey ? `✓ Configured (${zaiConfig.defaultModel})` : "✗ Not configured",
    MiniMax: minimaxConfig.apiKey ? `✓ Configured (${minimaxConfig.defaultModel})` : "✗ Not configured"
  });
}
var init_status = __esm(() => {
  init_settings();
  init_logger();
});

// src/oclif/commands/usage.ts
var exports_usage = {};
__export(exports_usage, {
  default: () => usageCommand
});
async function usageCommand() {
  section("Usage Statistics");
  const providerName = getActiveProvider();
  const provider = providerName === "zai" ? await Promise.resolve().then(() => (init_zai(), exports_zai)).then((m) => m.zaiProvider) : await Promise.resolve().then(() => (init_minimax(), exports_minimax)).then((m) => m.minimaxProvider);
  const config = provider.getConfig();
  if (!config.apiKey) {
    warning("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }
  info(`Querying ${provider.name} usage...`);
  try {
    const usage = await provider.getUsage();
    table({
      Provider: provider.name.toUpperCase(),
      Used: usage.used.toLocaleString(),
      Limit: usage.limit.toLocaleString(),
      Remaining: (usage.remaining ?? usage.limit - usage.used).toLocaleString(),
      "Percent Used": `${usage.percentUsed.toFixed(1)}%`
    });
  } catch (err) {
    warning(`Failed to get usage: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
var init_usage = __esm(() => {
  init_settings();
  init_logger();
});

// src/oclif/commands/test.ts
var exports_test = {};
__export(exports_test, {
  default: () => testCommand
});
async function testCommand() {
  section("Testing API Connection");
  const providerName = getActiveProvider();
  const provider = providerName === "zai" ? await Promise.resolve().then(() => (init_zai(), exports_zai)).then((m) => m.zaiProvider) : await Promise.resolve().then(() => (init_minimax(), exports_minimax)).then((m) => m.minimaxProvider);
  const config = provider.getConfig();
  if (!config.apiKey) {
    error2("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }
  info(`Testing ${provider.name} connection...`);
  try {
    const result = await provider.testConnection();
    if (result) {
      success("Connection successful!");
    } else {
      error2("Connection failed. Please check your API key and configuration.");
    }
  } catch (err) {
    error2(`Connection error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
var init_test = __esm(() => {
  init_settings();
  init_logger();
});

// src/oclif/commands/version.ts
var exports_version = {};
__export(exports_version, {
  default: () => versionCommand
});
import { readFileSync as readFileSync3 } from "node:fs";
import { join as join3 } from "node:path";
async function versionCommand() {
  const pkgPath = join3(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync3(pkgPath, "utf-8"));
  info(`ImBIOS v${pkg.version}`);
}
var init_version = __esm(() => {
  init_logger();
});

// src/oclif/commands/help.ts
var exports_help = {};
__export(exports_help, {
  default: () => helpCommand
});
import { readFileSync as readFileSync4 } from "node:fs";
import { join as join4 } from "node:path";
async function helpCommand(args) {
  const pkgPath = join4(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync4(pkgPath, "utf-8"));
  if (args[0]) {
    const commandHelps = {
      config: `Configure API providers

Usage: imbios config [options]

Options:
  --provider, -p <name>  Provider to configure (zai or minimax)
  --api-key, -k <key>    API key
  --base-url, -u <url>   Base URL
  --model, -m <model>    Default model`,
      switch: `Switch active provider

Usage: imbios switch <provider>

Arguments:
  provider    Provider to switch to (zai or minimax)`
    };
    if (commandHelps[args[0]]) {
      info(commandHelps[args[0]]);
    } else {
      info(`No help available for '${args[0]}'. Run 'imbios help' for general help.`);
    }
    return;
  }
  info(`
ImBIOS - Z.AI & MiniMax Provider Manager v${pkg.version}

Usage: imbios <command> [options]

Commands:
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
  help                Show this help message
  version             Show version

Examples:
  imbios config              # Configure providers
  imbios switch minimax      # Switch to MiniMax
  imbios help                # Show this help

For more info, visit: https://github.com/ImBIOS/coding-helper
`);
}
var init_help = __esm(() => {
  init_logger();
});

// src/oclif/commands/doctor.ts
var exports_doctor = {};
__export(exports_doctor, {
  default: () => doctorCommand
});
import * as fs3 from "node:fs";
async function doctorCommand() {
  section("ImBIOS Doctor");
  const issues = [];
  const checks = {};
  const activeProvider = getActiveProvider();
  const activeConfig = getProviderConfig(activeProvider);
  checks["Active provider configured"] = {
    status: !!activeConfig.apiKey,
    message: activeProvider.toUpperCase()
  };
  if (!activeConfig.apiKey) {
    issues.push(`Active provider (${activeProvider}) is not configured`);
  }
  const zaiConfig = getProviderConfig("zai");
  checks["ZAI configured"] = {
    status: !!zaiConfig.apiKey,
    message: zaiConfig.apiKey ? "Configured" : "Not configured"
  };
  const minimaxConfig = getProviderConfig("minimax");
  checks["MiniMax configured"] = {
    status: !!minimaxConfig.apiKey,
    message: minimaxConfig.apiKey ? "Configured" : "Not configured"
  };
  const configPath = getConfigPath();
  checks["Config file exists"] = {
    status: fs3.existsSync(configPath),
    message: configPath
  };
  const envPath = getEnvPath();
  checks["Env file exists"] = {
    status: fs3.existsSync(envPath),
    message: envPath
  };
  table(checks);
  if (issues.length > 0) {
    info("");
    warning("Issues found:");
    issues.forEach((issue) => error2(`  - ${issue}`));
    info("");
    info("To fix: Run 'imbios config' to configure your API providers.");
  } else {
    info("");
    success("All checks passed!");
  }
}
var init_doctor = __esm(() => {
  init_settings();
  init_env();
  init_logger();
});

// src/oclif/commands/models.ts
var exports_models = {};
__export(exports_models, {
  default: () => modelsCommand
});
async function modelsCommand(args) {
  const providerArg = args[0];
  if (providerArg) {
    if (providerArg !== "zai" && providerArg !== "minimax") {
      info("Invalid provider. Use 'zai' or 'minimax'.");
      return;
    }
    listModelsForProvider(providerArg);
  } else {
    section("Available Models");
    info("ZAI Models:");
    const zaiModels = zaiProvider.getModels();
    table(zaiModels.reduce((acc, m, i) => ({ ...acc, [i + 1]: m }), {}));
    info("");
    info("MiniMax Models:");
    const minimaxModels = minimaxProvider.getModels();
    table(minimaxModels.reduce((acc, m, i) => ({ ...acc, [i + 1]: m }), {}));
  }
}
function listModelsForProvider(provider) {
  const providerObj = provider === "zai" ? zaiProvider : minimaxProvider;
  section(`${provider.toUpperCase()} Models`);
  const models = providerObj.getModels();
  table(models.reduce((acc, m, i) => ({ ...acc, [i + 1]: m }), {}));
}
var init_models = __esm(() => {
  init_logger();
  init_zai();
  init_minimax();
});

// src/oclif/commands/history.ts
var exports_history = {};
__export(exports_history, {
  default: () => historyCommand
});
async function historyCommand() {
  section("Usage History");
  const providerName = getActiveProvider();
  const provider = providerName === "zai" ? await Promise.resolve().then(() => (init_zai(), exports_zai)).then((m) => m.zaiProvider) : await Promise.resolve().then(() => (init_minimax(), exports_minimax)).then((m) => m.minimaxProvider);
  const config = provider.getConfig();
  if (!config.apiKey) {
    warning("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }
  try {
    const history = await provider.getUsageHistory();
    if (history.length === 0) {
      info("No usage history available.");
      return;
    }
    const recentHistory = history.slice(-10).reverse();
    info("Recent Usage:");
    recentHistory.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleString();
      info(`  ${date}: ${record.used}/${record.limit} (${record.percentUsed.toFixed(1)}%)`);
    });
  } catch (err) {
    error2(`Failed to get usage history: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
var init_history = __esm(() => {
  init_settings();
  init_logger();
});

// src/oclif/commands/cost.ts
var exports_cost = {};
__export(exports_cost, {
  default: () => costCommand
});
async function costCommand(args) {
  section("Cost Estimation");
  const providerName = getActiveProvider();
  const provider = providerName === "zai" ? await Promise.resolve().then(() => (init_zai(), exports_zai)).then((m) => m.zaiProvider) : await Promise.resolve().then(() => (init_minimax(), exports_minimax)).then((m) => m.minimaxProvider);
  const config = provider.getConfig();
  if (!config.apiKey) {
    warning("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }
  const models = provider.getModels();
  const model = args[0] ?? config.defaultModel;
  if (!models.includes(model)) {
    warning(`Model '${model}' not found in provider models.`);
    info(`Available models: ${models.join(", ")}`);
    return;
  }
  const pricing = provider.getPricing(model);
  table({
    Model: model,
    "Input (per 1M tokens)": `$${pricing.inputPerMillion.toFixed(2)}`,
    "Output (per 1M tokens)": `$${pricing.outputPerMillion.toFixed(2)}`
  });
  info("");
  info("Note: Actual costs may vary. These are estimated rates.");
}
var init_cost = __esm(() => {
  init_settings();
  init_logger();
});

// src/index.ts
init_env();
loadEnv();
var command = process.argv[2] || "help";
var args = process.argv.slice(3);
async function main() {
  const commandMap = {
    config: () => Promise.resolve().then(() => (init_config(), exports_config)).then((m) => m.default(args)),
    switch: () => Promise.resolve().then(() => (init_switch(), exports_switch)).then((m) => m.default(args)),
    status: () => Promise.resolve().then(() => (init_status(), exports_status)).then((m) => m.default()),
    usage: () => Promise.resolve().then(() => (init_usage(), exports_usage)).then((m) => m.default()),
    test: () => Promise.resolve().then(() => (init_test(), exports_test)).then((m) => m.default()),
    version: () => Promise.resolve().then(() => (init_version(), exports_version)).then((m) => m.default()),
    help: () => Promise.resolve().then(() => (init_help(), exports_help)).then((m) => m.default(args)),
    doctor: () => Promise.resolve().then(() => (init_doctor(), exports_doctor)).then((m) => m.default()),
    models: () => Promise.resolve().then(() => (init_models(), exports_models)).then((m) => m.default(args)),
    history: () => Promise.resolve().then(() => (init_history(), exports_history)).then((m) => m.default()),
    cost: () => Promise.resolve().then(() => (init_cost(), exports_cost)).then((m) => m.default(args))
  };
  const handler = commandMap[command];
  if (!handler) {
    if (command === "--help" || command === "-h") {
      showHelp();
      return;
    }
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
  try {
    await handler();
  } catch (error3) {
    console.error(`Error: ${error3 instanceof Error ? error3.message : error3}`);
    process.exit(1);
  }
}
function showHelp() {
  console.log(`
ImBIOS - Z.AI & MiniMax Provider Manager v2.0.0

Usage: imbios <command> [options]

Commands:
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
  help                Show this help message
  version             Show version

For more info, visit: https://github.com/imbios/coding-helper
`);
}
main();
