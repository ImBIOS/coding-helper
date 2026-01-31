import { describe, expect, it } from "bun:test";
import {
  getActiveProvider,
  getConfigDir,
  getConfigPath,
  getUsageHistory,
  loadConfig,
} from "./settings";

describe("settings", () => {
  describe("getConfigDir", () => {
    it("should return config directory path", () => {
      const configDir = getConfigDir();
      expect(configDir).toContain(".claude");
    });
  });

  describe("getConfigPath", () => {
    it("should return config file path", () => {
      const configPath = getConfigPath();
      expect(configPath).toContain(".claude");
      expect(configPath).toContain("imbios.json");
    });
  });

  describe("loadConfig", () => {
    it("should return default config provider", () => {
      const config = loadConfig();
      // The function returns a default config with provider: "zai"
      expect(config).toBeDefined();
      expect(config).toHaveProperty("provider");
    });
  });

  describe("getActiveProvider", () => {
    it("should return a valid provider", () => {
      const provider = getActiveProvider();
      expect(provider).toBe("zai");
    });
  });

  describe("getUsageHistory", () => {
    it("should return array for provider", () => {
      const history = getUsageHistory("zai");
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
