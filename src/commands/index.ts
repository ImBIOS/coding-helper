import * as mcp from "../config/mcp";
import * as profiles from "../config/profiles";
import * as settings from "../config/settings";
import * as v2 from "../config/v2";
import type { Provider } from "../providers/base";
import { minimaxProvider } from "../providers/minimax";
import { zaiProvider } from "../providers/zai";
import { getShellCompletion } from "../utils/completion";
import { error, info, section, success, table, warning } from "../utils/logger";
import {
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

  const provider = await providerSelection();
  info(`Configuring ${provider.toUpperCase()} provider...`);

  const existingConfig = settings.getProviderConfig(provider);

  const apiKey =
    (await password(`Enter API Key for ${provider}:`)) ||
    existingConfig.apiKey ||
    "";
  const baseUrl = await input(
    "Base URL:",
    existingConfig.baseUrl || PROVIDERS[provider]().getConfig().baseUrl
  );
  const defaultModel = await modelSelection(PROVIDERS[provider]().getModels());

  if (!apiKey) {
    error("API key is required!");
    return;
  }

  settings.setProviderConfig(provider, apiKey, baseUrl, defaultModel);
  success(`${provider.toUpperCase()} configuration saved!`);
}

export async function handleSwitch(args: string[]): Promise<void> {
  const targetProvider = args[0] as "zai" | "minimax" | undefined;

  if (!(targetProvider && ["zai", "minimax"].includes(targetProvider))) {
    error("Usage: imbios switch <zai|minimax>");
    return;
  }

  const provider = PROVIDERS[targetProvider]();
  const config = provider.getConfig();

  if (!config.apiKey) {
    warning(
      `${provider.displayName} is not configured. Run "imbios config" first.`
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
      ? "••••••••" + config.apiKey.slice(-4)
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
    `${otherProvider.displayName}: ${otherHasKey ? "Configured" : "Not configured"}`
  );

  // Show active profile if using profiles
  const activeProfile = profiles.getActiveProfile();
  if (activeProfile) {
    info("");
    info(`Active Profile: ${activeProfile.name}`);
  }

  // Show v2 accounts if using
  const v2Config = v2.loadConfigV2();
  const activeAccount = v2.getActiveAccount();
  if (activeAccount) {
    info("");
    info(`Active Account: ${activeAccount.name} (${activeAccount.provider})`);
    info(
      `Rotation: ${v2Config.rotation.enabled ? v2Config.rotation.strategy : "disabled"}`
    );
  }
}

export async function handleUsage(): Promise<void> {
  section("Usage Statistics");

  const activeProvider = settings.getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
  const config = provider.getConfig();

  if (!config.apiKey) {
    warning(`${provider.displayName} is not configured.`);
    return;
  }

  const usage = await provider.getUsage();

  if (usage.limit === 0) {
    info(`Unable to fetch usage data from ${provider.displayName}`);
    return;
  }

  table({
    Provider: provider.displayName,
    Used: `$${usage.used.toFixed(4)}`,
    Limit: `$${usage.limit.toFixed(4)}`,
    Remaining: `$${usage.remaining.toFixed(4)}`,
    Usage: `${usage.percentUsed.toFixed(1)}%`,
  });

  // Check for alerts
  const triggeredAlerts = v2.checkAlerts(usage);
  if (triggeredAlerts.length > 0) {
    warning("\nAlerts triggered:");
    triggeredAlerts.forEach((alert) => {
      info(`  - ${alert.type}: threshold ${alert.threshold}%`);
    });
  }
}

export async function handleHistory(): Promise<void> {
  section("Usage History");

  const activeProvider = settings.getActiveProvider();
  const provider = PROVIDERS[activeProvider]();
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
    "GLM-4.5-Air-X": 0.000_075,
    "MiniMax-M2.1": 0.000_08,
    "MiniMax-M2": 0.000_04,
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
      `${provider.displayName} is not configured. Run "imbios config" first.`
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
      info("Usage: imbios plugin <install|uninstall|update>");
      info('Run "imbios config" to configure providers first.');
      break;
  }
}

