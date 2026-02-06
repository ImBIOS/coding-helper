#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Find project root by looking for package.json
let root = __dirname;
while (root !== "/" && !existsSync(join(root, "package.json"))) {
  root = dirname(root);
}
// If we couldn't find package.json, fall back to relative path
if (root === "/") {
  root = join(__dirname, "..");
}

// Simple command router for Bun + ink
const args = process.argv.slice(2);

// Handle global --help and -h flags
let command = args[0] || "help";
let commandArgs = args.slice(1);

if (command === "--help" || command === "-h") {
  command = "help";
  commandArgs = [];
}

// Read package.json for version and config
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

// Create a minimal config object that oclif commands need
const minimalConfig = {
  root,
  name: pkg.name,
  version: pkg.version,
  channel: "stable",
  bin: pkg.oclif?.bin || "cohe",
  dirname: pkg.oclif?.dirname || "cohe",
  pjson: pkg,
  userPJSON: pkg,
  options: {},
  plugins: new Map(),
  commands: new Map(),
  topics: new Map(),
  valid: true,
  topicSeparator: " ",
  flexibleTaxonomy: true,
  dataDir: join(root, "data"),
  cacheDir: join(root, ".cache"),
  configDir: join(root, ".config"),
  errlog: join(root, ".cache", "error.log"),
  runHook: async () => ({}),
  runCommand: async () => undefined,
  s3Url: () => "",
  scopedEnvVar: (key) => process.env[`COHE_${key}`],
  scopedEnvVarKey: (key) => `COHE_${key}`,
  scopedEnvVarTrue: (key) => process.env[`COHE_${key}`] === "true",
  scopedEnvVarFalse: (key) => process.env[`COHE_${key}`] === "false",
  findCommand: () => undefined,
  findTopic: () => undefined,
  getPluginsList: () => [],
  getAllCommandIDs: () => [],
};

async function runCommand(moduleFn, argv) {
  const module = await moduleFn();
  const CommandClass = module.default;
  const cmd = new CommandClass(argv, minimalConfig);
  await cmd.init();
  await cmd.run();
}

