import type { ModelMapping, Provider, ProviderConfig, UsageStats } from "./base";
export declare class MiniMaxProvider implements Provider {
    name: string;
    displayName: string;
    getConfig(): ProviderConfig;
    getModels(): string[];
    getDefaultModel(type: "opus" | "sonnet" | "haiku"): string;
    getModelMapping(): ModelMapping;
    testConnection(): Promise<boolean>;
    getUsage(): Promise<UsageStats>;
}
export declare const minimaxProvider: MiniMaxProvider;
