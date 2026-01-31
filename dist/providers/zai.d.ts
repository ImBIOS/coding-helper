import type { ModelMapping, Provider, ProviderConfig, UsageStats } from "./base";
export declare class ZAIProvider implements Provider {
    name: string;
    displayName: string;
    getConfig(): ProviderConfig;
    getModels(): string[];
    getDefaultModel(type: "opus" | "sonnet" | "haiku"): string;
    getModelMapping(): ModelMapping;
    testConnection(): Promise<boolean>;
    getUsage(): Promise<UsageStats>;
}
export declare const zaiProvider: ZAIProvider;
