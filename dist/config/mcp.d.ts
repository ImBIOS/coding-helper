export interface McpServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    enabled: boolean;
    description?: string;
    provider?: "zai" | "minimax" | "all";
}
export interface McpConfig {
    version: "1.0.0";
    servers: Record<string, McpServerConfig>;
    globalEnv?: Record<string, string>;
}
export interface McpProfileConfig {
    enabled: boolean;
    servers: string[];
}
export declare function getMcpPath(): string;
export declare function loadMcpConfig(): McpConfig;
export declare function saveMcpConfig(config: McpConfig): void;
export declare function addMcpServer(name: string, command: string, args: string[], options?: {
    env?: Record<string, string>;
    description?: string;
    provider?: "zai" | "minimax" | "all";
}): McpServerConfig;
export declare function updateMcpServer(name: string, updates: Partial<McpServerConfig>): McpServerConfig | null;
export declare function deleteMcpServer(name: string): boolean;
export declare function getMcpServer(name: string): McpServerConfig | null;
export declare function listMcpServers(): McpServerConfig[];
export declare function listEnabledMcpServers(): McpServerConfig[];
export declare function toggleMcpServer(name: string, enabled: boolean): boolean;
export declare function getMcpEnvForServer(name: string): Record<string, string>;
export declare function generateMcpEnvExport(): string;
export declare function generateClaudeDesktopConfig(): string;
export declare const ZAI_MCP_SERVERS: {
    "zai-vision": {
        name: string;
        command: string;
        args: string[];
        description: string;
        provider: "zai";
    };
    "zai-search": {
        name: string;
        command: string;
        args: string[];
        description: string;
        provider: "zai";
    };
    "zai-reader": {
        name: string;
        command: string;
        args: string[];
        description: string;
        provider: "zai";
    };
    "zai-zread": {
        name: string;
        command: string;
        args: string[];
        description: string;
        provider: "zai";
    };
};
/**
 * Predefined MiniMax MCP servers
 * TODO: This is wrong, see https://platform.minimax.io/docs/coding-plan/mcp-guide
 */
export declare const MINIMAX_MCP_SERVERS: {
    "minimax-vision": {
        name: string;
        command: string;
        args: string[];
        description: string;
        provider: "minimax";
    };
    "minimax-search": {
        name: string;
        command: string;
        args: string[];
        description: string;
        provider: "minimax";
    };
};
export declare function addPredefinedServers(provider: "zai" | "minimax"): void;
