import * as settings from "../../config/settings.js";
import { section, info, warning, error as logError } from "../../utils/logger.js";

export default async function historyCommand() {
  section("Usage History");

  const providerName = settings.getActiveProvider();
  const provider = providerName === "zai"
    ? await import("../../providers/zai.js").then(m => m.zaiProvider)
    : await import("../../providers/minimax.js").then(m => m.minimaxProvider);

  const config = provider.getConfig();

  if (!config.apiKey) {
    warning("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }

  try {
    const history = await provider.getUsageHistory();

    if (history.length === 0) {
      info("No usage history available.");
      return;
    }

    // Display last 10 entries
    const recentHistory = history.slice(-10).reverse();

    info("Recent Usage:");
    recentHistory.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleString();
      info(`  ${date}: ${record.used}/${record.limit} (${record.percentUsed.toFixed(1)}%)`);
    });
  } catch (err) {
    logError(`Failed to get usage history: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
