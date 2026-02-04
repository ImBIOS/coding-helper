import * as accountsConfig from "../config/accounts-config";
import * as mcp from "../config/mcp";
import * as profiles from "../config/profiles";
import * as settings from "../config/settings";
import type { Provider } from "../providers/base";
import { minimaxProvider } from "../providers/minimax";
import { zaiProvider } from "../providers/zai";
import { getShellCompletion } from "../utils/completion";
import { error, info, section, success, table, warning } from "../utils/logger";
import {
  checkbox,
  confirm,
  input,
  modelSelection,
  password,
  providerSelection,
  select,
} from "../utils/prompts";

const PROVIDERS: Record<string, () => Provider> = {
  zai: () => zaiProvider,
  minimax: () => minimaxProvider,
};

export async function handleConfig(): Promise<void> {
  section("ImBIOS Configuration");

  const providers = await checkbox("Select API providers:", ["zai", "minimax"]);

  for (const provider of providers) {
    const existingConfig = settings.getProviderConfig(provider);

    // Check if provider is already configured
    if (existingConfig.apiKey) {
      const reconfigure = await confirm(
        `${provider.toUpperCase()} is already configured. Reconfigure?`,
        false
      );
      if (!reconfigure) {
        info(`Skipping ${provider.toUpperCase()} - already configured.`);
        continue;
      }
    }

    info(`\nConfiguring ${provider.toUpperCase()} provider...`);

    const apiKey = await password(`Enter API Key for ${provider}:`);
    const baseUrl = await input(
      "Base URL:",
      existingConfig.baseUrl || PROVIDERS[provider]().getConfig().baseUrl
    );

    if (!apiKey) {
      warning(`Skipping ${provider.toUpperCase()} - no API key provided.`);
      continue;
    }

    settings.setProviderConfig(provider, apiKey, baseUrl, "");
    success(`${provider.toUpperCase()} configuration saved!`);
  }
}

export async function handleSwitch(args: string[]): Promise<void> {
  const targetProvider = args[0] as "zai" | "minimax" | undefined;

  if (!(targetProvider && ["zai", "minimax"].includes(targetProvider))) {
    error("Usage: cohe switch <zai|minimax>");
    return;
  }

  const provider = PROVIDERS[targetProvider]();
  const config = provider.getConfig();

  if (!config.apiKey) {
    warning(
      `${provider.displayName} is not configured. Run "cohe config" first.`
    );
    return;
  }

  settings.setActiveProvider(targetProvider);
  success(`Switched to ${provider.displayName}`);
  info(`Default model: ${config.defaultModel}`);
}

export async function handleStatus(): Promise<void> {
  section("ImBIOS Status");

  const activeProvider = settings.getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();

  const hasApiKey = Boolean(config.apiKey);

  table({
    "Active Provider": provider.displayName,
    "API Key": hasApiKey
      ? `••••••••${config.apiKey.slice(-4)}`
      : "Not configured",
    "Base URL": config.baseUrl,
    "Default Model": config.defaultModel,
    Connection: hasApiKey ? "Ready" : "Not configured",
  });

  // Also show other provider status
  const otherProviderKey = activeProvider === "zai" ? "minimax" : "zai";
  const otherProvider = PROVIDERS[otherProviderKey]();
  const otherConfig = otherProvider.getConfig();
  const otherHasKey = Boolean(otherConfig.apiKey);

  info("");
  info(
    `${otherProvider.displayName}: ${
      otherHasKey ? "Configured" : "Not configured"
    }`
  );

  // Show active profile if using profiles
  const activeProfile = profiles.getActiveProfile();
  if (activeProfile) {
    info("");
    info(`Active Profile: ${activeProfile.name}`);
  }

  // Show v2 accounts if using
  const v2Config = accountsConfig.loadConfigV2();
  const activeAccount = accountsConfig.getActiveAccount();
  if (activeAccount) {
    info("");
    info(`Active Account: ${activeAccount.name} (${activeAccount.provider})`);
    info(
      `Rotation: ${
        v2Config.rotation.enabled ? v2Config.rotation.strategy : "disabled"
      }`
    );
  }
}