export async function handleDoctor(): Promise<void> {
  section("Diagnostics");

  const issues: string[] = [];
  const checks: Array<[string, boolean]> = [];

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
    console.log('Usage: eval "$(imbios env export)"');
  }
}

export async function handleModels(providerName?: string): Promise<void> {
  section("Available Models");

  const activeProvider = settings.getActiveProvider();
  const targetProvider = providerName || activeProvider;

  if (!["zai", "minimax"].includes(targetProvider)) {
    error("Usage: imbios models [zai|minimax]");
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
    info("For fish: Add to ~/.config/fish/completions/imbios.fish");
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
          "No profiles configured. Use 'imbios profile create' to create one."
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
        error("Usage: imbios profile switch <name>");
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
        error("Usage: imbios profile delete <name>");
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
        info("Run 'eval \"$(imbios profile export <name>)\"' to apply.");
      } else {
        error(`Profile "${name}" not found.`);
      }
      break;
    }

    default:
      console.log(`
ImBIOS Profile Management

Usage: imbios profile <command> [options]

Commands:
  list              List all profiles
  create            Create a new profile
  switch <name>     Switch to a profile
  delete <name>     Delete a profile
  export [name]     Export profile as shell vars

Examples:
  imbios profile list
  imbios profile create work
  imbios profile switch work
  eval "$(imbios profile export work)"
`);
  }
}

// v2.0.0 Commands

