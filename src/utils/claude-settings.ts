import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface ClaudeSettings {
  env?: {
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_BASE_URL?: string;
    [key: string]: string | number | undefined;
  };
  [key: string]: unknown;
}

let _cached: ClaudeSettings | null = null;

/**
 * Read ~/.claude/settings.json and return parsed contents.
 * Cached after first read within the same process.
 */
export function getClaudeSettings(): ClaudeSettings {
  if (_cached) return _cached;

  const settingsPath = join(
    process.env.HOME || homedir(),
    ".claude",
    "settings.json"
  );

  try {
    if (existsSync(settingsPath)) {
      _cached = JSON.parse(readFileSync(settingsPath, "utf-8"));
      return _cached as ClaudeSettings;
    }
  } catch {
    // Fall through
  }

  _cached = {};
  return _cached;
}

/**
 * Get Anthropic API credentials from ~/.claude/settings.json env section.
 */
export function getAnthropicCredentials(): {
  apiKey: string;
  baseURL: string | undefined;
} {
  const settings = getClaudeSettings();
  return {
    apiKey: String(settings.env?.ANTHROPIC_AUTH_TOKEN || ""),
    baseURL: settings.env?.ANTHROPIC_BASE_URL
      ? String(settings.env.ANTHROPIC_BASE_URL)
      : undefined,
  };
}
