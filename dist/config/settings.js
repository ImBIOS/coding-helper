import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
const CONFIG_PATH = path.join(os.homedir(), ".claude", "imbios.json");
export function getConfigDir() {
    return path.join(os.homedir(), ".claude");
}
export function getConfigPath() {
    return CONFIG_PATH;
}
export function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const content = fs.readFileSync(CONFIG_PATH, "utf-8");
            return JSON.parse(content);
        }
    }
    catch {
        // Ignore errors
    }
    return { provider: "zai" };
}
export function saveConfig(config) {
    const configDir = getConfigDir();
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
export function getProviderConfig(provider) {
    const config = loadConfig();
    const providerConfig = config[provider];
    if (!providerConfig) {
        return {};
    }
    return {
        apiKey: "apiKey" in providerConfig ? providerConfig.apiKey : "",
        baseUrl: "baseUrl" in providerConfig ? providerConfig.baseUrl : "",
        defaultModel: "defaultModel" in providerConfig
            ? providerConfig.defaultModel
            : "",
    };
}
export function setProviderConfig(provider, apiKey, baseUrl, defaultModel) {
    const config = loadConfig();
    config[provider] = { apiKey, baseUrl, defaultModel, models: [] };
    saveConfig(config);
}
export function getActiveProvider() {
    const config = loadConfig();
    return config.provider || "zai";
}
export function setActiveProvider(provider) {
    const config = loadConfig();
    config.provider = provider;
    saveConfig(config);
}
export function recordUsage(provider, used, limit) {
    const config = loadConfig();
    const today = new Date().toISOString().split("T")[0];
    if (!config.history) {
        config.history = {};
    }
    if (!config.history[provider]) {
        config.history[provider] = [];
    }
    const existing = config.history[provider].find((r) => r.date === today);
    if (existing) {
        existing.used = used;
        existing.limit = limit;
    }
    else {
        config.history[provider].push({ date: today, used, limit });
        // Keep only last 30 days
        config.history[provider] = config.history[provider].slice(-30);
    }
    saveConfig(config);
}
export function getUsageHistory(provider) {
    const config = loadConfig();
    return config.history?.[provider] || [];
}