export async function handleUsage(verbose = false): Promise<void> {
  const config = accountsConfig.loadConfigV2();
  const accounts = Object.values(config.accounts).filter((a) => a.isActive);

  if (accounts.length === 0) {
    info("No active accounts found.");
    return;
  }

  console.log("");
  console.log("──────────────────────────────────────────────────");
  console.log(" Usage Statistics");
  console.log("──────────────────────────────────────────────────");
  console.log("");

  for (const account of accounts) {
    const provider = PROVIDERS[account.provider]();
    const usage = await provider.getUsage({
      apiKey: account.apiKey,
      groupId: account.groupId,
    });

    const isActive = config.activeAccountId === account.id;
    const activeMark = isActive ? " →" : "  ";
    const accountStatus = isActive ? " [Active provider]" : "";

    console.log(
      `${activeMark} ${account.name} (${account.provider})${accountStatus}`
    );

    // Warning for missing groupId on MiniMax
    if (account.provider === "minimax" && !account.groupId) {
      console.log("     ⚠️  Missing groupId - usage data may be incomplete");
    }

    if (usage.limit > 0) {
      // For ZAI, show model and MCP usage separately
      if (account.provider === "zai" && usage.modelUsage && usage.mcpUsage) {
        console.log(`     Model: ${Math.round(usage.modelUsage.percentUsed)}%`);
        console.log(`     MCP:   ${Math.round(usage.mcpUsage.percentUsed)}%`);

        // Show details in verbose mode
        if (verbose) {
          console.log("     Model:");
          console.log(`       Used:      ${Math.round(usage.modelUsage.used)}`);
          console.log(
            `       Limit:     ${Math.round(usage.modelUsage.limit)}`
          );
          console.log(
            `       Remaining: ${Math.round(usage.modelUsage.remaining)}`
          );

          console.log("     MCP:");
          console.log(`       Used:      ${Math.round(usage.mcpUsage.used)}`);
          console.log(`       Limit:     ${Math.round(usage.mcpUsage.limit)}`);
          console.log(
            `       Remaining: ${Math.round(usage.mcpUsage.remaining)}`
          );
        }
      } else {
        // For MiniMax or when no split data available
        // MiniMax shows percentRemaining (what's left), not percentUsed
        const displayPercent = usage.percentRemaining ?? usage.percentUsed;
        console.log(`     Usage: ${Math.round(displayPercent)}%`);

        // Show details in verbose mode
        if (verbose) {
          console.log(`     Used:      ${Math.round(usage.used)}`);
          console.log(`     Limit:     ${Math.round(usage.limit)}`);
          console.log(`     Remaining: ${Math.round(usage.remaining)}`);
        }
      }

      // Check alerts (for overall usage)
      if (verbose) {
        const alerts = accountsConfig.checkAlerts(usage);
        if (alerts.length > 0) {
          console.log("  Alerts triggered:");
          for (const alert of alerts) {
            console.log(`    - ${alert.type}: threshold ${alert.threshold}%`);
          }
        }
      }
    } else {
      console.log("  Unable to fetch usage data");
    }
    console.log("");
  }

  console.log("──────────────────────────────────────────────────");
}

export async function handleHistory(): Promise<void> {
  section("Usage History");

  const activeProvider = settings.getActiveProvider();
  const _provider = PROVIDERS[activeProvider]();
  const history = settings.getUsageHistory(activeProvider);

  if (history.length === 0) {
    info("No usage history available.");
    return;
  }

  console.log(
    `  ${activeProvider.toUpperCase()} Usage (Last ${history.length} days):\n`
  );

  history.forEach((record) => {
    const percent = record.limit > 0 ? (record.used / record.limit) * 100 : 0;
    const bar =
      "█".repeat(Math.ceil(percent / 5)) +
      "░".repeat(20 - Math.ceil(percent / 5));
    console.log(`  ${record.date} │ ${bar} │ ${percent.toFixed(1)}%`);
  });
}

export async function handleCost(model?: string): Promise<void> {
  section("Cost Estimation");

  const costs: Record<string, number> = {
    "GLM-4.7": 0.0001,
    "GLM-4.5-Air": 0.000_05,
    "MiniMax-M2.1": 0.000_08,
  };

  const models = Object.keys(costs);

  const selectedModel = model || (await modelSelection(models));
  const cost = costs[selectedModel];

  if (!cost) {
    warning(`Unknown model: ${selectedModel}`);
    info(`Available models: ${models.join(", ")}`);
    return;
  }

  table({
    Model: selectedModel,
    "Input (1K tokens)": `$${(cost * 1000).toFixed(6)}`,
    "Output (1K tokens)": `$${(cost * 1000 * 2).toFixed(6)}`,
  });
}

export async function handleTest(): Promise<void> {
  section("API Connection Test");

  const activeProvider = settings.getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();

  if (!config.apiKey) {
    error(
      `${provider.displayName} is not configured. Run "cohe config" first.`
    );
    return;
  }

  info(`Testing ${provider.displayName} connection...`);

  const connected = await provider.testConnection();

  if (connected) {
    success("Connection successful!");
  } else {
    error("Connection failed. Please check your API key and base URL.");
  }
}

export async function handlePlugin(action?: string): Promise<void> {
  section("Claude Code Plugin");

  const pluginDir = settings.getConfigDir();
  const pluginManifestPath = `${pluginDir}/.claude-plugin/manifest.json`;

  switch (action) {
    case "install":
      info(
        "Plugin manifest installed at: ~/.claude/.claude-plugin/manifest.json"
      );
      success("Plugin installed! Restart Claude Code to see new commands.");
      break;
    case "uninstall":
      info("Remove the plugin manifest manually to uninstall.");
      info(`Path: ${pluginManifestPath}`);
      break;
    case "update":
      success("Plugin updated to latest version.");
      break;
    default:
      info("Usage: cohe plugin <install|uninstall|update>");
      info('Run "cohe config" to configure providers first.');
      break;
  }
}

