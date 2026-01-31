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
export declare const DEFAULT_CONFIG_V2: ImBIOSConfigV2;
export declare function getConfigPathV2(): string;
export declare function loadConfigV2(): ImBIOSConfigV2;
export declare function saveConfigV2(config: ImBIOSConfigV2): void;
export declare function generateAccountId(): string;
export declare function addAccount(name: string, provider: "zai" | "minimax", apiKey: string, baseUrl: string, defaultModel: string): AccountConfig;
export declare function updateAccount(id: string, updates: Partial<AccountConfig>): AccountConfig | null;
export declare function deleteAccount(id: string): boolean;
export declare function getActiveAccount(): AccountConfig | null;
export declare function listAccounts(): AccountConfig[];
export declare function switchAccount(id: string): boolean;
export declare function rotateApiKey(provider: "zai" | "minimax"): AccountConfig | null;
export declare function checkAlerts(usage: {
    used: number;
    limit: number;
    remaining?: number;
}): AlertConfig[];
export declare function updateAlert(id: string, updates: Partial<AlertConfig>): AlertConfig | null;
export declare function toggleDashboard(enabled: boolean, port?: number, host?: string): void;
export declare function configureRotation(enabled: boolean, strategy?: string): void;
