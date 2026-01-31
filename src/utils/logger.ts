export type LogLevel = "info" | "success" | "warning" | "error" | "debug";

const COLORS = {
  info: "\x1b[36m", // Cyan
  success: "\x1b[32m", // Green
  warning: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  debug: "\x1b[90m", // Gray
  reset: "\x1b[0m",
};

const LEVEL_PREFIXES: Record<LogLevel, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
  debug: "↪",
};

export function log(message: string, level: LogLevel = "info"): void {
  const color = COLORS[level];
  const prefix = LEVEL_PREFIXES[level];
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(
    `${color}[${timestamp}] ${prefix}${level === "debug" ? "" : ""} ${message}${COLORS.reset}`
  );
}

export function success(message: string): void {
  log(message, "success");
}

export function info(message: string): void {
  log(message, "info");
}

export function warning(message: string): void {
  log(message, "warning");
}

export function error(message: string): void {
  log(message, "error");
}

export function debug(message: string): void {
  log(message, "debug");
}

export function table(data: Record<string, string | number>): void {
  const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));
  const maxValLength = Math.max(
    ...Object.values(data).map((v) => String(v).length)
  );

  Object.entries(data).forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    const paddedVal = String(value).padStart(maxValLength);
    console.log(`  ${paddedKey}  →  ${paddedVal}`);
  });
}

export function section(title: string): void {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(50));
}

export function divider(): void {
  console.log("");
}
