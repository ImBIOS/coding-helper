import * as settings from "../../config/settings.js";
import { info, section, table, warning } from "../../utils/logger.js";

export default async function usageCommand() {
  section("Usage Statistics");

  const providerName = settings.getActiveProvider();
  const provider =
    providerName === "zai"
      ? await import("../../providers/zai.js").then((m) => m.zaiProvider)
      : await import("../../providers/minimax.js").then(
          (m) => m.minimaxProvider
        );

  const config = provider.getConfig();

  if (!config.apiKey) {
    warning("API key is not configured.");
    info("Run 'imbios config' to configure the provider first.");
    return;
  }

  info(`Querying ${provider.name} usage...`);

  try {
    const usage = await provider.getUsage();

    table({
      Provider: provider.name.toUpperCase(),
      Used: usage.used.toLocaleString(),
      Limit: usage.limit.toLocaleString(),
      Remaining: (usage.remaining ?? usage.limit - usage.used).toLocaleString(),
      "Percent Used": `${usage.percentUsed.toFixed(1)}%`,
    });
  } catch (err) {
    warning(
      `Failed to get usage: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}
