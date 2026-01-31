import * as fs from "node:fs";
import * as path from "node:path";
const DEFAULT_CONFIG = {
    activeProfile: "default",
    profiles: {},
    settings: {
        defaultProvider: "zai",
        autoSwitch: false,
        logLevel: "info",
    },
};
export function getProfilesPath() {
    return `${process.env.HOME || process.env.USERPROFILE}/.claude/imbios-profiles.json`;
}
export function loadProfiles() {
    try {
        const configPath = getProfilesPath();
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, "utf-8");
            return JSON.parse(content);
        }
    }
    catch {
        // Ignore errors
    }
    return DEFAULT_CONFIG;
}
export function saveProfiles(config) {
    const configPath = getProfilesPath();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
export function createProfile(name, provider, apiKey, baseUrl, defaultModel) {
    const now = new Date().toISOString();
    const profile = {
        name,
        provider,
        apiKey,
        baseUrl,
        defaultModel,
        createdAt: now,
        updatedAt: now,
    };
    const config = loadProfiles();
    config.profiles[name] = profile;
    if (Object.keys(config.profiles).length === 1) {
        config.activeProfile = name;
    }
    saveProfiles(config);
    return profile;
}
export function switchProfile(name) {
    const config = loadProfiles();
    if (!config.profiles[name]) {
        return false;
    }
    config.activeProfile = name;
    saveProfiles(config);
    return true;
}
export function deleteProfile(name) {
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
export function getActiveProfile() {
    const config = loadProfiles();
    return config.profiles[config.activeProfile] || null;
}
export function listProfiles() {
    const config = loadProfiles();
    return Object.values(config.profiles);
}
export function updateProfileSettings(settings) {
    const config = loadProfiles();
    config.settings = { ...config.settings, ...settings };
    saveProfiles(config);
}
export function exportProfile(name) {
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
