import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConfirmInput, MultiSelect, PasswordInput, TextInput } from "@inkjs/ui";
import { Box, Text, useApp } from "ink";
import { useState } from "react";
import * as accountsConfig from "../config/accounts-config.js";
import { loadConfigV2 } from "../config/accounts-config.js";
import * as settings from "../config/settings.js";
import { BaseCommand } from "../oclif/base";
import { Info, Section, Success, Warning } from "../ui/index.js";
import { getContainerEnvVars } from "../utils/container.js";

const PROVIDERS = [
  { label: "Z.AI (GLM)", value: "zai" },
  { label: "MiniMax", value: "minimax" },
];

export default class FirstRun extends BaseCommand<typeof FirstRun> {
  static description = "First-time setup wizard for cohe";
  static examples = ["<%= config.bin %> first-run"];

  async run(): Promise<void> {
    await this.renderApp(<FirstRunUI />);
  }
}

type Step =
  | "welcome"
  | "select-providers"
  | "configure-provider"
  | "enter-api-key"
  | "enter-base-url"
  | "confirm-hooks"
  | "setup-hooks"
  | "done";

interface ProviderSetup {
  provider: string;
  apiKey: string;
  baseUrl: string;
}

function FirstRunUI(): React.ReactElement {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("welcome");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [currentProviderIndex, setCurrentProviderIndex] = useState(0);
  const [currentSetup, setCurrentSetup] = useState<Partial<ProviderSetup>>({});
  const [completedProviders, setCompletedProviders] = useState<string[]>([]);
  const [hooksInstalled, setHooksInstalled] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ type: "info" | "success" | "warning"; text: string }>
  >([]);

  const currentProvider = selectedProviders[currentProviderIndex];

  const addMessage = (type: "info" | "success" | "warning", text: string) => {
    setMessages((prev) => [...prev, { type, text }]);
  };

  const handleWelcomeConfirm = () => {
    setStep("select-providers");
  };

  const handleProvidersSelected = (providers: string[]) => {
    if (providers.length === 0) {
      addMessage("warning", "No providers selected.");
      return;
    }
    setSelectedProviders(providers);
    setCurrentProviderIndex(0);
    setCurrentSetup({});
    setStep("enter-api-key");
    addMessage("info", `Configuring ${providers[0].toUpperCase()}...`);
  };

  const handleApiKeySubmit = (apiKey: string) => {
    if (!apiKey) {
      addMessage(
        "warning",
        `Skipping ${currentProvider.toUpperCase()} - no API key provided.`
      );
      moveToNextProvider();
      return;
    }
    setCurrentSetup({ provider: currentProvider, apiKey });
    setStep("enter-base-url");
  };

  const handleBaseUrlSubmit = (baseUrl: string) => {
    const finalConfig = {
      ...currentSetup,
      baseUrl: baseUrl || getDefaultBaseUrl(currentProvider),
    };

    // Save to legacy config
    settings.setProviderConfig(
      currentProvider as "zai" | "minimax",
      finalConfig.apiKey!,
      finalConfig.baseUrl,
      ""
    );

    // Save to V2 config
    const providerConfig = getProviderConfig(currentProvider);
    accountsConfig.addAccount(
      currentProvider,
      currentProvider as "zai" | "minimax",
      finalConfig.apiKey!,
      finalConfig.baseUrl,
      providerConfig.defaultModel
    );

    addMessage(
      "success",
      `${currentProvider.toUpperCase()} configured successfully!`
    );
    setCompletedProviders((prev) => [...prev, currentProvider]);
    moveToNextProvider();
  };

  const moveToNextProvider = () => {
    const nextIndex = currentProviderIndex + 1;
    if (nextIndex < selectedProviders.length) {
      setCurrentProviderIndex(nextIndex);
      setCurrentSetup({});
      addMessage(
        "info",
        `Configuring ${selectedProviders[nextIndex].toUpperCase()}...`
      );
      setStep("enter-api-key");
    } else {
      setStep("confirm-hooks");
    }
  };

  const handleConfirmHooks = (confirm: boolean) => {
    if (confirm) {
      setStep("setup-hooks");
      installHooks();
    } else {
      setStep("done");
      setTimeout(() => exit(), 500);
    }
  };

  const installHooks = async () => {
    try {
      const claudeSettingsPath = path.join(os.homedir(), ".claude");
      const settingsFilePath = path.join(claudeSettingsPath, "settings.json");
      const notifyScriptPath = path.join(claudeSettingsPath, "cohe-notify.sh");
      const hookCommand = "cohe auto hook --silent";

      // Notification script content
      const notifyScriptContent = `#!/bin/bash
# cohe-notify.sh - Dynamic notification script for Claude Code

set -euo pipefail

HOOK_INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('transcript_path', ''))" 2>/dev/null || echo "")

MESSAGE="Task completed"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    EXTRACTED=$(python3 -c "
import sys
import json

transcript_path = '$TRANSCRIPT_PATH'
message = 'Task completed'

try:
    with open(transcript_path, 'r') as f:
        for line in reversed(f.readlines()):
            try:
                entry = json.loads(line)
                if entry.get('role') == 'user':
                    content = entry.get('content', '')
                    if isinstance(content, list):
                        message = ' '.join(b.get('text', '') for b in content if b.get('type') == 'text')
                    else:
                        message = str(content)
                    break
            except:
                continue
except:
    pass

if len(message) > 100:
    message = message[:97] + '...'
print(message)
" 2>/dev/null || echo "Task completed")

    if [ -n "$EXTRACTED" ]; then
        MESSAGE="$EXTRACTED"
    fi
fi

command -v notify-send &>/dev/null && notify-send "Claude Code" "$MESSAGE" -i dialog-information 2>/dev/null
command -v osascript &>/dev/null && osascript -e "display notification \\"$MESSAGE\\" with title \\"Claude Code\\"" 2>/dev/null
command -v paplay &>/dev/null && paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null
exit 0
`;

      // Read or create settings
      let settingsData: any = {};
      if (fs.existsSync(settingsFilePath)) {
        try {
          const content = fs.readFileSync(settingsFilePath, "utf-8");
          settingsData = JSON.parse(content);
        } catch {
          settingsData = {};
        }
      }

      // Create notification script
      if (!fs.existsSync(notifyScriptPath)) {
        fs.writeFileSync(notifyScriptPath, notifyScriptContent);
        fs.chmodSync(notifyScriptPath, 0o755);
      }

      // Initialize hooks
      if (!settingsData.hooks) {
        settingsData.hooks = {};
      }

      // Add SessionStart hook
      if (!settingsData.hooks.SessionStart) {
        settingsData.hooks.SessionStart = [];
      }

      const sessionStartExists = settingsData.hooks.SessionStart.some(
        (h: any) =>
          h.type === "command" &&
          h.command &&
          (h.command === hookCommand || h.command.includes("auto hook"))
      );

      if (!sessionStartExists) {
        settingsData.hooks.SessionStart.push({
          matcher: "startup|resume|clear|compact",
          hooks: [{ type: "command", command: hookCommand }],
        });
      }

      // Add Stop hook
      if (!settingsData.hooks.Stop) {
        settingsData.hooks.Stop = [];
      }

      const stopHookCommand = `"${notifyScriptPath}"`;
      const stopExists = (settingsData.hooks.Stop || []).some(
        (h: any) =>
          h.hooks &&
          h.hooks.some(
            (hook: any) =>
              hook.type === "command" && hook.command?.includes("cohe-notify")
          )
      );

      if (!stopExists) {
        settingsData.hooks.Stop.push({
          hooks: [{ type: "command", command: stopHookCommand }],
        });
      }

      // Set environment variables
      if (!settingsData.env) {
        settingsData.env = {};
      }
      Object.assign(settingsData.env, {
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        DISABLE_NON_ESSENTIAL_MODEL_CALLS: "1",
        ENABLE_BACKGROUND_TASKS: "1",
        FORCE_AUTO_BACKGROUND_TASKS: "1",
        CLAUDE_CODE_ENABLE_UNIFIED_READ_TOOL: "1",
        MAX_THINKING_TOKENS: "50000",
        DISABLE_TELEMETRY: "1",
        DISABLE_ERROR_REPORTING: "1",
      });

      const containerEnvVars = getContainerEnvVars();
      Object.assign(settingsData.env, containerEnvVars);

      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsData, null, 2));
      setHooksInstalled(true);
      addMessage("success", "Hooks installed successfully!");
    } catch (error: any) {
      addMessage("warning", `Failed to install hooks: ${error.message}`);
    }

    setStep("done");
    setTimeout(() => exit(), 500);
  };

  const config = loadConfigV2();

  return (
    <Section title="cohe First-Run Setup">
      <Box flexDirection="column">
        {/* Messages */}
        {messages.map((msg, i) => (
          <Box key={`${msg.text}-${i}`}>
            {msg.type === "info" && <Info>{msg.text}</Info>}
            {msg.type === "success" && <Success>{msg.text}</Success>}
            {msg.type === "warning" && <Warning>{msg.text}</Warning>}
          </Box>
        ))}

        {/* Welcome Step */}
        {step === "welcome" && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Welcome to cohe! Let's get you set up.</Text>
            <Box marginTop={1}>
              <Text color="gray">
                This wizard will help you configure your API providers and set
                up Claude Code hooks.
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>Continue? </Text>
              <ConfirmInput
                defaultChoice="confirm"
                onCancel={() => {
                  addMessage("info", "Setup cancelled.");
                  setTimeout(() => exit(), 500);
                }}
                onConfirm={handleWelcomeConfirm}
              />
            </Box>
          </Box>
        )}

        {/* Select Providers */}
        {step === "select-providers" && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Select API providers to configure:</Text>
            <Box paddingLeft={2}>
              <MultiSelect
                onSubmit={handleProvidersSelected}
                options={PROVIDERS}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                You can configure multiple providers and use auto-rotation.
              </Text>
            </Box>
          </Box>
        )}

        {/* Enter API Key */}
        {step === "enter-api-key" && (
          <Box marginTop={1}>
            <Text>Enter API Key for {currentProvider}: </Text>
            <PasswordInput
              onSubmit={handleApiKeySubmit}
              placeholder="Enter API key..."
            />
          </Box>
        )}

        {/* Enter Base URL */}
        {step === "enter-base-url" && (
          <Box marginTop={1}>
            <Text>Base URL: </Text>
            <TextInput
              defaultValue={getDefaultBaseUrl(currentProvider)}
              onSubmit={handleBaseUrlSubmit}
            />
          </Box>
        )}

        {/* Confirm Hooks */}
        {step === "confirm-hooks" && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Configure Claude Code hooks?</Text>
            <Box marginTop={1}>
              <Info>This will enable:</Info>
            </Box>
            <Box marginLeft={2}>
              <Text>• Auto-rotation of API keys on session start</Text>
            </Box>
            <Box marginLeft={2}>
              <Text>• Notifications with task details when sessions end</Text>
            </Box>
            <Box marginTop={1}>
              <Text>Install hooks? </Text>
              <ConfirmInput
                defaultChoice="confirm"
                onCancel={() => {
                  addMessage("info", "Skipped hooks installation.");
                  setStep("done");
                  setTimeout(() => exit(), 500);
                }}
                onConfirm={() => handleConfirmHooks(true)}
              />
            </Box>
          </Box>
        )}

        {/* Setup Hooks */}
        {step === "setup-hooks" && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Installing hooks...</Text>
          </Box>
        )}

        {/* Done */}
        {step === "done" && (
          <Box flexDirection="column" marginTop={1}>
            <Success>Setup complete!</Success>
            <Box marginTop={1}>
              <Text bold>What was configured:</Text>
            </Box>
            <Box marginLeft={2}>
              <Text>
                • Providers:{" "}
                {completedProviders.map((p) => p.toUpperCase()).join(", ") ||
                  "None"}
              </Text>
            </Box>
            <Box marginLeft={2}>
              <Text>• Hooks: {hooksInstalled ? "Installed" : "Skipped"}</Text>
            </Box>
            {completedProviders.length > 0 && (
              <>
                <Box marginTop={1}>
                  <Text bold>Next steps:</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text>• Run "cohe status" to check configuration</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text>• Run "cohe auto enable" to enable rotation</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text>• Run "cohe hooks status" to verify hooks</Text>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </Section>
  );
}

function getDefaultBaseUrl(provider: string): string {
  const configs: Record<string, string> = {
    zai: "https://openapi.zhi.ai",
    minimax: "https://api.minimax.chat/v1",
  };
  return configs[provider] || "";
}

function getProviderConfig(provider: string): {
  defaultModel: string;
} {
  const configs: Record<string, { defaultModel: string }> = {
    zai: { defaultModel: "glm-4.7" },
    minimax: { defaultModel: "MiniMax-M2.1" },
  };
  return configs[provider] || { defaultModel: "MiniMax-M2.1" };
}
