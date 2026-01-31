import * as settings from "../../config/settings.js";
import { info, section, success, table, warning } from "../../utils/logger.js";

export default async function switchCommand(args: string[]) {
  const targetProvider = args[0] as "zai" | "minimax" | "glm" | undefined;

  if (!targetProvider) {
    console.log(`
Switch active provider

Usage: imbios switch <provider>

Arguments:
  provider    Provider to switch to (zai, minimax, or glm)

Examples:
  imbios switch zai      # Switch to ZAI
  imbios switch minimax  # Switch to MiniMax
  imbios switch glm      # Alias for ZAI
`);
    return;
  }

  if (targetProvider === "glm") {
    // GLM is just an alias for ZAI
    doSwitch("zai");
    return;
  }

  if (targetProvider !== "zai" && targetProvider !== "minimax") {
    error(`Unknown provider: ${targetProvider}. Use 'zai' or 'minimax'.`);
    return;
  }

  doSwitch(targetProvider);
}

function doSwitch(provider: "zai" | "minimax") {
  const currentProvider = settings.getActiveProvider();

  if (currentProvider === provider) {
    info(`Already using ${provider.toUpperCase()}.`);
    return;
  }

  const config = settings.getProviderConfig(provider);

  if (!config.apiKey) {
    warning(`${provider.toUpperCase()} is not configured.`);
    info("Run 'imbios config' to configure the provider first.");
    return;
  }

  settings.setActiveProvider(provider);
  success(`Switched to ${provider.toUpperCase()}.`);

  section("Current Configuration");
  table({
    Provider: provider.toUpperCase(),
    "API Key": config.apiKey ? "***" + config.apiKey.slice(-4) : "Not set",
    "Base URL": config.baseUrl || "Default",
    "Default Model": config.defaultModel,
  });
}
