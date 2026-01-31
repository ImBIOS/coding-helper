import { type CliInfo, Command, Flags } from "@oclif/core";
import * as settings from "../config/settings.js";
import { minimaxProvider } from "../providers/minimax.js";
import { zaiProvider } from "../providers/zai.js";

export const cliInfo: CliInfo = {
  name: "imbios",
  version: "2.0.0",
  packageJson: "../../package.json",
};

export abstract class BaseCommand extends Command {
  protected getProvider(name: string) {
    if (name === "zai" || name === "glm") {
      return zaiProvider;
    }
    if (name === "minimax") {
      return minimaxProvider;
    }
    throw new Error(`Unknown provider: ${name}`);
  }

  protected getConfiguredProvider() {
    const provider = settings.getActiveProvider();
    if (provider === "zai" || provider === "glm") {
      return zaiProvider;
    }
    return minimaxProvider;
  }

  protected async promptProvider() {
    const { select } = await import("../utils/prompts.js");
    return select("Select provider:", ["zai", "minimax"]) as Promise<
      "zai" | "minimax"
    >;
  }

  protected async promptApiKey(provider: string) {
    const { password } = await import("../utils/prompts.js");
    return password(`Enter API Key for ${provider}:`);
  }

  protected async promptBaseUrl(defaultUrl: string) {
    const { input } = await import("../utils/prompts.js");
    return input("Base URL:", defaultUrl);
  }
}

export const commonFlags = {
  provider: Flags.string({
    char: "p",
    description: "Provider name (zai or minimax)",
  }),
} as const;
