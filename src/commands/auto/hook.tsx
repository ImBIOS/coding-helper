import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Flags } from "@oclif/core";
import * as accountsConfig from "../../config/accounts-config.js";
import { BaseCommand } from "../../oclif/base.js";

/**
 * Hook command for Claude Code SessionStart event.
 *
 * This command is designed to be called from Claude Code hooks.
 * It performs two actions:
 * 1. Rotates to the least-used provider (if rotation is enabled)
 * 2. Updates ~/.claude/settings.json with the active account credentials
 *
 * The rotation happens BEFORE applying credentials, so the CURRENT session
 * always uses the optimal provider based on the rotation strategy.
 *
 * Usage: cohe auto hook [--silent]
 */
export default class AutoHook extends BaseCommand<typeof AutoHook> {
  static description =
    "SessionStart hook - apply current credentials and rotate";
  static examples = [
    "<%= config.bin %> auto hook",
    "<%= config.bin %> auto hook --silent",
  ];

  static flags = {
    silent: Flags.boolean({
      description: "Silent mode (no output, useful for hooks)",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AutoHook);

    // Get the config to check if rotation is enabled
    let config = accountsConfig.loadConfig();

    // First, rotate to the least-used provider if rotation is enabled
    // This ensures the CURRENT session uses the optimal provider
    if (config.rotation.enabled) {
      try {
        await accountsConfig.rotateAcrossProviders();
        // Reload config after rotation to get the updated active provider
        config = accountsConfig.loadConfig();
      } catch {
        // Silent fail - rotation errors shouldn't break the session
      }
    }

    // Get the active model provider account for Claude Code sessions
    // activeModelProviderId is specifically for choosing which API key to use for models
    const currentAccount = config.activeModelProviderId
      ? config.accounts[config.activeModelProviderId]
      : null;

    if (!currentAccount) {
      if (!flags.silent) {
        console.error("No active model provider found");
      }
      return;
    }

    // Update settings.json with current account credentials
    // This is what Claude Code will use for the current session
    // Use HOME env var if set (for testing), otherwise use os.homedir()
    const homeDir = process.env.HOME || homedir();
    const settingsFilePath = join(homeDir, ".claude", "settings.json");
    if (existsSync(settingsFilePath)) {
      try {
        const settingsContent = readFileSync(settingsFilePath, "utf-8");
        const settings = JSON.parse(settingsContent);

        // Determine the model to use based on provider
        let model = currentAccount.defaultModel;
        if (currentAccount.provider === "zai") {
          model = "GLM-4.7";
        } else if (currentAccount.provider === "minimax") {
          model = "MiniMax-M2.1";
        }

        // Update the env section
        settings.env = {
          ANTHROPIC_AUTH_TOKEN: currentAccount.apiKey,
          ANTHROPIC_BASE_URL: currentAccount.baseUrl,
          ANTHROPIC_MODEL: model,
          API_TIMEOUT_MS: "3000000",
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
        };

        // Atomic write: write to temp file first, then rename
        // This prevents data loss if write fails midway
        const tempFilePath = `${settingsFilePath}.tmp`;
        writeFileSync(tempFilePath, JSON.stringify(settings, null, 2));
        renameSync(tempFilePath, settingsFilePath);
      } catch (error) {
        // Silent fail - don't break the session if settings update fails
        if (!flags.silent) {
          console.error("Failed to update settings.json:", error);
        }
      }
    }
  }
}
