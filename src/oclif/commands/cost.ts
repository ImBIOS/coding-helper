import * as settings from "../../config/settings.js";
import { section, info, warning, table } from "../../utils/logger.js";

export default async function costCommand(args: string[]) {
  section("Cost Estimation");

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

  const models = provider.getModels();
  const model = args[0] ?? config.defaultModel;

  if (!models.includes(model)) {
    warning(`Model '${model}' not found in provider models.`);
    info(`Available models: ${models.join(", ")}`);
    return;
  }

  // Get pricing
  const pricing = provider.getPricing(model);

  table({
    Model: model,
    "Input (per 1M tokens)": `$${pricing.inputPerMillion.toFixed(2)}`,
    "Output (per 1M tokens)": `$${pricing.outputPerMillion.toFixed(2)}`,
  });

  info("");
  info("Note: Actual costs may vary. These are estimated rates.");
}
