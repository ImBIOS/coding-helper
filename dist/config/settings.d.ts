export interface ImBIOSConfig {
    provider: "zai" | "minimax";
    zai?: {
        apiKey: string;
        baseUrl: string;
        defaultModel: string;
        models: string[];
    };
    minimax?: {
        apiKey: string;
        baseUrl: string;
        defaultModel: string;
        models: string[];
    };
    history?: {
        zai?: UsageRecord[];
        minimax?: UsageRecord[];
    };
}
export interface UsageRecord {
    date: string;
    used: number;
    limit: number;
}
export declare function getConfigDir(): string;
export declare function getConfigPath(): string;
export declare function loadConfig(): ImBIOSConfig;
export declare function saveConfig(config: ImBIOSConfig): void;
export declare function getProviderConfig(provider: "zai" | "minimax"): Record<string, string>;
export declare function setProviderConfig(provider: "zai" | "minimax", apiKey: string, baseUrl: string, defaultModel: string): void;
export declare function getActiveProvider(): "zai" | "minimax";
export declare function setActiveProvider(provider: "zai" | "minimax"): void;
export declare function recordUsage(provider: "zai" | "minimax", used: number, limit: number): void;
export declare function getUsageHistory(provider: "zai" | "minimax"): UsageRecord[];
