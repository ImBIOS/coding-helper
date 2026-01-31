import { describe, expect, it } from "bun:test";
import type {
  ModelMapping,
  Provider,
  ProviderConfig,
  UsageStats,
} from "./base";

describe("Provider interfaces", () => {
  describe("ProviderConfig", () => {
    it("should accept valid config structure", () => {
      const config: ProviderConfig = {
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
        defaultModel: "model-1",
        models: ["model-1", "model-2"],
      };

      expect(config.apiKey).toBe("test-key");
      expect(config.baseUrl).toBe("https://api.example.com");
      expect(config.defaultModel).toBe("model-1");
      expect(config.models.length).toBe(2);
    });
  });

  describe("UsageStats", () => {
    it("should accept valid usage stats structure", () => {
      const stats: UsageStats = {
        used: 500,
        limit: 1000,
        remaining: 500,
        percentUsed: 50,
      };

      expect(stats.used).toBe(500);
      expect(stats.limit).toBe(1000);
      expect(stats.remaining).toBe(500);
      expect(stats.percentUsed).toBe(50);
    });

    it("should accept zero values", () => {
      const stats: UsageStats = {
        used: 0,
        limit: 0,
        remaining: 0,
        percentUsed: 0,
      };

      expect(stats.used).toBe(0);
    });

    it("should accept values over 100 percent", () => {
      const stats: UsageStats = {
        used: 1500,
        limit: 1000,
        remaining: 0,
        percentUsed: 150,
      };

      expect(stats.percentUsed).toBe(150);
    });
  });

  describe("ModelMapping", () => {
    it("should accept valid model mapping structure", () => {
      const mapping: ModelMapping = {
        opus: "opus-model",
        sonnet: "sonnet-model",
        haiku: "haiku-model",
      };

      expect(mapping.opus).toBe("opus-model");
      expect(mapping.sonnet).toBe("sonnet-model");
      expect(mapping.haiku).toBe("haiku-model");
    });
  });

  describe("Provider interface", () => {
    it("should define required properties", () => {
      const mockProvider: Provider = {
        name: "test",
        displayName: "Test Provider",
        getConfig: () => ({
          apiKey: "",
          baseUrl: "",
          defaultModel: "",
          models: [],
        }),
        getModels: () => [],
        getDefaultModel: (type) => "default",
        testConnection: () => Promise.resolve(true),
        getUsage: () =>
          Promise.resolve({ used: 0, limit: 0, remaining: 0, percentUsed: 0 }),
        getModelMapping: () => ({
          opus: "opus",
          sonnet: "sonnet",
          haiku: "haiku",
        }),
      };

      expect(mockProvider.name).toBe("test");
      expect(mockProvider.displayName).toBe("Test Provider");
    });

    it("should define required methods", () => {
      const mockProvider: Provider = {
        name: "test",
        displayName: "Test",
        getConfig: () => ({
          apiKey: "",
          baseUrl: "",
          defaultModel: "",
          models: [],
        }),
        getModels: () => [],
        getDefaultModel: () => "",
        testConnection: () => Promise.resolve(false),
        getUsage: () =>
          Promise.resolve({ used: 0, limit: 0, remaining: 0, percentUsed: 0 }),
        getModelMapping: () => ({
          opus: "",
          sonnet: "",
          haiku: "",
        }),
      };

      expect(typeof mockProvider.getConfig).toBe("function");
      expect(typeof mockProvider.getModels).toBe("function");
      expect(typeof mockProvider.getDefaultModel).toBe("function");
      expect(typeof mockProvider.testConnection).toBe("function");
      expect(typeof mockProvider.getUsage).toBe("function");
      expect(typeof mockProvider.getModelMapping).toBe("function");
    });
  });
});
