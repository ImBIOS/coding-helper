import { Flags } from "@oclif/core";
import { Box } from "ink";
import type React from "react";
// biome-ignore lint/performance/noNamespaceImport: Consistent with codebase pattern
import * as settings from "../config/settings";
import { BaseCommand } from "../oclif/base";
import type { Provider, UsageStats } from "../providers/base";
import { minimaxProvider } from "../providers/minimax";
import { zaiProvider } from "../providers/zai";
import { Info, Section, Table, Warning } from "../ui/index";

const PROVIDERS: Record<string, () => Provider> = {
  zai: () => zaiProvider,
  minimax: () => minimaxProvider,
};

export default class Usage extends BaseCommand<typeof Usage> {
  static description = "Query quota and usage statistics";
  static examples = [
    "<%= config.bin %> usage",
    "<%= config.bin %> usage --verbose",
  ];

  static flags = {
    verbose: Flags.boolean({
      description: "Show detailed usage information",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Usage);
    const activeProvider = settings.getActiveProvider();
    const provider = PROVIDERS[activeProvider]();
    const config = provider.getConfig();

    if (!config.apiKey) {
      await this.renderApp(
        <Warning>
          {provider.displayName} is not configured. Run "cohe config" first.
        </Warning>
      );
      return;
    }

    const usage = await provider.getUsage();
    const verbose = flags.verbose;

    await this.renderApp(
      <UsageUI
        provider={provider.displayName}
        usage={usage}
        verbose={verbose}
      />
    );
  }
}

interface UsageUIProps {
  provider: string;
  usage: UsageStats;
  verbose: boolean;
}

function UsageUI({
  provider,
  usage,
  verbose,
}: UsageUIProps): React.ReactElement {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {
      return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const data: Record<string, string> = {
    Provider: provider,
    Used: formatBytes(usage.used),
    Limit: formatBytes(usage.limit),
    Remaining: formatBytes(usage.remaining),
    "Percent Used": `${usage.percentUsed.toFixed(1)}%`,
  };

  if (verbose) {
    if (usage.modelUsage) {
      data["Model Usage"] = formatBytes(usage.modelUsage.used);
    }
    if (usage.mcpUsage) {
      data["MCP Usage"] = formatBytes(usage.mcpUsage.used);
    }
  }

  return (
    <Section title="Usage Statistics">
      <Table data={data} />
      <Box marginTop={1}>
        <Info>
          {usage.percentUsed > 80
            ? "Warning: Usage is above 80%"
            : "Usage is within safe limits"}
        </Info>
      </Box>
    </Section>
  );
}
