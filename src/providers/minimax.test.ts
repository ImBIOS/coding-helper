import { beforeEach, describe, expect, it } from "bun:test";
import { MiniMaxProvider, minimaxProvider } from "./minimax";

describe("MiniMaxProvider", () => {
  let provider: MiniMaxProvider;

  beforeEach(() => {
    provider = new MiniMaxProvider();
  });

  describe("name", () => {
    it("should have name 'minimax'", () => {
      expect(provider.name).toBe("minimax");
    });
  });

  describe("displayName", () => {
    it("should have displayName 'MiniMax'", () => {
      expect(provider.displayName).toBe("MiniMax");
    });
  });

  describe("getConfig", () => {
    it("should return provider config", () => {
      const config = provider.getConfig();

      expect(config).toHaveProperty("apiKey");
      expect(config).toHaveProperty("baseUrl");
      expect(config).toHaveProperty("defaultModel");
      expect(config).toHaveProperty("models");
    });

    it("should use environment variables if set", () => {
      const originalApiKey = process.env.MINIMAX_API_KEY;
      const originalBaseUrl = process.env.MINIMAX_BASE_URL;

      process.env.MINIMAX_API_KEY = "test-api-key";
      process.env.MINIMAX_BASE_URL = "https://custom.api.url";

      const config = provider.getConfig();
      expect(config.apiKey).toBe("test-api-key");
      expect(config.baseUrl).toBe("https://custom.api.url");

      // Restore
      if (originalApiKey !== undefined) {
        process.env.MINIMAX_API_KEY = originalApiKey;
      } else {
        delete process.env.MINIMAX_API_KEY;
      }
      if (originalBaseUrl !== undefined) {
        process.env.MINIMAX_BASE_URL = originalBaseUrl;
      } else {
        delete process.env.MINIMAX_BASE_URL;
      }
    });

    it("should have default baseUrl", () => {
      const config = provider.getConfig();
      expect(config.baseUrl).toContain("api.minimax.io");
    });

    it("should have default model", () => {
      const config = provider.getConfig();
      expect(config.defaultModel).toBe("MiniMax-M2.1");
    });
  });

  describe("getModels", () => {
    it("should return list of models", () => {
      const models = provider.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models).toContain("MiniMax-M2.1");
      expect(models).toContain("MiniMax-M2");
    });
  });

  describe("getDefaultModel", () => {
    it("should return MiniMax-M2.1 for opus", () => {
      expect(provider.getDefaultModel("opus")).toBe("MiniMax-M2.1");
    });

    it("should return MiniMax-M2.1 for sonnet", () => {
      expect(provider.getDefaultModel("sonnet")).toBe("MiniMax-M2.1");
    });

    it("should return MiniMax-M2 for haiku", () => {
      expect(provider.getDefaultModel("haiku")).toBe("MiniMax-M2");
    });
  });

  describe("getModelMapping", () => {
    it("should return model mapping", () => {
      const mapping = provider.getModelMapping();

      expect(mapping).toHaveProperty("opus");
      expect(mapping).toHaveProperty("sonnet");
      expect(mapping).toHaveProperty("haiku");
      expect(mapping.opus).toBe("MiniMax-M2.1");
      expect(mapping.haiku).toBe("MiniMax-M2");
    });
  });

  describe("testConnection", () => {
    it("should return false when api key is not set", async () => {
      delete process.env.MINIMAX_API_KEY;
      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it("should handle fetch errors gracefully", async () => {
      process.env.MINIMAX_API_KEY = "test-key";
      // Mock fetch to throw an error
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() => {
        throw new Error("Network error");
      }) as unknown as typeof fetch;

      const result = await provider.testConnection();
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });
  });

  describe("getUsage", () => {
    it("should return zero stats when api key is not set", async () => {
      delete process.env.MINIMAX_API_KEY;
      const usage = await provider.getUsage();

      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(0);
      expect(usage.remaining).toBe(0);
      expect(usage.percentUsed).toBe(0);
    });

    it("should handle non-ok response", async () => {
      process.env.MINIMAX_API_KEY = "test-key";

      const mockResponse = {
        ok: false,
        status: 500,
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.resolve(
          mockResponse as unknown as Response
        )) as unknown as typeof fetch;

      const usage = await provider.getUsage();

      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(0);

      globalThis.fetch = originalFetch;
    });

    it("should parse usage from response", async () => {
      process.env.MINIMAX_API_KEY = "test-key";

      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ used: 500, limit: 1000 }),
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.resolve(
          mockResponse as unknown as Response
        )) as unknown as typeof fetch;

      const usage = await provider.getUsage();

      expect(usage.used).toBe(500);
      expect(usage.limit).toBe(1000);
      expect(usage.remaining).toBe(500);
      expect(usage.percentUsed).toBe(50);

      globalThis.fetch = originalFetch;
    });
  });

  describe("minimaxProvider singleton", () => {
    it("should be exported as singleton instance", () => {
      expect(minimaxProvider).toBeInstanceOf(MiniMaxProvider);
      expect(minimaxProvider.name).toBe("minimax");
    });
  });
});
