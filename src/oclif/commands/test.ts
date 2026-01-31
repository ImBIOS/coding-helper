import * as settings from "../../config/settings.js";
import {
  info,
  error as logError,
  section,
  success,
} from "../../utils/logger.js";

export default async function testCommand() {
  section("Testing API Connection");

  const providerName = settings.getActiveProvider();
  const provider =
    providerName === "zai"
      ? await import("../../providers/zai.js").then((m) => m.zaiProvider)
      : await import("../../providers/minimax.js").then(
          (m) => m.minimaxProvider
        );

  const config = provider.getConfig();

  if (!config.apiKey) {
    logError("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }

  info(`Testing ${provider.name} connection...`);

  try {
    const result = await provider.testConnection();
    if (result) {
      success("Connection successful!");
    } else {
      logError(
        "Connection failed. Please check your API key and configuration."
      );
    }
  } catch (err) {
    logError(
      `Connection error: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}