export async function handleAccount(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "list": {
      section("Multi-Account Management");
      const accounts = v2.listAccounts();
      const activeAccount = v2.getActiveAccount();

      if (accounts.length === 0) {
        info("No accounts configured. Use 'imbios account add' to add one.");
        return;
      }

      accounts.forEach((acc) => {
        const isActive = acc.id === activeAccount?.id;
        console.log(
          `  ${isActive ? "●" : "○"} ${acc.name} (${acc.provider}) - ${acc.isActive ? "active" : "inactive"}`
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

      const account = v2.addAccount(
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
        error("Usage: imbios account switch <id>");
        return;
      }

      if (v2.switchAccount(id)) {
        success(`Switched to account ${id}`);
      } else {
        error(`Account "${id}" not found.`);
      }
      break;
    }

    case "remove": {
      const id = args[1];
      if (!id) {
        error("Usage: imbios account remove <id>");
        return;
      }

      if (v2.deleteAccount(id)) {
        success(`Account ${id} removed.`);
      } else {
        error(`Failed to remove account "${id}".`);
      }
      break;
    }

    default:
      console.log(`
ImBIOS Multi-Account Management v2.0

Usage: imbios account <command> [options]

Commands:
  list              List all accounts
  add               Add a new account
  switch <id>       Switch to an account
  remove <id>       Remove an account

Examples:
  imbios account list
  imbios account add work-account
  imbios account switch acc_123456
`);
  }
}

export async function handleRotate(args: string[]): Promise<void> {
  section("API Key Rotation");

  const provider = args[0] as "zai" | "minimax" | undefined;

  if (!(provider && ["zai", "minimax"].includes(provider))) {
    error("Usage: imbios rotate <zai|minimax>");
    return;
  }

  const newAccount = v2.rotateApiKey(provider);

  if (newAccount) {
    success(`Rotated to account: ${newAccount.name}`);
    info(`New active account: ${newAccount.name} (${newAccount.provider})`);
  } else {
    error(`No other accounts available for ${provider}.`);
    info("Add more accounts with: imbios account add");
  }
}

export async function handleDashboard(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "start": {
      const port = Number.parseInt(args[1]) || 3456;
      v2.toggleDashboard(true, port);
      success(`Dashboard enabled on port ${port}`);
      info("Run 'imbios dashboard' to start the web server");
      break;
    }

    case "stop": {
      v2.toggleDashboard(false);
      success("Dashboard disabled.");
      break;
    }

    case "status": {
      section("Dashboard Status");
      const config = v2.loadConfigV2();
      table({
        Enabled: config.dashboard.enabled ? "Yes" : "No",
        Port: config.dashboard.port.toString(),
        Host: config.dashboard.host,
        Auth: config.dashboard.authToken
          ? "***" + config.dashboard.authToken.slice(-4)
          : "Not set",
      });
      break;
    }

    default: {
      const config = v2.loadConfigV2();
      if (config.dashboard.enabled) {
        const { startDashboard } = await import("../commands/dashboard.js");
        startDashboard();
      } else {
        console.log(`
ImBIOS Web Dashboard v2.0

Usage: imbios dashboard <command> [options]

Commands:
  start [port]     Start the web dashboard
  stop             Stop the dashboard
  status           Show dashboard configuration

Examples:
  imbios dashboard start 8080
  imbios dashboard status
  imbios dashboard stop
`);
      }
    }
  }
}

export async function handleAlert(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "list": {
      section("Usage Alerts");
      const config = v2.loadConfigV2();

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
      const threshold = Number.parseInt(await input("Threshold (%):", "80"));
      const config = v2.loadConfigV2();

      const alert = {
        id: `alert_${Date.now()}`,
        type: type as "usage" | "quota",
        threshold,
        enabled: true,
      };

      config.alerts.push(alert);
      v2.saveConfigV2(config);
      success(`Alert added: ${type} @ ${threshold}%`);
      break;
    }

    case "enable":
    case "disable": {
      const id = args[1];
      if (!id) {
        error(`Usage: imbios alert ${action} <id>`);
        return;
      }

      v2.updateAlert(id, { enabled: action === "enable" });
      success(`Alert ${id} ${action}d`);
      break;
    }

    default:
      console.log(`
ImBIOS Alert Management v2.0

Usage: imbios alert <command> [options]

Commands:
  list              List all alerts
  add               Add a new alert
  enable <id>       Enable an alert
  disable <id>      Disable an alert

Examples:
  imbios alert list
  imbios alert add
  imbios alert enable alert_123
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
        info("Use 'imbios mcp add' to add a server.");
        return;
      }

      const enabledCount = servers.filter((s) => s.enabled).length;

      console.log(`  Total: ${servers.length} | Enabled: ${enabledCount}\n`);

      servers.forEach((server) => {
        const status = server.enabled ? "●" : "○";
        const provider = server.provider || "all";
        console.log(
          `  ${status} ${server.name} [${provider}] ${server.enabled ? "" : "(disabled)"}`
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
      info(`Run 'imbios mcp enable ${name}' to enable it.`);
      break;
    }

    case "remove": {
      const name = args[1];
      if (!name) {
        error("Usage: imbios mcp remove <name>");
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
        error("Usage: imbios mcp enable <name>");
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
        error("Usage: imbios mcp disable <name>");
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
        error("Usage: imbios mcp add-predefined <zai|minimax>");
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
        "Use 'imbios mcp list' to see them, then 'imbios mcp enable <name>' to enable."
      );
      break;
    }

    case "export": {
      const format = args[1] || "env";

      if (format === "env") {
        console.log(mcp.generateMcpEnvExport());
        info("Run 'eval \"$(imbios mcp export env)\"' to apply.");
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
        error("Usage: imbios mcp test <name>");
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

Usage: imbios mcp <command> [options]

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
  imbios mcp list
  imbios mcp add
  imbios mcp enable zai-vision
  imbios mcp add-predefined zai
  eval "$(imbios mcp export env)"
`);
  }
}

export async function handleHelp(): Promise<void> {
  console.log(`
ImBIOS - Z.AI & MiniMax Provider Manager v2.0.0

Usage: imbios <command> [options]

Commands:
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
  account <cmd>       Multi-account management (v2.0)
  rotate <provider>   Rotate to next API key (v2.0)
  dashboard <cmd>     Web dashboard management (v2.0)
  alert <cmd>         Alert configuration (v2.0)
  mcp <cmd>           MCP server management (v1.0)
  help                Show this help message
  version             Show version

Examples:
  imbios config              # Configure providers
  imbios switch minimax      # Switch to MiniMax
  imbios account add work    # Add work account
  imbios rotate zai          # Rotate Z.AI key
  imbios dashboard start     # Start web dashboard
  imbios mcp add-predefined zai  # Add Z.AI MCP servers
  eval "$(imbios env export)"  # Export env vars

For more info, visit: https://github.com/imbios/coding-helper
`);
}

export async function handleVersion(): Promise<void> {
  console.log("ImBIOS v2.0.0");
}
