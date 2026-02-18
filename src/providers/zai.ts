import { testAnthropicConnection } from "../utils/anthropic-connection-test";
import type {
  Provider,
  ProviderConfig,
  UsageOptions,
  UsageStats,
} from "./base";

export class ZAIProvider implements Provider {
  name = "zai";
  displayName = "Z.AI (GLM)";

  getConfig(): ProviderConfig {
    return {
      apiKey: process.env.ZAI_API_KEY || "",
      baseUrl: process.env.ZAI_BASE_URL || "https://api.z.ai/api/anthropic",
    };
  }

  async testConnection(): Promise<boolean> {
    const config = this.getConfig();
    return testAnthropicConnection(
      {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: "",
      },
      "ZAI"
    );
  }

  async getUsage(options?: UsageOptions): Promise<UsageStats> {
    const config = this.getConfig();
    const apiKey = options?.apiKey || config.apiKey;

    if (!apiKey) {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

      const response = await fetch(
        "https://api.z.ai/api/monitor/usage/quota/limit",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }

      const data = (await response.json()) as {
        code: number;
        data?: {
          limits?: Array<{
            type: string;
            usage: number;
            currentValue: number;
            remaining: number;
            percentage: number;
          }>;
        };
      };

      // Get both TIME_LIMIT (MCP usage) and TOKENS_LIMIT (model usage)
      const timeLimit = data.data?.limits?.find(
        (limit) => limit.type === "TIME_LIMIT"
      );
      const tokenLimit = data.data?.limits?.find(
        (limit) => limit.type === "TOKENS_LIMIT"
      );

      if (!(timeLimit || tokenLimit)) {
        return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
      }

      // Handle TOKENS_LIMIT - it may only have percentage without usage/currentValue/remaining
      // Fall back to using percentage to derive values when full data is missing
      const modelUsage: UsageStats = tokenLimit
        ? tokenLimit.currentValue !== undefined
          ? {
              used: tokenLimit.currentValue,
              limit: tokenLimit.usage,
              remaining: tokenLimit.remaining,
              percentUsed: tokenLimit.percentage,
            }
          : {
              used: 0,
              limit: 0,
              remaining: 0,
              percentUsed: tokenLimit.percentage,
            }
        : { used: 0, limit: 0, remaining: 0, percentUsed: 0 };

      // Handle TIME_LIMIT - always has full fields
      const mcpUsage: UsageStats = timeLimit
        ? {
            used: timeLimit.currentValue,
            limit: timeLimit.usage,
            remaining: timeLimit.remaining,
            percentUsed: timeLimit.percentage,
          }
        : { used: 0, limit: 0, remaining: 0, percentUsed: 0 };

      // For overall usage, use model usage as primary (for backward compatibility)
      return {
        ...modelUsage,
        modelUsage,
        mcpUsage,
      };
    } catch {
      return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
    }
  }
}

export const zaiProvider = new ZAIProvider();
