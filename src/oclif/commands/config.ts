import * as settings from "../../config/settings.js";
import { minimaxProvider } from "../../providers/minimax.js";
import { zaiProvider } from "../../providers/zai.js";
import { error, info, section, success } from "../../utils/logger.js";

export default async function configCommand(args: string[]) {
  // Parse flags
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.replace(/^--/, "");
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        flags[key] = args[i + 1];
        i++;
      } else if (key === "help" || key === "h") {
        flags.help = "true";
      }
    } else if (arg.startsWith("-")) {
      const key = arg.replace(/^-/, "");
      if (args[i + 1] && !args[i + 1].startsWith("-")) {
        flags[key] = args[i + 1];
        i++;
      }
    }
  }

  if (flags.help || flags.h) {
    console.log(`
Configure API providers

Usage: imbios config [options]

Options:
  --provider, -p <name>  Provider to configure (zai or minimax)
  --api-key, -k <key>    API key
  --base-url, -u <url>   Base URL
  --model, -m <model>    Default model
  --help, -h             Show this help

Examples:
  imbios config              # Interactive configuration
  imbios config -p zai -k xxx  # Configure ZAI with API key
`);
    return;
  }

  section("ImBIOS Configuration");

  // Get provider
  let provider: "zai" | "minimax";
  if (flags.provider || flags.p) {
    const p = flags.provider || flags.p;
    if (p !== "zai" && p !== "minimax") {
      error(`Invalid provider: ${p}. Use 'zai' or 'minimax'.`);
      return;
    }
    provider = p;
  } else {
    const { select } = await import("../../utils/prompts.js");
    provider = (await select("Select provider:", ["zai", "minimax"])) as
      | "zai"
      | "minimax";
  }

  info(`Configuring ${provider.toUpperCase()} provider...`);

  const existingConfig = settings.getProviderConfig(provider);

  // Get API key
  let apiKey = flags.apiKey || flags.k;
  if (!apiKey) {
    const { password } = await import("../../utils/prompts.js");
    apiKey = await password(`Enter API key for ${provider}:`);
  }

  // Get base URL
  let baseUrl = flags.baseUrl || flags.u;
  if (!baseUrl) {
    const providerObj = provider === "zai" ? zaiProvider : minimaxProvider;
    const { input } = await import("../../utils/prompts.js");
    baseUrl = await input(
      "Base URL:",
      existingConfig.baseUrl || providerObj.getConfig().baseUrl
    );
  }

  // Get default model
  let defaultModel = flags.model || flags.m;
  if (!defaultModel) {
    const providerObj = provider === "zai" ? zaiProvider : minimaxProvider;
    const models = providerObj.getModels();
    const { select } = await import("../../utils/prompts.js");
    defaultModel = await select("Default model:", models);
  }

  if (!apiKey) {
    error("API key is required!");
    return;
  }

  settings.setProviderConfig(provider, apiKey, baseUrl, defaultModel);
  success(`${provider.toUpperCase()} configuration saved!`);
}