export async function handleDoctor(): Promise<void> {
  section("Diagnostics");

  const issues: string[] = [];
  const checks: [string, boolean][] = [];

  const activeProvider = settings.getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();

  // Check config file
  const configPath = settings.getConfigPath();
  checks.push([
    "Config file exists",
    require("node:fs").existsSync(configPath),
  ]);

  // Check API key
  checks.push(["API key configured", Boolean(config.apiKey)]);

  // Check connection
  if (config.apiKey) {
    const connected = await provider.testConnection();
    checks.push(["API connection", connected]);
    if (!connected) {
      issues.push("API connection failed. Check your API key.");
    }
  }

  // Check models
  checks.push(["Models available", provider.getModels().length > 0]);

  checks.forEach(([check, passed]) => {
    if (passed) {
      success(check);
    } else {
      error(check);
    }
  });

  if (issues.length > 0) {
    warning("\nIssues found:");
    issues.forEach((issue) => info(`  - ${issue}`));
  } else {
    success("\nAll checks passed!");
  }
}

export async function handleEnv(action?: string): Promise<void> {
  if (action === "export") {
    const activeProvider = settings.getActiveProvider();
    const provider = PROVIDERS[activeProvider]();
    const config = provider.getConfig();

    const envScript = `# ImBIOS Environment Variables
export ANTHROPIC_AUTH_TOKEN="${config.apiKey}"
export ANTHROPIC_BASE_URL="${config.baseUrl}"
export ANTHROPIC_MODEL="${config.defaultModel}"
export API_TIMEOUT_MS=3000000
`;

    console.log(envScript);
  } else {
    console.log('Usage: eval "$(cohe env export)"');
  }
}

export async function handleModels(providerName?: string): Promise<void> {
  section("Available Models");

  const activeProvider = settings.getActiveProvider();
  const targetProvider = providerName || activeProvider;

  if (!["zai", "minimax"].includes(targetProvider)) {
    error("Usage: cohe models [zai|minimax]");
    return;
  }

  const provider = PROVIDERS[targetProvider]();
  const mapping = provider.getModelMapping();

  console.log(`  ${provider.displayName}:`);
  console.log(`  Opus:   ${mapping.opus}`);
  console.log(`  Sonnet: ${mapping.sonnet}`);
  console.log(`  Haiku:  ${mapping.haiku}`);
  console.log(`  All:    ${provider.getModels().join(", ")}`);
}

export async function handleCompletion(shell?: string): Promise<void> {
  section("Shell Completion");

  const shells = ["bash", "zsh", "fish"];

  const selectedShell = shell || (await select("Select shell:", shells, 0));

  if (!shells.includes(selectedShell)) {
    error(
      `Unsupported shell: ${shell}. Supported shells: ${shells.join(", ")}`
    );
    return;
  }

  try {
    const completion = getShellCompletion(selectedShell);
    console.log(completion);
    info("");
    info(
      `To enable ${selectedShell} completion, add the above to your shell configuration.`
    );
    info("For bash: Add to ~/.bashrc or ~/.bash_completion");
    info("For zsh: Add to ~/.zshrc");
    info("For fish: Add to ~/.config/fish/completions/cohe.fish");
  } catch (err) {
    error(`Failed to generate completion: ${(err as Error).message}`);
  }
}

export async function handleProfile(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "list": {
      section("Configuration Profiles");
      const profileList = profiles.listProfiles();
      const activeProfile = profiles.getActiveProfile();

      if (profileList.length === 0) {
        info(
          "No profiles configured. Use 'cohe profile create' to create one."
        );
        return;
      }

      profileList.forEach((profile) => {
        const isActive = profile.name === activeProfile?.name;
        console.log(
          `  ${isActive ? "●" : "○"} ${profile.name} (${profile.provider})`
        );
      });

      info("");
      info(`Active profile: ${activeProfile?.name || "none"}`);
      break;
    }

    case "create": {
      section("Create Profile");

      const name = await input("Profile name:");
      if (!name) {
        error("Profile name is required.");
        return;
      }

      const provider = await providerSelection();
      const apiKey = await password(`API Key for ${provider}:`);
      if (!apiKey) {
        error("API key is required.");
        return;
      }

      const baseUrl = await input(
        "Base URL:",
        PROVIDERS[provider]().getConfig().baseUrl
      );
      const defaultModel = await modelSelection(
        PROVIDERS[provider]().getModels()
      );

      profiles.createProfile(name, provider, apiKey, baseUrl, defaultModel);
      success(`Profile "${name}" created successfully!`);
      break;
    }

    case "switch": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe profile switch <name>");
        return;
      }

      if (profiles.switchProfile(name)) {
        success(`Switched to profile "${name}"`);
      } else {
        error(`Profile "${name}" not found.`);
      }
      break;
    }

    case "delete": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe profile delete <name>");
        return;
      }

      if (profiles.deleteProfile(name)) {
        success(`Profile "${name}" deleted.`);
      } else {
        error(
          `Failed to delete profile "${name}". It may be active or not exist.`
        );
      }
      break;
    }

    case "export": {
      const name = args[1] || profiles.getActiveProfile()?.name;
      if (!name) {
        error("No active profile. Specify a profile name.");
        return;
      }

      const exportStr = profiles.exportProfile(name);
      if (exportStr) {
        console.log(exportStr);
        info("Run 'eval \"$(cohe profile export <name>)\"' to apply.");
      } else {
        error(`Profile "${name}" not found.`);
      }
      break;
    }

    default:
      console.log(`
ImBIOS Profile Management

Usage: cohe profile <command> [options]

Commands:
  list              List all profiles
  create            Create a new profile
  switch <name>     Switch to a profile
  delete <name>     Delete a profile
  export [name]     Export profile as shell vars

Examples:
  cohe profile list
  cohe profile create work
  cohe profile switch work
  eval "$(cohe profile export work)"
`);
  }
}

