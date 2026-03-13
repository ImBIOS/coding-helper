import { Flags } from "@oclif/core";
import { Box } from "ink";
import type React from "react";
import * as accountsConfig from "../config/accounts-config";
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
    "<%= config.bin %> usage --all",
  ];

  static flags = {
    verbose: Flags.boolean({
      description: "Show detailed usage information",
      default: false,
    }),
    all: Flags.boolean({
      description: "Show usage for all accounts",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Usage);

    // Use v2 accounts config
    const accounts = accountsConfig.listAccounts();

    if (flags.all) {
      // Fetch usage for all accounts
      const accountsWithUsage = await Promise.all(
        accounts.map(async (account) => {
          const provider = PROVIDERS[account.provider]();
          const usage = await provider.getUsage({
            apiKey: account.apiKey,
            groupId: account.groupId,
          });
          return { account, provider: provider.displayName, usage };
        })
      );

      await this.renderApp(
        <Box flexDirection="column">
          <Section title="Usage for All Accounts">
            {accountsWithUsage.map(
              ({ account, provider: prov, usage: usg }) =>
                usg && (
                  <AccountUsageItem
                    key={account.id}
                    name={account.name}
                    provider={prov}
                    usage={usg}
                  />
                )
            )}
          </Section>
        </Box>
      );
      return;
    }

    // Show usage for active account only
    const activeAccount = accountsConfig.getActiveAccount();

    if (!activeAccount) {
      await this.renderApp(
        <Warning>
          No active account configured. Run "cohe config" first.
        </Warning>
      );
      return;
    }

    const provider = PROVIDERS[activeAccount.provider]();

    // Get usage for the active account
    const usage = await provider.getUsage({
      apiKey: activeAccount.apiKey,
      groupId: activeAccount.groupId,
    });

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

interface AccountUsageItemProps {
  name: string;
  provider: string;
  usage: UsageStats;
}

function AccountUsageItem({
  name,
  provider: prov,
  usage,
}: AccountUsageItemProps): React.ReactElement {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Info>{name}</Info>
        <Info> ({prov})</Info>
      </Box>
      <Box>
        <Info>
          {formatBytes(usage.used)} / {formatBytes(usage.limit)} (
          {usage.percentUsed.toFixed(1)}%)
        </Info>
      </Box>
    </Box>
  );
}
