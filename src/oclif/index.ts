#!/usr/bin/env node

import { loadEnv } from "./config/env.js";

// Load environment variables
loadEnv();

// Get command from args
const command = process.argv[2] || "help";
const args = process.argv.slice(3);

async function main() {
  // Import and run command
  const commandMap: Record<string, () => Promise<void>> = {
    config: () => import("./oclif/commands/config.js").then(m => m.default(args)),
    switch: () => import("./oclif/commands/switch.js").then(m => m.default(args)),
    status: () => import("./oclif/commands/status.js").then(m => m.default()),
    usage: () => import("./oclif/commands/usage.js").then(m => m.default()),
    test: () => import("./oclif/commands/test.js").then(m => m.default()),
    version: () => import("./oclif/commands/version.js").then(m => m.default()),
    help: () => import("./oclif/commands/help.js").then(m => m.default(args)),
    doctor: () => import("./oclif/commands/doctor.js").then(m => m.default()),
    models: () => import("./oclif/commands/models.js").then(m => m.default(args)),
    history: () => import("./oclif/commands/history.js").then(m => m.default()),
    cost: () => import("./oclif/commands/cost.js").then(m => m.default(args)),
  };

  const handler = commandMap[command];

  if (!handler) {
    if (command === "--help" || command === "-h") {
      showHelp();
      return;
    }
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  try {
    await handler();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

function showHelp() {
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
  help                Show this help message
  version             Show version

For more info, visit: https://github.com/imbios/coding-helper
`);
}

main();
