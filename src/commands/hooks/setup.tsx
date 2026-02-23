import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Box, Text } from "ink";
import { BaseCommand } from "../../oclif/base";
import { Error as ErrorBadge, Info, Section, Success } from "../../ui/index";

interface HookConfig {
  type: string;
  command: string;
}

interface HookGroup {
  matcher?: string;
  hooks: HookConfig[];
}

interface HooksConfig {
  SessionStart?: HookGroup[];
  PostToolUse?: HookGroup[];
  Stop?: HookGroup[];
}

interface ClaudeSettings {
  hooks?: HooksConfig;
  [key: string]: unknown;
}

export default class HooksSetup extends BaseCommand<typeof HooksSetup> {
  static description = "Install all Claude Code hooks globally";
  static examples = ["<%= config.bin %> hooks setup"];

  async run(): Promise<void> {
    const claudeSettingsPath = path.join(os.homedir(), ".claude");
    const settingsFilePath = path.join(claudeSettingsPath, "settings.json");

    // Hook commands - using cohe CLI directly for auto-updates
    const sessionStartCommand = "cohe auto hook --silent";
    const postToolCommand = "cohe hooks post-tool --silent";
    const stopCommand = "cohe hooks stop";

    try {
      // Read existing settings or create new
      let settings: ClaudeSettings = {};
      if (fs.existsSync(settingsFilePath)) {
        const content = fs.readFileSync(settingsFilePath, "utf-8");
        try {
          settings = JSON.parse(content) as ClaudeSettings;
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
      const sessionStartExists = settings.hooks.SessionStart.some((hookGroup) =>
        hookGroup.hooks.some(
          (hookConfig) =>
            hookConfig.type === "command" &&
            hookConfig.command &&
            (hookConfig.command === sessionStartCommand ||
              hookConfig.command.includes("auto hook") ||
              hookConfig.command.includes("auto-rotate.sh"))
        )
      );
      if (sessionStartExists) {
        hooksSkipped++;
      } else {
        settings.hooks.SessionStart.push({
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
      const postToolExists = settings.hooks.PostToolUse.some((hookGroup) =>
        hookGroup.hooks.some(
          (hookConfig) =>
            hookConfig.type === "command" &&
            hookConfig.command &&
            hookConfig.command.includes("hooks post-tool")
        )
      );
      if (postToolExists) {
        hooksSkipped++;
      } else {
        settings.hooks.PostToolUse.push({
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
      const stopExists = settings.hooks.Stop.some((hookGroup) =>
        hookGroup.hooks.some(
          (hookConfig) =>
            hookConfig.type === "command" &&
            hookConfig.command &&
            hookConfig.command.includes("hooks stop")
        )
      );
      if (stopExists) {
        hooksSkipped++;
      } else {
        settings.hooks.Stop.push({
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
              <Text dimColor>Settings location: {settingsFilePath}</Text>
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
    } catch (error: unknown) {
      const err = error as Error;
      await this.renderApp(
        <Section title="Hooks Setup">
          <Box flexDirection="column">
            <ErrorBadge>Failed to install hooks</ErrorBadge>
            <Box marginTop={1}>
              <Text color="red">{err.message}</Text>
            </Box>
          </Box>
        </Section>
      );
    }
  }
}
