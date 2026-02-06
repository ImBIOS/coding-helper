import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Box, Text } from "ink";
import { BaseCommand } from "../../oclif/base.js";
import { Error as ErrorBadge, Info, Section, Success } from "../../ui/index.js";

export default class HooksSetup extends BaseCommand<typeof HooksSetup> {
  static description = "Install all Claude Code hooks globally";
  static examples = ["<%= config.bin %> hooks setup"];

  async run(): Promise<void> {
    const claudeSettingsPath = path.join(os.homedir(), ".claude");
    const settingsFilePath = path.join(claudeSettingsPath, "settings.json");

    // Hook commands - using cohe CLI directly for auto-updates
    const sessionStartCommand = "cohe auto hook --silent";
    const postToolCommand = "cohe hooks post-tool --silent";
    const stopCommand = "cohe hooks stop --silent";

    try {
      // Read existing settings or create new
      let settings: Record<string, unknown> = {};
      if (fs.existsSync(settingsFilePath)) {
        const content = fs.readFileSync(settingsFilePath, "utf-8");
        try {
          settings = JSON.parse(content);
        } catch {
          settings = {};
        }
      }

      // Initialize hooks object if it doesn't exist
      if (!settings.hooks) {
        settings.hooks = {};
      }

      let hooksInstalled = 0;
      let hooksSkipped = 0;

      // Install SessionStart hook (auto-rotate)
      if (!settings.hooks.SessionStart) {
        settings.hooks.SessionStart = [];
      }
      const sessionStartExists = (
        settings.hooks.SessionStart as Array<unknown>
      ).some(
        (hookConfig: any) =>
          hookConfig.type === "command" &&
          hookConfig.command &&
          (hookConfig.command === sessionStartCommand ||
            hookConfig.command.includes("auto hook") ||
            hookConfig.command.includes("auto-rotate.sh"))
      );
      if (sessionStartExists) {
        hooksSkipped++;
      } else {
        (settings.hooks.SessionStart as Array<unknown>).push({
          matcher: "startup|resume|clear|compact",
          hooks: [
            {
              type: "command",
              command: sessionStartCommand,
            },
          ],
        });
        hooksInstalled++;
      }

      // Install PostToolUse hook (format files)
      if (!settings.hooks.PostToolUse) {
        settings.hooks.PostToolUse = [];
      }
      const postToolExists = (
        settings.hooks.PostToolUse as Array<unknown>
      ).some(
        (hookConfig: any) =>
          hookConfig.type === "command" &&
          hookConfig.command &&
          hookConfig.command.includes("hooks post-tool")
      );
      if (postToolExists) {
        hooksSkipped++;
      } else {
        (settings.hooks.PostToolUse as Array<unknown>).push({
          matcher: "Write|Edit",
          hooks: [
            {
              type: "command",
              command: postToolCommand,
            },
          ],
        });
        hooksInstalled++;
      }

      // Install Stop hook (notifications)
      if (!settings.hooks.Stop) {
        settings.hooks.Stop = [];
      }
      const stopExists = (settings.hooks.Stop as Array<unknown>).some(
        (hookConfig: any) =>
          hookConfig.type === "command" &&
          hookConfig.command &&
          hookConfig.command.includes("hooks stop")
      );
      if (stopExists) {
        hooksSkipped++;
      } else {
        (settings.hooks.Stop as Array<unknown>).push({
          hooks: [
            {
              type: "command",
              command: stopCommand,
            },
          ],
        });
        hooksInstalled++;
      }

      // Write updated settings
      fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));

      await this.renderApp(
        <Section title="Hooks Setup">
          <Box flexDirection="column">
            <Success>
              Installed {hooksInstalled} hook(s), {hooksSkipped} already
              present.
            </Success>
            <Box marginTop={1}>
              <Text dimmed>Settings location: {settingsFilePath}</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Info>Installed hooks:</Info>
              <Box marginLeft={2}>
                <Text>• SessionStart: Auto-rotate API keys on startup</Text>
              </Box>
              <Box marginLeft={2}>
                <Text>• PostToolUse: Format files after Write|Edit</Text>
              </Box>
              <Box marginLeft={2}>
                <Text>
                  • Stop: Notifications + commit prompt on session end
                </Text>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Info>
                Uses the cohe CLI directly, so all hooks auto-update with the
                package.
              </Info>
            </Box>
          </Box>
        </Section>
      );
    } catch (error: any) {
      await this.renderApp(
        <Section title="Hooks Setup">
          <Box flexDirection="column">
            <ErrorBadge>Failed to install hooks</ErrorBadge>
            <Box marginTop={1}>
              <Text color="red">{error.message}</Text>
            </Box>
          </Box>
        </Section>
      );
    }
  }
}
