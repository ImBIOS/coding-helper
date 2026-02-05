import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Box, Text } from "ink";
import { BaseCommand } from "../../oclif/base.tsx";
import { Error as ErrorBadge, Info, Section, Success } from "../../ui/index.js";

export default class HooksUninstall extends BaseCommand<typeof HooksUninstall> {
  static description = "Remove Claude Code hooks";
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

      // Remove hook script if it exists
      if (fs.existsSync(hookScriptPath)) {
        fs.unlinkSync(hookScriptPath);
        hookRemoved = true;
      }

      // Update settings.json to remove hook configuration
      if (fs.existsSync(settingsFilePath)) {
        const content = fs.readFileSync(settingsFilePath, "utf-8");
        let settings: Record<string, unknown>;

        try {
          settings = JSON.parse(content);
        } catch {
          settings = {};
        }

        if (settings.hooks?.SessionStart) {
          const originalLength = (settings.hooks.SessionStart as unknown[])
            .length;

          // Filter out our auto-rotate hook
          // biome-ignore lint/suspicious/noExplicitAny: Settings object structure is dynamic from Claude settings.json
          settings.hooks.SessionStart = (
            settings.hooks.SessionStart as unknown[]
          ).filter((hookConfig) => {
            if (hookConfig.type !== "command") {
              return true;
            }
            if (!hookConfig.command) {
              return true;
            }

            // Remove if it's our auto-rotate hook (either old bash script or new cohe command)
            return !(
              hookConfig.command === hookScriptPath ||
              hookConfig.command.includes("auto-rotate.sh") ||
              hookConfig.command.includes("auto hook") ||
              hookConfig.command === "cohe auto hook --silent"
            );
          });

          if (
            (settings.hooks.SessionStart as unknown[]).length !== originalLength
          ) {
            settingsModified = true;

            // Clean up empty SessionStart array
            if ((settings.hooks.SessionStart as unknown[]).length === 0) {
              settings.hooks.SessionStart = undefined;

              // Clean up empty hooks object
              if (Object.keys(settings.hooks).length === 0) {
                settings.hooks = undefined;
              }
            }

            // Write updated settings
            fs.writeFileSync(
              settingsFilePath,
              JSON.stringify(settings, null, 2)
            );
          }
        }
      }

      if (!(hookRemoved || settingsModified)) {
        await this.renderApp(
          <Section title="Hooks Uninstall">
            <Box flexDirection="column">
              <Info>No auto-rotate hooks found.</Info>
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
            <Success>Auto-rotate hooks removed successfully!</Success>
            {hookRemoved && (
              <Box marginTop={1}>
                <Text dimmed>Removed hook script</Text>
              </Box>
            )}
            {settingsModified && (
              <Box marginTop={1}>
                <Text dimmed>Updated Claude settings: {settingsFilePath}</Text>
              </Box>
            )}
            <Box flexDirection="column" marginTop={1}>
              <Info>
                Auto-rotation is no longer automatic. You can still manually
                rotate with "cohe auto rotate".
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