// Multi-Account Commands

export async function handleAccount(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "list": {
      section("Multi-Account Management");
      const accounts = accountsConfig.listAccounts();
      const activeAccount = accountsConfig.getActiveAccount();

      if (accounts.length === 0) {
        info("No accounts configured. Use 'cohe account add' to add one.");
        return;
      }

      accounts.forEach((acc) => {
        const isActive = acc.id === activeAccount?.id;
        console.log(
          `  ${isActive ? "●" : "○"} ${acc.name} (${acc.provider}) - ${
            acc.isActive ? "active" : "inactive"
          }`
        );
      });

      info("");
      info(`Active account: ${activeAccount?.name || "none"}`);
      break;
    }

    case "add": {
      section("Add Account");

      const name = await input("Account name:");
      if (!name) {
        error("Account name is required.");
        return;
      }

      const provider = await providerSelection();
      const apiKey = await password(`API Key for ${provider}:`);
      if (!apiKey) {
        error("API key is required.");
        return;
      }

      const baseUrl = await input(
        "Base URL:",
        PROVIDERS[provider]().getConfig().baseUrl
      );
      const defaultModel = await modelSelection(
        PROVIDERS[provider]().getModels()
      );

      const account = accountsConfig.addAccount(
        name,
        provider,
        apiKey,
        baseUrl,
        defaultModel
      );
      success(`Account "${name}" added successfully!`);
      info(`Account ID: ${account.id}`);
      break;
    }

    case "switch": {
      const id = args[1];
      if (!id) {
        error("Usage: cohe account switch <id>");
        return;
      }

      if (accountsConfig.switchAccount(id)) {
        success(`Switched to account ${id}`);
      } else {
        error(`Account "${id}" not found.`);
      }
      break;
    }

    case "remove": {
      const id = args[1];
      if (!id) {
        error("Usage: cohe account remove <id>");
        return;
      }

      if (accountsConfig.deleteAccount(id)) {
        success(`Account ${id} removed.`);
      } else {
        error(`Failed to remove account "${id}".`);
      }
      break;
    }

    case "edit": {
      const id = args[1];
      if (!id) {
        error("Usage: cohe account edit <id>");
        return;
      }

      const config = accountsConfig.loadConfigV2();
      const account = config.accounts[id];

      if (!account) {
        error(`Account "${id}" not found.`);
        return;
      }

      section(`Edit Account: ${account.name}`);

      const field = await select(
        "What would you like to edit?",
        ["name", "api-key", "group-id", "base-url", "done"],
        4
      );

      if (field === "done") {
        success("No changes made.");
        break;
      }

      switch (field) {
        case "name": {
          const name = await input("New name:", account.name);
          if (!name) {
            error("Name cannot be empty.");
            return;
          }
          accountsConfig.updateAccount(id, { name });
          success(`Name updated to "${name}"`);
          break;
        }

        case "api-key": {
          const apiKey = await password("New API key:");
          if (!apiKey) {
            error("API key cannot be empty.");
            return;
          }
          accountsConfig.updateAccount(id, { apiKey });
          success("API key updated.");
          break;
        }

        case "group-id": {
          const currentGroupId = account.groupId || "(not set)";
          info(`Current GroupId: ${currentGroupId}`);

          if (account.provider === "minimax") {
            info(
              "GroupId is required for MiniMax usage tracking. Found in browser DevTools when visiting https://platform.minimax.io/user-center/payment/coding-plan"
            );
          }

          const groupId = await input("New GroupId:", account.groupId || "");

          if (account.provider === "minimax" && !groupId) {
            error("GroupId is required for MiniMax accounts.");
            return;
          }

          accountsConfig.updateAccount(id, {
            groupId: groupId || undefined,
          });
          success(`GroupId updated to "${groupId || "(not set)"}"`);
          break;
        }

        case "base-url": {
          const baseUrl = await input("New base URL:", account.baseUrl);
          if (!baseUrl) {
            error("Base URL cannot be empty.");
            return;
          }
          accountsConfig.updateAccount(id, { baseUrl });
          success(`Base URL updated to "${baseUrl}"`);
          break;
        }
      }
      break;
    }

    default:
      console.log(`
ImBIOS Multi-Account Management

Usage: cohe account <command> [options]

Commands:
  list              List all accounts
  add               Add a new account
  edit <id>         Edit an existing account
  switch <id>       Switch to an account
  remove <id>       Remove an account

Examples:
  cohe account list
  cohe account add
  cohe account edit minimax_default
  cohe account switch acc_123456
`);
  }
}

export async function handleRotate(args: string[]): Promise<void> {
  section("API Key Rotation");

  const provider = args[0] as "zai" | "minimax" | undefined;

  if (!(provider && ["zai", "minimax"].includes(provider))) {
    error("Usage: cohe rotate <zai|minimax>");
    return;
  }

  const newAccount = accountsConfig.rotateApiKey(provider);

  if (newAccount) {
    success(`Rotated to account: ${newAccount.name}`);
    info(`New active account: ${newAccount.name} (${newAccount.provider})`);
  } else {
    error(`No other accounts available for ${provider}.`);
    info("Add more accounts with: cohe account add");
  }
}

