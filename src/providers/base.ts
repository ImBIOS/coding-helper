export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

export interface ModelMapping {
  opus: string;
  sonnet: string;
  haiku: string;
}

export interface UsageStats {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export interface Provider {
  name: string;
  displayName: string;
  getConfig(): ProviderConfig;
  getModels(): string[];
  getDefaultModel(type: "opus" | "sonnet" | "haiku"): string;
  testConnection(): Promise<boolean>;
  getUsage(): Promise<UsageStats>;
  getModelMapping(): ModelMapping;
}
