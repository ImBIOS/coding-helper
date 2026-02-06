import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Box, Text } from "ink";
import { BaseCommand } from "../../oclif/base.js";
import { Error as ErrorBadge, Info, Section, Success } from "../../ui/index.js";

export default class HooksUninstall extends BaseCommand<typeof HooksUninstall> {
  static description = "Remove all Claude Code hooks";
  static examples = ["<%= config.bin %> hooks uninstall"];

  async run(): Promise<void> {
    const settingsFilePath = path.join(
      os.homedir(),
      ".claude",
      "settings.json"
    );
    const hooksDir = path.join(os.homedir(), ".claude", "hooks");
    const hookScriptPath = path.join(hooksDir, "auto-rotate.sh");

    try {
      let hookRemoved = false;
      let settingsModified = false;
      let hooksRemoved = 0;

      // Remove legacy hook script if it exists
      if (fs.existsSync(hookScriptPath)) {
        fs.unlinkSync(hookScriptPath);
        hookRemoved = true;
      }

      // Update settings.json to remove all cohe hooks
      if (fs.existsSync(settingsFilePath)) {
        const content = fs.readFileSync(settingsFilePath, "utf-8");
        let settings: Record<string, unknown>;

        try {
          settings = JSON.parse(content);
        } catch {
          settings = {};
        }

        const hookTypes = ["SessionStart", "PostToolUse", "Stop"] as const;

        for (const hookType of hookTypes) {
          if (settings.hooks?.[hookType]) {
            const originalLength = (settings.hooks[hookType] as Array<unknown>)
              .length;

            (settings.hooks[hookType] as Array<unknown>) = (
              settings.hooks[hookType] as Array<unknown>
            ).filter((hookGroup: any) => {
              if (!(hookGroup.hooks && Array.isArray(hookGroup.hooks))) {
                return true;
              }

              const hasOurHook = hookGroup.hooks.some((hookConfig: any) => {
                if (hookConfig.type !== "command" || !hookConfig.command) {
                  return false;
                }

                const cmd = hookConfig.command;
                return (
                  cmd === hookScriptPath ||
                  cmd.includes("auto-rotate.sh") ||
                  cmd.includes("auto hook") ||
                  cmd === "cohe auto hook --silent" ||
                  cmd.includes("hooks post-tool") ||
                  cmd.includes("hooks stop")
                );
              });

              return !hasOurHook;
            });

            if (
              (settings.hooks[hookType] as Array<unknown>).length !==
              originalLength
            ) {
              hooksRemoved +=
                originalLength -
                (settings.hooks[hookType] as Array<unknown>).length;
              settingsModified = true;

              // Clean up empty arrays
              if ((settings.hooks[hookType] as Array<unknown>).length === 0) {
                delete settings.hooks[hookType];
              }
            }
          }
        }

        // Clean up empty hooks object
        if (settings.hooks && Object.keys(settings.hooks).length === 0) {
          settings.hooks = undefined;
        }

        if (settingsModified) {
          fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
        }
      }

      if (!(hookRemoved || settingsModified)) {
        await this.renderApp(
          <Section title="Hooks Uninstall">
            <Box flexDirection="column">
              <Info>No cohe hooks found.</Info>
              <Box marginTop={1}>
                <Text dimmed>
                  Hooks may have already been removed or were never installed.
                </Text>
              </Box>
            </Box>
          </Section>
        );
        return;
      }

      await this.renderApp(
        <Section title="Hooks Uninstall">
          <Box flexDirection="column">
            <Success>Removed {hooksRemoved} hook(s).</Success>
            {hookRemoved && (
              <Box marginTop={1}>
                <Text dimmed>Removed legacy hook script</Text>
              </Box>
            )}
            {settingsModified && (
              <Box marginTop={1}>
                <Text dimmed>Updated Claude settings: {settingsFilePath}</Text>
              </Box>
            )}
            <Box flexDirection="column" marginTop={1}>
              <Info>
                Auto-rotation, formatting, and notifications are no longer
                automatic.
              </Info>
              <Info>To re-enable hooks, run "cohe hooks setup".</Info>
            </Box>
          </Box>
        </Section>
      );
    } catch (error: any) {
      await this.renderApp(
        <Section title="Hooks Uninstall">
          <Box flexDirection="column">
            <ErrorBadge>Failed to uninstall hooks</ErrorBadge>
            <Box marginTop={1}>
              <Text color="red">{error.message}</Text>
            </Box>
          </Box>
        </Section>
      );
    }
  }
}