export async function handleDashboard(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "start": {
      const port = Number.parseInt(args[1], 10) || 3456;
      accountsConfig.toggleDashboard(true, port);
      success(`Dashboard enabled on port ${port}`);
      info("Run 'cohe dashboard' to start the web server");
      break;
    }

    case "stop": {
      accountsConfig.toggleDashboard(false);
      success("Dashboard disabled.");
      break;
    }

    case "status": {
      section("Dashboard Status");
      const config = accountsConfig.loadConfigV2();
      table({
        Enabled: config.dashboard.enabled ? "Yes" : "No",
        Port: config.dashboard.port.toString(),
        Host: config.dashboard.host,
        Auth: config.dashboard.authToken
          ? `***${config.dashboard.authToken.slice(-4)}`
          : "Not set",
      });
      break;
    }

    default: {
      const config = accountsConfig.loadConfigV2();
      if (config.dashboard.enabled) {
        const { startDashboard } = await import("../commands/dashboard.js");
        startDashboard();
      } else {
        console.log(`
ImBIOS Web Dashboard

Usage: cohe dashboard <command> [options]

Commands:
  start [port]     Start the web dashboard
  stop             Stop the dashboard
  status           Show dashboard configuration

Examples:
  cohe dashboard start 8080
  cohe dashboard status
  cohe dashboard stop
`);
      }
    }
  }
}

// hooks command - Claude Code hooks management
export async function handleHooks(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "setup": {
      const { handleHooksSetup } = await import("./handlers/hooks-handler.js");
      await handleHooksSetup();
      break;
    }

    case "uninstall": {
      const { handleHooksUninstall } = await import(
        "./handlers/hooks-handler.js"
      );
      await handleHooksUninstall();
      break;
    }

    case "status": {
      const { handleHooksStatus } = await import("./handlers/hooks-handler.js");
      await handleHooksStatus();
      break;
    }

    default: {
      console.log(`
ImBIOS Claude Code Hooks Management

Hooks enable auto-rotation for both direct Claude CLI and ACP usage.

Usage: cohe hooks <command>

Commands:
  setup       Install hooks globally in ~/.claude/
  uninstall   Remove hooks
  status      Check hook installation status

How it works:
  When you start Claude (with 'claude' or through ACP), the SessionStart hook
  automatically rotates your API keys to the least-used account.

Configuration:
  Hooks respect your rotation settings in ~/.claude/imbios.json:
  - Rotation: enabled by default
  - Strategy: least-used by default
  - Cross-provider: enabled by default

  Change settings with: cohe auto enable <strategy>

Examples:
  cohe hooks setup           # Install hooks
  cohe hooks status          # Check installation
  cohe auto status           # Check rotation settings
  cohe auto enable priority  # Change rotation strategy
  cohe hooks uninstall       # Remove hooks
`);
    }
  }
}

export async function handleAlert(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "list": {
      section("Usage Alerts");
      const config = accountsConfig.loadConfigV2();

      config.alerts.forEach((alert) => {
        const status = alert.enabled ? "enabled" : "disabled";
        console.log(
          `  ${alert.id}: ${alert.type} @ ${alert.threshold}% [${status}]`
        );
      });
      break;
    }

    case "add": {
      const type = await select("Alert type:", ["usage", "quota"]);
      const threshold = Number.parseInt(
        await input("Threshold (%):", "80"),
        10
      );
      const config = accountsConfig.loadConfigV2();

      const alert = {
        id: `alert_${Date.now()}`,
        type: type as "usage" | "quota",
        threshold,
        enabled: true,
      };

      config.alerts.push(alert);
      accountsConfig.saveConfigV2(config);
      success(`Alert added: ${type} @ ${threshold}%`);
      break;
    }

    case "enable":
    case "disable": {
      const id = args[1];
      if (!id) {
        error(`Usage: cohe alert ${action} <id>`);
        return;
      }

      accountsConfig.updateAlert(id, { enabled: action === "enable" });
      success(`Alert ${id} ${action}d`);
      break;
    }

    default:
      console.log(`
ImBIOS Alert Management

Usage: cohe alert <command> [options]

Commands:
  list              List all alerts
  add               Add a new alert
  enable <id>       Enable an alert
  disable <id>      Disable an alert

Examples:
  cohe alert list
  cohe alert add
  cohe alert enable alert_123
`);
  }
}

