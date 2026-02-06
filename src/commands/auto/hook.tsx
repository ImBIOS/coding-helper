import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Flags } from "@oclif/core";
import { BaseCommand } from "../../oclif/base.ts";
import * as accountsConfig from "../../config/accounts-config.ts";

/**
 * Hook command for Claude Code SessionStart event.
 *
 * This command is designed to be called from Claude Code hooks.
 * It performs two actions:
 * 1. Updates ~/.claude/settings.json with the current active account credentials
 * 2. Rotates to the next account (for the next session)
 *
 * Usage: cohe auto hook [--silent]
 */
export default class AutoHook extends BaseCommand<typeof AutoHook> {
  static description = "SessionStart hook - apply current credentials and rotate";
  static examples = ["<%= config.bin %> auto hook", "<%= config.bin %> auto hook --silent"];

  static flags = {
    silent: Flags.boolean({
      description: "Silent mode (no output, useful for hooks)",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AutoHook);

    // Get current active account (this is what the CURRENT session should use)
    const currentAccount = accountsConfig.getActiveAccount();

    if (!currentAccount) {
      if (!flags.silent) {
        console.error("No active account found");
      }
      return;
    }

    // Update settings.json with current account credentials
    // This is what Claude Code will use for the current session
    const settingsFilePath = path.join(os.homedir(), ".claude", "settings.json");
    if (fs.existsSync(settingsFilePath)) {
      try {
        const settingsContent = fs.readFileSync(settingsFilePath, "utf-8");
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

        fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
      } catch (error) {
        // Silent fail - don't break the session if settings update fails
        if (!flags.silent) {
          console.error("Failed to update settings.json:", error);
        }
      }
    }

    // Now rotate to the next account for the NEXT session
    const config = accountsConfig.loadConfigV2();

    // Only rotate if rotation is enabled
    if (!config.rotation.enabled) {
      return;
    }

    // Rotate asynchronously - don't block the hook
    setImmediate(async () => {
      try {
        await accountsConfig.rotateAcrossProviders();
      } catch {
        // Silent fail - rotation errors shouldn't break the session
      }
    });
  }
}
