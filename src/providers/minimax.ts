import type {
  ModelMapping,
  Provider,
  ProviderConfig,
  UsageStats,
} from "./base";

const MINIMAX_MODEL_MAPPING: ModelMapping = {
  opus: "MiniMax-M2.1",
  sonnet: "MiniMax-M2.1",
  haiku: "MiniMax-M2",
};

export class MiniMaxProvider implements Provider {
  name = "minimax";
  displayName = "MiniMax";

  getConfig(): ProviderConfig {
    return {
      apiKey: process.env.MINIMAX_API_KEY || "",
      baseUrl:
        process.env.MINIMAX_BASE_URL || "https://api.minimax.io/anthropic",
      defaultModel: "MiniMax-M2.1",
      models: ["MiniMax-M2.1", "MiniMax-M2"],
    };
  }

  getModels(): string[] {
    return ["MiniMax-M2.1", "MiniMax-M2"];
  }

  getDefaultModel(type: "opus" | "sonnet" | "haiku"): string {
    return MINIMAX_MODEL_MAPPING[type];
  }

  getModelMapping(): ModelMapping {
    return MINIMAX_MODEL_MAPPING;
  }

  async testConnection(): Promise<boolean> {
    const config = this.getConfig();
    if (!config.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }

  async getUsage(): Promise<UsageStats> {
    const config = this.getConfig();
    if (!config.apiKey) {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }

    try {
      const response = await fetch(`${config.baseUrl}/credits`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }

      const data = (await response.json()) as { used?: number; limit?: number };
      const used = data.used || 0;
      const limit = data.limit || 0;
      const remaining = Math.max(0, limit - used);

      return {
        used,
        limit,
        remaining,
        percentUsed: limit > 0 ? (used / limit) * 100 : 0,
      };
    } catch {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
  }
}

export const minimaxProvider = new MiniMaxProvider();
