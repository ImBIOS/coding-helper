const COLORS = {
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    warning: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    debug: "\x1b[90m", // Gray
    reset: "\x1b[0m",
};
const LEVEL_PREFIXES = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✗",
    debug: "↪",
};
export function log(message, level = "info") {
    const color = COLORS[level];
    const prefix = LEVEL_PREFIXES[level];
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    console.log(`${color}[${timestamp}] ${prefix}${level === "debug" ? "" : ""} ${message}${COLORS.reset}`);
}
export function success(message) {
    log(message, "success");
}
export function info(message) {
    log(message, "info");
}
export function warning(message) {
    log(message, "warning");
}
export function error(message) {
    log(message, "error");
}
export function debug(message) {
    log(message, "debug");
}
export function table(data) {
    const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));
    const maxValLength = Math.max(...Object.values(data).map((v) => String(v).length));
    Object.entries(data).forEach(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLength);
        const paddedVal = String(value).padStart(maxValLength);
        console.log(`  ${paddedKey}  →  ${paddedVal}`);
    });
}
export function section(title) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  ${title}`);
    console.log("─".repeat(50));
}
export function divider() {
    console.log("");
}
