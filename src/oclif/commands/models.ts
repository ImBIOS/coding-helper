import { section, info, table } from "../../utils/logger.js";
import { zaiProvider } from "../../providers/zai.js";
import { minimaxProvider } from "../../providers/minimax.js";

export default async function modelsCommand(args: string[]) {
  const providerArg = args[0] as "zai" | "minimax" | undefined;

  if (providerArg) {
    if (providerArg !== "zai" && providerArg !== "minimax") {
      info("Invalid provider. Use 'zai' or 'minimax'.");
      return;
    }
    listModelsForProvider(providerArg);
  } else {
    // List all models
    section("Available Models");

    info("ZAI Models:");
    const zaiModels = zaiProvider.getModels();
    table(zaiModels.reduce((acc, m, i) => ({ ...acc, [i + 1]: m }), {}));

    info("");
    info("MiniMax Models:");
    const minimaxModels = minimaxProvider.getModels();
    table(minimaxModels.reduce((acc, m, i) => ({ ...acc, [i + 1]: m }), {}));
  }
}

function listModelsForProvider(provider: "zai" | "minimax") {
  const providerObj = provider === "zai" ? zaiProvider : minimaxProvider;

  section(`${provider.toUpperCase()} Models`);

  const models = providerObj.getModels();
  table(models.reduce((acc, m, i) => ({ ...acc, [i + 1]: m }), {}));
}
