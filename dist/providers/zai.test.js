import { beforeEach, describe, expect, it } from "bun:test";
import { ZAIProvider, zaiProvider } from "./zai";
describe("ZAIProvider", () => {
    let provider;
    beforeEach(() => {
        provider = new ZAIProvider();
    });
    describe("name", () => {
        it("should have name 'zai'", () => {
            expect(provider.name).toBe("zai");
        });
    });
    describe("displayName", () => {
        it("should have displayName 'Z.AI (GLM)'", () => {
            expect(provider.displayName).toBe("Z.AI (GLM)");
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
            const originalApiKey = process.env.ZAI_API_KEY;
            const originalBaseUrl = process.env.ZAI_BASE_URL;
            process.env.ZAI_API_KEY = "test-api-key";
            process.env.ZAI_BASE_URL = "https://custom.api.url";
            const config = provider.getConfig();
            expect(config.apiKey).toBe("test-api-key");
            expect(config.baseUrl).toBe("https://custom.api.url");
            // Restore
            if (originalApiKey !== undefined) {
                process.env.ZAI_API_KEY = originalApiKey;
            }
            else {
                delete process.env.ZAI_API_KEY;
            }
            if (originalBaseUrl !== undefined) {
                process.env.ZAI_BASE_URL = originalBaseUrl;
            }
            else {
                delete process.env.ZAI_BASE_URL;
            }
        });
        it("should have default baseUrl", () => {
            const config = provider.getConfig();
            expect(config.baseUrl).toContain("api.z.ai");
        });
        it("should have default model", () => {
            const config = provider.getConfig();
            expect(config.defaultModel).toBe("GLM-4.7");
        });
        it("should include all GLM models", () => {
            const config = provider.getConfig();
            expect(config.models).toContain("GLM-4.7");
            expect(config.models).toContain("GLM-4.5-Air");
            expect(config.models).toContain("GLM-4.5-Air-X");
        });
    });
    describe("getModels", () => {
        it("should return list of GLM models", () => {
            const models = provider.getModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models).toContain("GLM-4.7");
            expect(models).toContain("GLM-4.5-Air");
            expect(models).toContain("GLM-4.5-Air-X");
        });
    });
    describe("getDefaultModel", () => {
        it("should return GLM-4.7 for opus", () => {
            expect(provider.getDefaultModel("opus")).toBe("GLM-4.7");
        });
        it("should return GLM-4.7 for sonnet", () => {
            expect(provider.getDefaultModel("sonnet")).toBe("GLM-4.7");
        });
        it("should return GLM-4.5-Air for haiku", () => {
            expect(provider.getDefaultModel("haiku")).toBe("GLM-4.5-Air");
        });
    });
    describe("getModelMapping", () => {
        it("should return model mapping", () => {
            const mapping = provider.getModelMapping();
            expect(mapping).toHaveProperty("opus");
            expect(mapping).toHaveProperty("sonnet");
            expect(mapping).toHaveProperty("haiku");
            expect(mapping.opus).toBe("GLM-4.7");
            expect(mapping.sonnet).toBe("GLM-4.7");
            expect(mapping.haiku).toBe("GLM-4.5-Air");
        });
    });
    describe("testConnection", () => {
        it("should return false when api key is not set", async () => {
            delete process.env.ZAI_API_KEY;
            const result = await provider.testConnection();
            expect(result).toBe(false);
        });
        it("should handle fetch errors gracefully", async () => {
            process.env.ZAI_API_KEY = "test-key";
            // Mock fetch to throw an error
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (() => {
                throw new Error("Network error");
            });
            const result = await provider.testConnection();
            expect(result).toBe(false);
            globalThis.fetch = originalFetch;
        });
        it("should return true for status 405 (method not allowed)", async () => {
            process.env.ZAI_API_KEY = "test-key";
            const mockResponse = {
                ok: false,
                status: 405,
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (() => Promise.resolve(mockResponse));
            const result = await provider.testConnection();
            expect(result).toBe(true);
            globalThis.fetch = originalFetch;
        });
    });
    describe("getUsage", () => {
        it("should return zero stats when api key is not set", async () => {
            delete process.env.ZAI_API_KEY;
            const usage = await provider.getUsage();
            expect(usage.used).toBe(0);
            expect(usage.limit).toBe(0);
            expect(usage.remaining).toBe(0);
            expect(usage.percentUsed).toBe(0);
        });
        it("should handle non-ok response", async () => {
            process.env.ZAI_API_KEY = "test-key";
            const mockResponse = {
                ok: false,
                status: 500,
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (() => Promise.resolve(mockResponse));
            const usage = await provider.getUsage();
            expect(usage.used).toBe(0);
            expect(usage.limit).toBe(0);
            globalThis.fetch = originalFetch;
        });
        it("should parse usage from response", async () => {
            process.env.ZAI_API_KEY = "test-key";
            const mockResponse = {
                ok: true,
                status: 200,
                json: () => Promise.resolve({ used: 750, limit: 1000 }),
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (() => Promise.resolve(mockResponse));
            const usage = await provider.getUsage();
            expect(usage.used).toBe(750);
            expect(usage.limit).toBe(1000);
            expect(usage.remaining).toBe(250);
            expect(usage.percentUsed).toBe(75);
            globalThis.fetch = originalFetch;
        });
        it("should handle missing fields in response", async () => {
            process.env.ZAI_API_KEY = "test-key";
            const mockResponse = {
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (() => Promise.resolve(mockResponse));
            const usage = await provider.getUsage();
            expect(usage.used).toBe(0);
            expect(usage.limit).toBe(0);
            expect(usage.percentUsed).toBe(0);
            globalThis.fetch = originalFetch;
        });
        it("should not return negative remaining", async () => {
            process.env.ZAI_API_KEY = "test-key";
            const mockResponse = {
                ok: true,
                status: 200,
                json: () => Promise.resolve({ used: 1500, limit: 1000 }),
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (() => Promise.resolve(mockResponse));
            const usage = await provider.getUsage();
            expect(usage.remaining).toBe(0);
            globalThis.fetch = originalFetch;
        });
    });
    describe("zaiProvider singleton", () => {
        it("should be exported as singleton instance", () => {
            expect(zaiProvider).toBeInstanceOf(ZAIProvider);
            expect(zaiProvider.name).toBe("zai");
        });
    });
});