export async function handleMcp(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "list": {
      section("MCP Servers");
      const servers = mcp.listMcpServers();

      if (servers.length === 0) {
        info("No MCP servers configured.");
        info("Use 'cohe mcp add' to add a server.");
        return;
      }

      const enabledCount = servers.filter((s) => s.enabled).length;

      console.log(`  Total: ${servers.length} | Enabled: ${enabledCount}\n`);

      servers.forEach((server) => {
        const status = server.enabled ? "●" : "○";
        const provider = server.provider || "all";
        console.log(
          `  ${status} ${server.name} [${provider}] ${
            server.enabled ? "" : "(disabled)"
          }`
        );
        console.log(`      ${server.command} ${server.args.join(" ")}`);
        if (server.description) {
          console.log(`      ${server.description}`);
        }
      });
      break;
    }

    case "add": {
      section("Add MCP Server");

      const name = await input("Server name:");
      if (!name) {
        error("Server name is required.");
        return;
      }

      const command = await input("Command:", "npx");
      if (!command) {
        error("Command is required.");
        return;
      }

      const argsInput = await input("Arguments (space-separated):", "-y");
      const argsList = argsInput.split(" ").filter((a) => a);

      const provider = await select("Provider:", ["all", "zai", "minimax"], 0);
      const description = await input("Description (optional):", "");

      mcp.addMcpServer(name, command, argsList, {
        description,
        provider: provider as "zai" | "minimax" | "all",
      });

      success(`MCP server "${name}" added successfully!`);
      info(`Run 'cohe mcp enable ${name}' to enable it.`);
      break;
    }

    case "remove": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp remove <name>");
        return;
      }

      if (mcp.deleteMcpServer(name)) {
        success(`MCP server "${name}" removed.`);
      } else {
        error(`MCP server "${name}" not found.`);
      }
      break;
    }

    case "enable": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp enable <name>");
        return;
      }

      if (mcp.toggleMcpServer(name, true)) {
        success(`MCP server "${name}" enabled.`);
      } else {
        error(`MCP server "${name}" not found.`);
      }
      break;
    }

    case "disable": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp disable <name>");
        return;
      }

      if (mcp.toggleMcpServer(name, false)) {
        success(`MCP server "${name}" disabled.`);
      } else {
        error(`MCP server "${name}" not found.`);
      }
      break;
    }

    case "add-predefined": {
      const provider = args[1] as "zai" | "minimax" | undefined;

      if (!(provider && ["zai", "minimax"].includes(provider))) {
        error("Usage: cohe mcp add-predefined <zai|minimax>");
        return;
      }

      mcp.addPredefinedServers(provider);

      const predefined =
        provider === "zai" ? mcp.ZAI_MCP_SERVERS : mcp.MINIMAX_MCP_SERVERS;
      const serverCount = Object.keys(predefined).length;

      success(
        `Added ${serverCount} predefined ${provider.toUpperCase()} MCP servers.`
      );
      info(
        "Use 'cohe mcp list' to see them, then 'cohe mcp enable <name>' to enable."
      );
      break;
    }

    case "export": {
      const format = args[1] || "env";

      if (format === "env") {
        console.log(mcp.generateMcpEnvExport());
        info("Run 'eval \"$(cohe mcp export env)\"' to apply.");
      } else if (format === "claude") {
        console.log(mcp.generateClaudeDesktopConfig());
        info("Save this to ~/.config/claude/mcp.json for Claude Desktop.");
      } else {
        error(`Unknown format: ${format}. Use 'env' or 'claude'.`);
      }
      break;
    }

    case "test": {
      const name = args[1];
      if (!name) {
        error("Usage: cohe mcp test <name>");
        return;
      }

      const server = mcp.getMcpServer(name);
      if (!server) {
        error(`MCP server "${name}" not found.`);
        return;
      }

      section(`Testing MCP Server: ${name}`);

      const { spawn } = require("node:child_process");

      info(`Running: ${server.command} ${server.args.join(" ")}`);

      const child = spawn(server.command, server.args, {
        env: { ...process.env, ...mcp.getMcpEnvForServer(name) },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code: number) => {
        if (code === 0) {
          success("Server started successfully!");
          if (stdout) {
            info("Output:");
            console.log(stdout);
          }
        } else {
          error(`Server exited with code ${code}`);
          if (stderr) {
            warning("Stderr:");
            console.log(stderr);
          }
        }
      });

      child.on("error", (err: Error) => {
        error(`Failed to start server: ${err.message}`);
      });

      // Kill after 10 seconds
      setTimeout(() => {
        child.kill();
        if (stdout || stderr) {
          info("Server test completed (timeout).");
        }
      }, 10_000);
      break;
    }

    default:
      console.log(`
ImBIOS MCP Server Management v1.0.0

Usage: cohe mcp <command> [options]

Commands:
  list                    List all configured MCP servers
  add                     Add a new MCP server
  remove <name>           Remove an MCP server
  enable <name>           Enable an MCP server
  disable <name>          Disable an MCP server
  add-predefined <p>     Add predefined servers for provider (zai|minimax)
  export [env|claude]     Export configuration (env vars or Claude Desktop JSON)
  test <name>             Test an MCP server connection

Examples:
  cohe mcp list
  cohe mcp add
  cohe mcp enable zai-vision
  cohe mcp add-predefined zai
  eval "$(cohe mcp export env)"
`);
  }
}

