#!/usr/bin/env bun

// Global Multi-Language Code Formatter (TypeScript Version)
//
// Primary: Biome (JS / TS / JSX / JSON / CSS / GraphQL)
//
// Fallbacks: Language-specific formatters for other languages

// Colors
const colors = {
  RED: "\x1b[0;31m",
  GREEN: "\x1b[0;32m",
  YELLOW: "\x1b[0;33m",
  BLUE: "\x1b[0;34m",
  NC: "\x1b[0m",
};

// Top-level regex for performance
const FILE_EXT_REGEX = /\.[^/.]+$/;

function isTty(): boolean {
  return Bun.stdout?.isTTY ?? false;
}

function logInfo(...args: string[]): void {
  if (isTty()) {
    console.log(`${colors.BLUE}[info]${colors.NC}`, ...args);
  } else {
    console.log("[info]", ...args);
  }
}

function logSuccess(...args: string[]): void {
  if (isTty()) {
    console.log(`${colors.GREEN}[ok]${colors.NC}`, ...args);
  } else {
    console.log("[ok]", ...args);
  }
}

function logWarn(...args: string[]): void {
  if (isTty()) {
    console.log(`${colors.YELLOW}[warn]${colors.NC}`, ...args);
  } else {
    console.log("[warn]", ...args);
  }
}

function logError(...args: string[]): void {
  if (isTty()) {
    console.log(`${colors.RED}[error]${colors.NC}`, ...args);
  } else {
    console.log("[error]", ...args);
  }
}

function hasCommand(cmd: string): boolean {
  try {
    const which = spawn("which", [cmd], { stdio: "ignore" });
    return which.wait()?.exitCode === 0;
  } catch {
    return false;
  }
}

async function formatBiome(file: string): Promise<boolean> {
  if (hasCommand("biome")) {
    const proc = spawn("biome", ["format", "--write", file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

async function formatGo(file: string): Promise<boolean> {
  if (hasCommand("gofmt")) {
    const proc = spawn("gofmt", ["-w", file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

async function formatRust(file: string): Promise<boolean> {
  if (hasCommand("rustfmt")) {
    const proc = spawn("rustfmt", [file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

async function formatPython(file: string): Promise<boolean> {
  if (hasCommand("black")) {
    const proc = spawn("black", [file], { stdio: "pipe" });
    await proc.exited;
  }
  if (hasCommand("isort")) {
    const proc = spawn("isort", [file], { stdio: "pipe" });
    await proc.exited;
  }
  return true;
}

async function formatC(file: string): Promise<boolean> {
  if (hasCommand("clang-format")) {
    const proc = spawn("clang-format", ["-i", file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

async function formatShell(file: string): Promise<boolean> {
  if (hasCommand("shfmt")) {
    const proc = spawn("shfmt", ["-w", "-i", "2", file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

function formatJson(file: string): boolean {
  try {
    const content = readFileSync(file, "utf-8");
    const parsed = JSON.parse(content);
    writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

async function formatYaml(file: string): Promise<boolean> {
  if (hasCommand("yq")) {
    const proc = spawn("yq", ["eval", "-i", file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

async function formatToml(file: string): Promise<boolean> {
  if (hasCommand("taplo")) {
    const proc = spawn("taplo", ["fmt", file], { stdio: "pipe" });
    await proc.exited;
    return true;
  }
  return false;
}

async function formatFile(file: string): Promise<boolean> {
  if (!(existsSync(file) && existsSync(file))) {
    return false;
  }

  const filename = basename(file);
  const ext = extname(file).slice(1).toLowerCase();
  const base = filename.replace(FILE_EXT_REGEX, "");

  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
    case "ts":
    case "mts":
    case "cts":
    case "jsx":
    case "tsx":
    case "json":
    case "jsonc":
    case "json5":
    case "css":
    case "scss":
    case "sass":
    case "less":
    case "gql":
    case "graphql":
      return await formatBiome(file);

    case "go":
      return await formatGo(file);

    case "rs":
      return await formatRust(file);

    case "py":
    case "pyi":
      return await formatPython(file);

    case "c":
    case "cpp":
    case "cxx":
    case "cc":
    case "h":
    case "hpp":
    case "hxx":
    case "m":
    case "mm":
      return await formatC(file);

    case "sh":
    case "bash":
    case "zsh":
    case "fish":
      return await formatShell(file);

    case "yaml":
    case "yml":
      return await formatYaml(file);

    case "toml":
      return await formatToml(file);

    case "md":
    case "markdown":
      // Minimal markdown handling
      return true;

    default:
      return false;
  }
}

function extractFilePathFromJson(input: string): string | null {
  try {
    const data = JSON.parse(input);

    // Try top-level keys
    for (const key of ["file_path", "path", "file", "destination", "target"]) {
      if (key in data && typeof data[key] === "string") {
        return data[key];
      }
    }

    // Try nested tool_input
    if ("tool_input" in data && typeof data.tool_input === "object") {
      for (const key of [
        "file_path",
        "path",
        "file",
        "destination",
        "target",
      ]) {
        if (
          key in data.tool_input &&
          typeof data.tool_input[key] === "string"
        ) {
          return data.tool_input[key];
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const files: string[] = [];
  let formatAll = false;
  let verbose = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all" || arg === "-a") {
      formatAll = true;
    } else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: format_files.ts [--all] [--verbose] [files...]

Options:
  --all, -a     Format all files in current directory (non-recursive)
  --verbose, -v  Show detailed output
  --help, -h     Show this help message

Supported languages:
  Primary: JavaScript, TypeScript, JSX, JSON, CSS, GraphQL (via Biome)
  Fallbacks: Go, Rust, Python, C/C++, Shell, YAML, TOML, etc.
`);
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      files.push(arg);
    }
  }

  // If no files and not interactive, read from stdin
  if (files.length === 0 && !formatAll && !process.stdin.isTTY) {
    const stdin = await Bun.readableStreamText(Bun.stdin);
    const filePath = await extractFilePathFromJson(stdin);
    if (filePath && existsSync(filePath)) {
      files.push(filePath);
    } else {
      logError("Could not determine file path from input");
      process.exit(1);
    }
  }

  // Format all files in current directory
  if (formatAll) {
    const currentDir = process.cwd();
    const entries = await Bun.glob("*").run({ cwd: currentDir });
    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(join(currentDir, entry.name));
      }
    }
  }

  let formattedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    if (existsSync(file)) {
      if (verbose) {
        logInfo(`Formatting: ${file}`);
      }

      const success = await formatFile(file);
      if (success) {
        formattedCount++;
      } else {
        errorCount++;
      }
    }
  }

  if (verbose || errorCount > 0) {
    if (formattedCount > 0) {
      logSuccess(`Formatted ${formattedCount} file(s)`);
    }
    if (errorCount > 0) {
      logError(`${errorCount} file(s) could not be formatted`);
    }
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main();
