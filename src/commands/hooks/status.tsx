import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Box, Text } from "ink";
import { BaseCommand } from "../../oclif/base.js";
import {
  Error as ErrorBadge,
  Section,
  Success,
  Warning,
} from "../../ui/index.js";

interface HookCheckResult {
  name: string;
  command: string;
  registered: boolean;
  hookType: string;
}

export default class HooksStatus extends BaseCommand<typeof HooksStatus> {
  static description = "Check Claude Code hooks installation status";
  static examples = ["<%= config.bin %> hooks status"];

  async run(): Promise<void> {
    const settingsFilePath = path.join(
      os.homedir(),
      ".claude",
      "settings.json"
    );
    const hooksDir = path.join(os.homedir(), ".claude", "hooks");
    const hookScriptPath = path.join(hooksDir, "auto-rotate.sh");

    const scriptExists = fs.existsSync(hookScriptPath);
    const scriptExecutable =
      scriptExists && (fs.statSync(hookScriptPath).mode & 0o755) !== 0;

    const hooks: HookCheckResult[] = [
      {
        name: "SessionStart",
        command: "cohe auto hook --silent",
        registered: false,
        hookType: "auto-rotate",
      },
      {
        name: "PostToolUse",
        command: "cohe hooks post-tool --silent",
        registered: false,
        hookType: "format",
      },
      {
        name: "Stop",
        command: "cohe hooks stop --silent",
        registered: false,
        hookType: "notify",
      },
    ];

    let settingsFound = false;
    let rotationEnabled = false;
    let rotationStrategy = "unknown";

    if (fs.existsSync(settingsFilePath)) {
      try {
        const content = fs.readFileSync(settingsFilePath, "utf-8");
        const settings = JSON.parse(content);
        settingsFound = true;

        for (const hook of hooks) {
          if (settings.hooks?.[hook.name]) {
            const hookArray = settings.hooks[hook.name] as Array<unknown>;
            for (const hookGroup of hookArray) {
              if (hookGroup.hooks && Array.isArray(hookGroup.hooks)) {
                for (const hookConfig of hookGroup.hooks) {
                  if (hookConfig.type === "command" && hookConfig.command) {
                    const cmd = hookConfig.command;
                    // Check if command matches our hook
                    const subcommand = hook.command.split(" ")[1]; // "auto", "hooks post-tool", "hooks stop"
                    if (
                      cmd.includes(subcommand) ||
                      cmd.includes(hook.hookType)
                    ) {
                      hook.registered = true;
                      break;
                    }
                  }
                }
              }
              if (hook.registered) break;
            }
          }
        }
      } catch {
        // Invalid JSON
      }
    }

    // Check rotation config
    const configPath = path.join(os.homedir(), ".claude", "imbios.json");
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(configContent);
        rotationEnabled = config.rotation?.enabled ?? false;
        rotationStrategy = config.rotation?.strategy ?? "unknown";
      } catch {
        // Invalid JSON
      }
    }

    const allHooksInstalled = hooks.every((h) => h.registered);
    const someHooksInstalled = hooks.some((h) => h.registered);

    await this.renderApp(
      <Section title="Hooks Status">
        <Box flexDirection="column">
          {/* Overall Status */}
          <Box>
            <Text bold>Overall Status: </Text>
            {allHooksInstalled ? (
              <Success inline>All Installed</Success>
            ) : someHooksInstalled ? (
              <Warning inline>Partial</Warning>
            ) : (
              <ErrorBadge inline>Not Installed</ErrorBadge>
            )}
          </Box>

          {/* Installed Hooks */}
          <Box marginTop={1}>
            <Text bold>Installed Hooks:</Text>
          </Box>
          {hooks.map((hook) => (
            <Box key={hook.name} marginLeft={2}>
              {hook.registered ? (
                <Success inline>{hook.name}</Success>
              ) : (
                <ErrorBadge inline>{hook.name}</ErrorBadge>
              )}
              <Text dimmed> ({hook.hookType})</Text>
            </Box>
          ))}

          {/* Legacy Hook Script */}
          <Box marginTop={1}>
            <Text bold>Legacy Hook Script: </Text>
            {scriptExists ? (
              <Success inline>
                {scriptExecutable ? "Found" : "Not Executable"}
              </Success>
            ) : (
              <Text dimmed inline>
                Not Found (using CLI command)
              </Text>
            )}
          </Box>
          {scriptExists && (
            <Box marginLeft={2}>
              <Text dimmed>{hookScriptPath}</Text>
            </Box>
          )}

          {/* Settings Registration */}
          <Box marginTop={1}>
            <Text bold>Registered in Settings: </Text>
            {settingsFound ? (
              <Success inline>Yes</Success>
            ) : (
              <ErrorBadge inline>No</ErrorBadge>
            )}
          </Box>
          {settingsFound && !someHooksInstalled && (
            <Box marginLeft={2}>
              <Text dimmed>{settingsFilePath}</Text>
            </Box>
          )}

          {/* Rotation Configuration */}
          <Box marginTop={1}>
            <Text bold>Rotation Enabled: </Text>
            {rotationEnabled ? (
              <Success inline>Yes</Success>
            ) : (
              <Text color="yellow" inline>
                No
              </Text>
            )}
          </Box>

          <Box marginTop={1}>
            <Text bold>Rotation Strategy: </Text>
            <Text color="cyan" inline>
              {rotationStrategy}
            </Text>
          </Box>

          {/* Actions */}
          <Box flexDirection="column" marginTop={2}>
            {!allHooksInstalled && (
              <Warning>
                Run "cohe hooks setup" to install missing hooks.
              </Warning>
            )}

            {allHooksInstalled && !rotationEnabled && (
              <Warning>
                Hooks installed but rotation is disabled. Enable it with "cohe
                auto enable".
              </Warning>
            )}

            {allHooksInstalled && rotationEnabled && (
              <Success>
                All hooks are installed and rotation is enabled!
              </Success>
            )}
          </Box>
        </Box>
      </Section>
    );
  }
}
