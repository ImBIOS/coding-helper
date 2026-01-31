import * as fs from "node:fs";
import * as path from "node:path";
const DEFAULT_CONFIG = {
    version: "1.0.0",
    servers: {},
    globalEnv: {},
};
export function getMcpPath() {
    return `${process.env.HOME || process.env.USERPROFILE}/.claude/imbios-mcp.json`;
}
export function loadMcpConfig() {
    try {
        const configPath = getMcpPath();
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, "utf-8");
            return JSON.parse(content);
        }
    }
    catch {
        // Ignore errors
    }
    return { ...DEFAULT_CONFIG };
}
export function saveMcpConfig(config) {
    const configPath = getMcpPath();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
export function addMcpServer(name, command, args, options) {
    const config = loadMcpConfig();
    const server = {
        name,
        command,
        args,
        enabled: true,
        description: options?.description || "",
        provider: options?.provider || "all",
        env: options?.env,
    };
    config.servers[name] = server;
    saveMcpConfig(config);
    return server;
}
export function updateMcpServer(name, updates) {
    const config = loadMcpConfig();
    const server = config.servers[name];
    if (!server) {
        return null;
    }
    config.servers[name] = { ...server, ...updates };
    saveMcpConfig(config);
    return config.servers[name];
}
export function deleteMcpServer(name) {
    const config = loadMcpConfig();
    if (!config.servers[name]) {
        return false;
    }
    delete config.servers[name];
    saveMcpConfig(config);
    return true;
}
export function getMcpServer(name) {
    const config = loadMcpConfig();
    return config.servers[name] || null;
}
export function listMcpServers() {
    const config = loadMcpConfig();
    return Object.values(config.servers);
}
export function listEnabledMcpServers() {
    const config = loadMcpConfig();
    return Object.values(config.servers).filter((s) => s.enabled);
}
export function toggleMcpServer(name, enabled) {
    const config = loadMcpConfig();
    if (!config.servers[name]) {
        return false;
    }
    config.servers[name].enabled = enabled;
    saveMcpConfig(config);
    return true;
}
export function getMcpEnvForServer(name) {
    const config = loadMcpConfig();
    const server = config.servers[name];
    if (!server) {
        return {};
    }
    return {
        ...config.globalEnv,
        ...server.env,
    };
}
export function generateMcpEnvExport() {
    const config = loadMcpConfig();
    const enabledServers = listEnabledMcpServers();
    let envScript = "# ImBIOS MCP Configuration\n";
    if (config.globalEnv && Object.keys(config.globalEnv).length > 0) {
        envScript += "# Global MCP Environment Variables\n";
        for (const [key, value] of Object.entries(config.globalEnv)) {
            envScript += `export ${key}="${value}"\n`;
        }
        envScript += "\n";
    }
    envScript += "# MCP Servers\n";
    envScript += `export IMBIOS_MCP_SERVERS="${enabledServers.map((s) => s.name).join(",")}"\n\n`;
    for (const server of enabledServers) {
        envScript += `# Server: ${server.name}\n`;
        envScript += `export IMBIOS_MCP_${server.name.toUpperCase().replace(/-/g, "_")}_COMMAND="${server.command}"\n`;
        envScript += `export IMBIOS_MCP_${server.name.toUpperCase().replace(/-/g, "_")}_ARGS="${server.args.join(" ")}"\n`;
        if (server.env) {
            for (const [key, value] of Object.entries(server.env)) {
                envScript += `export IMBIOS_MCP_${server.name.toUpperCase().replace(/-/g, "_")}_ENV_${key}="${value}"\n`;
            }
        }
        envScript += "\n";
    }
    return envScript;
}
export function generateClaudeDesktopConfig() {
    const config = loadMcpConfig();
    const enabledServers = listEnabledMcpServers();
    const mcpServers = {};
    for (const server of enabledServers) {
        mcpServers[server.name] = {
            command: server.command,
            args: server.args,
            env: server.env,
        };
    }
    return JSON.stringify({
        mcpServers,
    }, null, 2);
}
// Predefined Z.AI MCP servers
export const ZAI_MCP_SERVERS = {
    "zai-vision": {
        name: "zai-vision",
        command: "npx",
        args: ["-y", "@z-ai/mcp-server-vision"],
        description: "Vision/image analysis for Z.AI",
        provider: "zai",
    },
    "zai-search": {
        name: "zai-search",
        command: "npx",
        args: ["-y", "@z-ai/mcp-server-search"],
        description: "Web search for Z.AI",
        provider: "zai",
    },
    "zai-reader": {
        name: "zai-reader",
        command: "npx",
        args: ["-y", "@z-ai/mcp-server-reader"],
        description: "Content reading for Z.AI",
        provider: "zai",
    },
    "zai-zread": {
        name: "zai-zread",
        command: "npx",
        args: ["-y", "@z-ai/mcp-server-zread"],
        description: "Advanced reading for Z.AI",
        provider: "zai",
    },
};
/**
 * Predefined MiniMax MCP servers
 * TODO: This is wrong, see https://platform.minimax.io/docs/coding-plan/mcp-guide
 */
export const MINIMAX_MCP_SERVERS = {
    "minimax-vision": {
        name: "minimax-vision",
        command: "npx",
        args: ["-y", "@minimax/mcp-server-vision"],
        description: "Vision/image analysis for MiniMax",
        provider: "minimax",
    },
    "minimax-search": {
        name: "minimax-search",
        command: "npx",
        args: ["-y", "@minimax/mcp-server-search"],
        description: "Web search for MiniMax",
        provider: "minimax",
    },
};
export function addPredefinedServers(provider) {
    const servers = provider === "zai" ? ZAI_MCP_SERVERS : MINIMAX_MCP_SERVERS;
    const config = loadMcpConfig();
    for (const server of Object.values(servers)) {
        if (!config.servers[server.name]) {
            config.servers[server.name] = {
                ...server,
                enabled: false,
            };
        }
    }
    saveMcpConfig(config);
}