async function main() {
  try {
    // Helper to create absolute path imports
    const importCmd = (path) => import(join(root, path));

    // Map commands to their handlers
    const commandModules = {
      // Simple commands
      version: () => importCmd("src/commands/version.tsx"),
      status: () => importCmd("src/commands/status.tsx"),
      models: () => importCmd("src/commands/models.tsx"),
      test: () => importCmd("src/commands/test.tsx"),
      doctor: () => importCmd("src/commands/doctor.tsx"),
      env: () => importCmd("src/commands/env.tsx"),
      completion: () => importCmd("src/commands/completion.tsx"),
      help: () => importCmd("src/commands/help.tsx"),

      // Interactive commands
      config: () => importCmd("src/commands/config.tsx"),
      switch: () => importCmd("src/commands/switch.tsx"),
      cost: () => importCmd("src/commands/cost.tsx"),
      usage: () => importCmd("src/commands/usage.tsx"),
      history: () => importCmd("src/commands/history.tsx"),

      // Complex commands
      claude: () => importCmd("src/commands/claude.tsx"),
      rotate: () => importCmd("src/commands/rotate.tsx"),
      plugin: () => importCmd("src/commands/plugin.tsx"),

      // Topic commands (index)
      profile: () => importCmd("src/commands/profile/index.tsx"),
      account: () => importCmd("src/commands/account/index.tsx"),
      mcp: () => importCmd("src/commands/mcp/index.tsx"),
      auto: () => importCmd("src/commands/auto/index.tsx"),
      alert: () => importCmd("src/commands/alert/index.tsx"),
      dashboard: () => importCmd("src/commands/dashboard/index.tsx"),
      compare: () => importCmd("src/commands/compare/index.tsx"),
      hooks: () => importCmd("src/commands/hooks/index.tsx"),
    };

    // Topic subcommand mapping
    const topicSubcommands = {
      profile: {
        list: () => importCmd("src/commands/profile/list.tsx"),
        create: () => importCmd("src/commands/profile/create.tsx"),
        switch: () => importCmd("src/commands/profile/switch.tsx"),
        delete: () => importCmd("src/commands/profile/delete.tsx"),
        export: () => importCmd("src/commands/profile/export.tsx"),
      },
      account: {
        list: () => importCmd("src/commands/account/list.tsx"),
        add: () => importCmd("src/commands/account/add.tsx"),
        edit: () => importCmd("src/commands/account/edit.tsx"),
        switch: () => importCmd("src/commands/account/switch.tsx"),
        remove: () => importCmd("src/commands/account/remove.tsx"),
      },
      mcp: {
        list: () => importCmd("src/commands/mcp/list.tsx"),
        add: () => importCmd("src/commands/mcp/add.tsx"),
        remove: () => importCmd("src/commands/mcp/remove.tsx"),
        enable: () => importCmd("src/commands/mcp/enable.tsx"),
        disable: () => importCmd("src/commands/mcp/disable.tsx"),
        "add-predefined": () =>
          importCmd("src/commands/mcp/add-predefined.tsx"),
        export: () => importCmd("src/commands/mcp/export.tsx"),
        test: () => importCmd("src/commands/mcp/test.tsx"),
      },
      auto: {
        enable: () => importCmd("src/commands/auto/enable.tsx"),
        disable: () => importCmd("src/commands/auto/disable.tsx"),
        status: () => importCmd("src/commands/auto/status.tsx"),
        rotate: () => importCmd("src/commands/auto/rotate.tsx"),
        hook: () => {
          // Route auto hook through the loader
          return importCmd("src/commands/loader.ts").then((loader) => {
            return loader.loadCommand("auto", [
              "hook",
              ...commandArgs.slice(1),
            ]);
          });
        },
      },
      alert: {
        list: () => importCmd("src/commands/alert/list.tsx"),
        add: () => importCmd("src/commands/alert/add.tsx"),
        enable: () => importCmd("src/commands/alert/enable.tsx"),
        disable: () => importCmd("src/commands/alert/disable.tsx"),
      },
      dashboard: {
        start: () => importCmd("src/commands/dashboard/start.tsx"),
        stop: () => importCmd("src/commands/dashboard/stop.tsx"),
        status: () => importCmd("src/commands/dashboard/status.tsx"),
      },
      compare: {
        history: () => importCmd("src/commands/compare/history.tsx"),
        view: () => importCmd("src/commands/compare/view.tsx"),
        diff: () => importCmd("src/commands/compare/diff.tsx"),
      },
      hooks: {
        setup: () => importCmd("src/commands/hooks/setup.tsx"),
        uninstall: () => importCmd("src/commands/hooks/uninstall.tsx"),
        status: () => importCmd("src/commands/hooks/status.tsx"),
        "post-tool": () => importCmd("src/commands/hooks/post-tool.tsx"),
        stop: () => importCmd("src/commands/hooks/stop.tsx"),
      },
    };

    // Check if it's a topic command with subcommand
    const subcommand = commandArgs[0];

    // Special case: auto hook routes through loader (for SessionStart hook)
    if (command === "auto" && subcommand === "hook") {
      const { loadCommand } = await importCmd("src/commands/loader.ts");
      await loadCommand("auto", commandArgs);
      return;
    }

    // Check topic subcommands FIRST (before base commands)
    // This ensures commands like "auto rotate" route to the subcommand handler
    if (
      topicSubcommands[command] &&
      subcommand &&
      topicSubcommands[command][subcommand]
    ) {
      await runCommand(
        topicSubcommands[command][subcommand],
        commandArgs.slice(1)
      );
      return;
    }

    // Then check if it's a base command
    if (commandModules[command]) {
      await runCommand(commandModules[command], commandArgs);
      return;
    }

    // Unknown command
    console.error(`Unknown command: ${command}`);
    console.log('Run "cohe help" for available commands.');
    process.exit(1);
  } catch (error) {
    if (
      error.code === "MODULE_NOT_FOUND" ||
      error.code === "ERR_MODULE_NOT_FOUND"
    ) {
      console.error(`Command not found: ${command}`);
      console.log('Run "cohe help" for available commands.');
    } else {
      console.error("Error:", error.message || error);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();