export async function handleHelp(): Promise<void> {
  const pkg = await import("../../package.json");
  console.log(`
ImBIOS - Z.AI & MiniMax Provider Manager v${pkg.version}

Usage: cohe <command> [options]

Commands:
  claude [args...]    Spawn Claude with auto-switch
  config              Configure API providers (interactive)
  switch <provider>   Switch active provider (zai/minimax)
  status              Show current provider and status
  usage               Query quota and usage statistics
  history             Show usage history
  cost [model]        Estimate cost for a model
  test                Test API connection
  plugin <action>     Manage Claude Code plugin
  doctor              Diagnose configuration issues
  env export          Export environment variables
  models [provider]   List available models
  completion <shell>  Generate shell completion (bash/zsh/fish)
  profile <cmd>       Manage configuration profiles (v1.1)
  account <cmd>       Multi-account management (v2)
  rotate <provider>   Rotate to next API key (v2)
  dashboard <cmd>     Web dashboard management (v2)
  alert <cmd>         Alert configuration (v2)
  mcp <cmd>           MCP server management (v1)
  auto <cmd>          Cross-provider auto-rotation (v2)
  compare <prompt>    Side-by-side Claude comparison (v2)
  hooks <cmd>         Claude Code hooks management
  help                Show this help message
  version             Show version

Examples:
  cohe claude              # Run claude with auto-switch
  cohe claude --continue   # Run claude --continue with auto-switch
  cohe config              # Configure providers
  cohe switch minimax      # Switch to MiniMax
  cohe account add work    # Add work account
  cohe rotate zai          # Rotate Z.AI key
  cohe dashboard start     # Start web dashboard
  cohe mcp add-predefined zai  # Add Z.AI MCP servers
  cohe auto enable random --cross-provider
  cohe compare "Write a React component"
  cohe hooks setup         # Install auto-rotate hooks
  eval "$(cohe env export)"  # Export env vars

For more info, visit: https://github.com/ImBIOS/coding-helper
`);
}

export async function handleVersion(): Promise<void> {
  const pkg = await import("../../package.json");
  console.log(`ImBIOS v${pkg.version}`);
}

// compare command - Side-by-side Claude comparison
export async function handleCompare(args: string[]): Promise<void> {
  const { handleCompare: compareHandler } = await import("./compare.js");
  await compareHandler(args);
}

// Re-export for the compare module to use
import type { handleCompare as CompareHandlerType } from "./compare.js";
export type { CompareHandlerType };

