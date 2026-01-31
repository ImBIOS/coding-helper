import * as settings from "../../config/settings.js";
import { info, section, table } from "../../utils/logger.js";

export default async function statusCommand() {
  section("ImBIOS Status");

  const provider = settings.getActiveProvider();
  const config = settings.getProviderConfig(provider);

  table({
    Active: provider.toUpperCase(),
    "API Key": config.apiKey ? "***" + config.apiKey.slice(-4) : "Not set",
    "Base URL": config.baseUrl || "Default",
    "Default Model": config.defaultModel,
  });

  info("");

  // Check both providers
  const zaiConfig = settings.getProviderConfig("zai");
  const minimaxConfig = settings.getProviderConfig("minimax");

  info("Provider Configurations:");
  table({
    ZAI: zaiConfig.apiKey
      ? `✓ Configured (${zaiConfig.defaultModel})`
      : "✗ Not configured",
    MiniMax: minimaxConfig.apiKey
      ? `✓ Configured (${minimaxConfig.defaultModel})`
      : "✗ Not configured",
  });
}
