#!/usr/bin/env node

const CLIController = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  const commands: Record<string, string[]> = {
    config: ["config"],
    switch: ["switch", args[1]],
    status: ["status"],
    usage: ["usage"],
    history: ["history"],
    cost: ["cost", args[1]],
    test: ["test"],
    plugin: ["plugin", args[1]],
    doctor: ["doctor"],
    env: ["env", args[1]],
    models: ["models", args[1]],
    help: ["help"],
    version: ["version"],
  };

  try {
    const { loadCommand } = await import("./commands/loader.js");
    await loadCommand(command, args.slice(1));
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot find module")
    ) {
      console.error(`Unknown command: ${command}`);
      console.log('Run "imbios help" for available commands.');
    } else {
      console.error(
        "Error:",
        error instanceof Error ? error.message : String(error)
      );
    }
    process.exit(1);
  }
};

CLIController();
