import * as fs from "node:fs";
import * as settings from "../../config/settings.js";
import { getEnvPath } from "../../config/env.js";
import {
  error,
  info,
  section,
  success,
  table,
  warning,
} from "../../utils/logger.js";

export default async function doctorCommand() {
  section("ImBIOS Doctor");

  const issues: string[] = [];
  const checks: Record<string, { status: boolean; message: string }> = {};

  // Check active provider configuration
  const activeProvider = settings.getActiveProvider();
  const activeConfig = settings.getProviderConfig(activeProvider);

  checks["Active provider configured"] = {
    status: !!activeConfig.apiKey,
    message: activeProvider.toUpperCase(),
  };

  if (!activeConfig.apiKey) {
    issues.push(`Active provider (${activeProvider}) is not configured`);
  }

  // Check ZAI configuration
  const zaiConfig = settings.getProviderConfig("zai");
  checks["ZAI configured"] = {
    status: !!zaiConfig.apiKey,
    message: zaiConfig.apiKey ? "Configured" : "Not configured",
  };

  // Check MiniMax configuration
  const minimaxConfig = settings.getProviderConfig("minimax");
  checks["MiniMax configured"] = {
    status: !!minimaxConfig.apiKey,
    message: minimaxConfig.apiKey ? "Configured" : "Not configured",
  };

  // Check config file exists
  const configPath = settings.getConfigPath();
  checks["Config file exists"] = {
    status: fs.existsSync(configPath),
    message: configPath,
  };

  // Check environment variables
  const envPath = getEnvPath();
  checks["Env file exists"] = {
    status: fs.existsSync(envPath),
    message: envPath,
  };

  // Display results
  table(checks);

  if (issues.length > 0) {
    info("");
    warning("Issues found:");
    issues.forEach((issue) => error(`  - ${issue}`));
    info("");
    info("To fix: Run 'imbios config' to configure your API providers.");
  } else {
    info("");
    success("All checks passed!");
  }
}