// claude command - Spawn claude with auto-switch
export async function handleClaude(args: string[]): Promise<void> {
  const { spawn } = await import("node:child_process");
  const { execSync } = await import("node:child_process");

  // Find claude CLI
  let claudePath: string | null = null;
  try {
    claudePath = execSync("which claude 2>/dev/null", {
      encoding: "utf-8",
    }).trim();
  } catch {
    error("Claude CLI not found. Please install Claude Code first.");
    return;
  }

  const config = accountsConfig.loadConfigV2();

  // Check if auto-rotation is enabled
  if (config.rotation.enabled) {
    const accounts = accountsConfig.listAccounts();

    // v2 multi-account rotation
    if (accounts.length > 1) {
      const previousAccount = accountsConfig.getActiveAccount();
      const newAccount = config.rotation.crossProvider
        ? await accountsConfig.rotateAcrossProviders()
        : previousAccount?.provider
          ? accountsConfig.rotateApiKey(previousAccount.provider)
          : null;

      if (newAccount && newAccount.id !== previousAccount?.id) {
        info(
          `[auto-switch] ${previousAccount?.name || "none"} → ${
            newAccount.name
          } (${newAccount.provider})`
        );
      }
    }
    // Legacy provider rotation (switch between zai/minimax)
    else if (config.rotation.crossProvider) {
      const currentProvider = settings.getActiveProvider();
      const zaiConfig = settings.getProviderConfig("zai");
      const minimaxConfig = settings.getProviderConfig("minimax");

      // Only rotate if both providers are configured
      if (zaiConfig.apiKey && minimaxConfig.apiKey) {
        const newProvider: "zai" | "minimax" =
          currentProvider === "zai" ? "minimax" : "zai";
        settings.setActiveProvider(newProvider);
        info(`[auto-switch] ${currentProvider} → ${newProvider}`);
      }
    }
  }

  // Get active account credentials
  const activeAccount = accountsConfig.getActiveAccount();

  if (!activeAccount) {
    // Fall back to legacy settings
    const legacyProvider = settings.getActiveProvider();
    const legacyConfig = settings.getProviderConfig(legacyProvider);

    if (!legacyConfig.apiKey) {
      error(
        "No accounts configured. Run 'cohe config' or 'cohe account add' first."
      );
      return;
    }

    // Use legacy config
    const provider = PROVIDERS[legacyProvider]();
    const providerConfig = provider.getConfig();

    // Build environment - only disable non-essential traffic for MiniMax
    const childEnv: Record<string, string> = {
      ...process.env,
      ANTHROPIC_AUTH_TOKEN: providerConfig.apiKey,
      ANTHROPIC_BASE_URL: providerConfig.baseUrl,
      // ANTHROPIC_MODEL is NOT set - providers handle translation
      API_TIMEOUT_MS: "3000000",
    };

    if (legacyProvider === "minimax") {
      childEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
    }

    const child = spawn(claudePath, args, {
      stdio: "inherit",
      env: childEnv,
    });

    child.on("close", (code) => {
      process.exit(code ?? 0);
    });

    return;
  }

  // Use v2 account
  // Build environment - only disable non-essential traffic for MiniMax
  const childEnv: Record<string, string> = {
    ...process.env,
    ANTHROPIC_AUTH_TOKEN: activeAccount.apiKey,
    ANTHROPIC_BASE_URL: activeAccount.baseUrl,
    // ANTHROPIC_MODEL is NOT set - providers handle translation
    API_TIMEOUT_MS: "3000000",
  };

  if (activeAccount.provider === "minimax") {
    childEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  }

  const child = spawn(claudePath, args, {
    stdio: "inherit",
    env: childEnv,
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

// auto command - Cross-provider auto-rotation
export async function handleAuto(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "enable": {
      const strategy = args[1] as accountsConfig.RotationStrategy | undefined;
      const crossProvider = args.includes("--cross-provider");
      accountsConfig.configureRotation(true, strategy, crossProvider);
      const config = accountsConfig.loadConfigV2();
      success("Auto-rotation enabled.");
      info(`Strategy: ${config.rotation.strategy}`);
      info(
        `Cross-provider: ${
          config.rotation.crossProvider ? "enabled" : "disabled"
        }`
      );
      break;
    }

    case "disable": {
      accountsConfig.configureRotation(false);
      success("Auto-rotation disabled.");
      break;
    }

    case "status": {
      section("Auto-Rotation Status");
      const config = accountsConfig.loadConfigV2();
      table({
        Enabled: config.rotation.enabled ? "Yes" : "No",
        Strategy: config.rotation.strategy,
        "Cross-provider": config.rotation.crossProvider ? "Yes" : "No",
        "Last rotation": config.rotation.lastRotation || "Never",
      });

      // Show current active account
      const activeAccount = accountsConfig.getActiveAccount();
      if (activeAccount) {
        info("");
        info(
          `Active account: ${activeAccount.name} (${activeAccount.provider})`
        );
      }
      break;
    }

    case "rotate": {
      const newAccount = await accountsConfig.rotateAcrossProviders();
      if (newAccount) {
        success(`Rotated to: ${newAccount.name} (${newAccount.provider})`);
      } else {
        error("No accounts available for rotation.");
      }
      break;
    }

    case "hook": {
      // SessionStart hook - for internal use by Claude Code
      const silent = args.includes("--silent");
      const currentAccount = accountsConfig.getActiveAccount();

      if (!currentAccount) {
        if (!silent) {
          error("No active account found");
        }
        return;
      }

      // Update settings.json with current account credentials
      // Note: We don't set ANTHROPIC_MODEL here - let providers auto-translate
      // Anthropic model names (e.g., claude-3-5-sonnet-20241022) to their own models
      const settingsPath = `${process.env.HOME}/.claude/settings.json`;
      const fs = await import("node:fs");
      const _path = await import("node:path");

      if (fs.existsSync(settingsPath)) {
        try {
          const settingsContent = fs.readFileSync(settingsPath, "utf-8");
          const settings = JSON.parse(settingsContent);

          // Build environment - only disable non-essential traffic for MiniMax
          const env: Record<string, string | number> = {
            ANTHROPIC_AUTH_TOKEN: currentAccount.apiKey,
            ANTHROPIC_BASE_URL: currentAccount.baseUrl,
            API_TIMEOUT_MS: "3000000",
          };

          // Only MiniMax needs CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
          if (currentAccount.provider === "minimax") {
            env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1;
          }

          settings.env = env;

          // Manage enabledPlugins based on provider
          // GLM plugins should only be enabled when ZAI is the provider
          const glmPlugins = [
            "glm-plan-usage@zai-coding-plugins",
            "glm-plan-bug@zai-coding-plugins",
          ];

          if (currentAccount.provider === "zai") {
            // Enable GLM plugins for ZAI
            if (!settings.enabledPlugins) {
              settings.enabledPlugins = {};
            }
            for (const plugin of glmPlugins) {
              settings.enabledPlugins[plugin] = true;
            }
          } else if (currentAccount.provider === "minimax") {
            // Disable/remove GLM plugins for MiniMax
            if (settings.enabledPlugins) {
              for (const plugin of glmPlugins) {
                delete settings.enabledPlugins[plugin];
              }
              // Clean up empty enabledPlugins object
              if (Object.keys(settings.enabledPlugins).length === 0) {
                settings.enabledPlugins = undefined;
              }
            }
          }

          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        } catch (err) {
          if (!silent) {
            error(`Failed to update settings.json: ${(err as Error).message}`);
          }
        }
      }

      // Rotate for next session asynchronously
      const config = accountsConfig.loadConfigV2();
      if (config.rotation.enabled) {
        setImmediate(async () => {
          try {
            await accountsConfig.rotateAcrossProviders();
          } catch {
            // Silent fail
          }
        });
      }
      break;
    }

    default: {
      console.log(`
ImBIOS Auto-Rotation

Usage: cohe auto <command> [options]

Commands:
  enable [strategy]      Enable auto-rotation
  disable                Disable auto-rotation
  status                 Show current rotation status
  rotate                 Manually trigger rotation
  hook                   SessionStart hook (for internal use)

Options:
  --cross-provider       Enable cross-provider rotation

Strategies:
  round-robin            Cycle through accounts sequentially
  least-used             Pick account with lowest usage
  priority               Pick highest priority account
  random                 Randomly select account

Examples:
  cohe auto enable round-robin
  cohe auto enable random --cross-provider
  cohe auto status
  cohe auto rotate
  cohe auto hook --silent
`);
    }
  }
}
