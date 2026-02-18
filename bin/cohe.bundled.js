#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/commands/loader.ts
var exports_loader = {};
__export(exports_loader, {
  loadCommand: () => loadCommand
});
async function loadCommand(_command, _args) {}

// src/cli.ts
var CLIController = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  try {
    const { loadCommand: loadCommand2 } = await Promise.resolve().then(() => exports_loader);
    await loadCommand2(command, args.slice(1));
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      console.error(`Unknown command: ${command}`);
      console.log('Run "cohe help" for available commands.');
    } else {
      console.error("Error:", error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
};
CLIController();
