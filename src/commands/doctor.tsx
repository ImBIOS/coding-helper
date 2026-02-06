import * as fs from "node:fs";
import { existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Spinner } from "@inkjs/ui";
import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";
import * as settings from "../config/settings.js";
import { BaseCommand } from "../oclif/base.tsx";
import type { Provider } from "../providers/base.js";
import { minimaxProvider } from "../providers/minimax.js";
import { zaiProvider } from "../providers/zai.js";
import {
  Error as ErrorBadge,
  Info,
  Section,
  Success,
  Warning,
} from "../ui/index.js";

const PROVIDERS: Record<string, () => Provider> = {
  zai: () => zaiProvider,
  minimax: () => minimaxProvider,
};

interface HookCheckResult {
  name: string;
  description: string;
  installed: boolean;
}

function checkHooksInstalled(): HookCheckResult[] {
  const settingsFilePath = path.join(os.homedir(), ".claude", "settings.json");
  const results: HookCheckResult[] = [
    {
      name: "SessionStart",
      description: "Auto-rotate on startup",
      installed: false,
    },
    {
      name: "PostToolUse",
      description: "Format files after Write|Edit",
      installed: false,
    },
    {
      name: "Stop",
      description: "Notifications on session end",
      installed: false,
    },
  ];

  if (!existsSync(settingsFilePath)) {
    return results;
  }

  try {
    const content = fs.readFileSync(settingsFilePath, "utf-8");
    const settingsData = JSON.parse(content);

    for (const result of results) {
      if (settingsData.hooks?.[result.name]) {
        const hooks = settingsData.hooks[result.name] as Array<unknown>;
        result.installed = hooks.some((hookGroup: any) => {
          if (hookGroup.hooks && Array.isArray(hookGroup.hooks)) {
            return hookGroup.hooks.some((hookConfig: any) => {
              return (
                hookConfig.type === "command" &&
                hookConfig.command?.includes("cohe")
              );
            });
          }
          return false;
        });
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  return results;
}

export default class Doctor extends BaseCommand<typeof Doctor> {
  static description = "Diagnose configuration issues";
  static examples = ["<%= config.bin %> doctor"];

  async run(): Promise<void> {
    const activeProvider = settings.getActiveProvider();
    const provider = PROVIDERS[activeProvider]();
    const config = provider.getConfig();
    const configPath = settings.getConfigPath();
    const hooksStatus = checkHooksInstalled();

    await this.renderApp(
      <DoctorUI
        config={config}
        configPath={configPath}
        hooksStatus={hooksStatus}
        provider={provider}
      />
    );
  }
}

interface DoctorUIProps {
  provider: Provider;
  config: ReturnType<Provider["getConfig"]>;
  configPath: string;
  hooksStatus: HookCheckResult[];
}

interface CheckResult {
  name: string;
  passed: boolean;
  issue?: string;
}

function DoctorUI({
  provider,
  config,
  configPath,
  hooksStatus,
}: DoctorUIProps): React.ReactElement {
  const { exit } = useApp();
  const [running, setRunning] = useState(true);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: CheckResult[] = [];
      const foundIssues: string[] = [];

      // Check config file
      const configExists = existsSync(configPath);
      results.push({ name: "Config file exists", passed: configExists });

      // Check API key
      const hasApiKey = Boolean(config.apiKey);
      results.push({ name: "API key configured", passed: hasApiKey });

      // Check connection
      if (hasApiKey) {
        const connected = await provider.testConnection();
        results.push({ name: "API connection", passed: connected });
        if (!connected) {
          foundIssues.push("API connection failed. Check your API key.");
        }
      }

      // Check models
      const hasModels = provider.getModels().length > 0;
      results.push({ name: "Models available", passed: hasModels });

      setChecks(results);
      setIssues(foundIssues);
      setRunning(false);

      // Exit after showing results
      setTimeout(() => exit(), 1000);
    };
    runDiagnostics();
  }, [provider, config, configPath, exit]);

  const hooksInstalledCount = hooksStatus.filter((h) => h.installed).length;
  const allHooksInstalled = hooksInstalledCount === hooksStatus.length;

  return (
    <Section title="Diagnostics">
      <Box flexDirection="column">
        {running ? (
          <Spinner label="Running diagnostics..." />
        ) : (
          <>
            {checks.map((check) => (
              <Box key={check.name}>
                {check.passed ? (
                  <Success>{check.name}</Success>
                ) : (
                  <ErrorBadge>{check.name}</ErrorBadge>
                )}
              </Box>
            ))}

            <Box marginTop={1}>
              <Text bold>Claude Code Hooks:</Text>
            </Box>
            {hooksStatus.map((hook) => (
              <Box key={hook.name} marginLeft={2}>
                {hook.installed ? (
                  <Success>
                    {hook.name}: {hook.description}
                  </Success>
                ) : (
                  <Warning>
                    {hook.name}: {hook.description} (not installed)
                  </Warning>
                )}
              </Box>
            ))}
            {!allHooksInstalled && (
              <Box marginTop={1}>
                <Info>Run "cohe hooks setup" to install missing hooks.</Info>
              </Box>
            )}

            {issues.length > 0 ? (
              <Box flexDirection="column" marginTop={1}>
                <Warning>Issues found:</Warning>
                {issues.map((issue) => (
                  <Box key={issue} paddingLeft={2}>
                    <Info>- {issue}</Info>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box marginTop={1}>
                <Success>All checks passed!</Success>
              </Box>
            )}
          </>
        )}
      </Box>
    </Section>
  );
}
