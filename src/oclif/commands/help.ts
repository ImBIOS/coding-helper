import { readFileSync } from "node:fs";
import { join } from "node:path";
import { info } from "../../utils/logger.js";

export default async function helpCommand(args: string[]) {
  const pkgPath = join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  if (args[0]) {
    // Show help for specific command
    const commandHelps: Record<string, string> = {
      config: `Configure API providers

Usage: imbios config [options]

Options:
  --provider, -p <name>  Provider to configure (zai or minimax)
  --api-key, -k <key>    API key
  --base-url, -u <url>   Base URL
  --model, -m <model>    Default model`,
      switch: `Switch active provider

Usage: imbios switch <provider>

Arguments:
  provider    Provider to switch to (zai or minimax)`,
    };

    if (commandHelps[args[0]]) {
      info(commandHelps[args[0]]);
    } else {
      info(
        `No help available for '${args[0]}'. Run 'imbios help' for general help.`
      );
    }
    return;
  }

  info(`
ImBIOS - Z.AI & MiniMax Provider Manager v${pkg.version}

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

Examples:
  imbios config              # Configure providers
  imbios switch minimax      # Switch to MiniMax
  imbios help                # Show this help

For more info, visit: https://github.com/ImBIOS/coding-helper
`);
}
