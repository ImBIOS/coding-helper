#!/usr/bin/env bun
//===============================================================================
// Session End Hook - Notifications + Commit Prompt
// Sends desktop notifications and prompts to commit uncommitted changes
//===============================================================================

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { Box, Text } from "ink";
import { BaseCommand } from "../../oclif/base.js";
import { Info, Section, Warning } from "../../ui/index.js";

interface StopOptions {
  silent: boolean;
  verbose: boolean;
}

interface TranscriptEntry {
  role?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

function extractMessageFromTranscript(
  transcriptPath: string,
  maxLength = 100
): string {
  if (!existsSync(transcriptPath)) {
    return "Task completed";
  }

  try {
    const content = fs.readFileSync(transcriptPath, "utf-8");
    const lines = content.trim().split("\n");

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const entry: TranscriptEntry = JSON.parse(line);

        // Handle different transcript formats
        let role = "";
        let content: unknown = null;

        // Try new format (entry.message)
        if (entry.message && typeof entry.message === "object") {
          role = entry.message.role || "";
          content = entry.message.content;
        }
        // Try old format (entry.role)
        else if (entry.role) {
          role = entry.role;
          content = entry.content;
        }

        if (role === "user" && content !== null) {
          let message = "";

          if (Array.isArray(content)) {
            const textParts: string[] = [];
            for (const block of content) {
              if (block && typeof block === "object") {
                const text = block.text || "";
                if (text) textParts.push(text);
              } else if (typeof block === "string") {
                textParts.push(block);
              }
            }
            message = textParts.join(" ");
          } else if (typeof content === "string") {
            message = content;
          } else if (content !== null) {
            message = String(content);
          }

          if (message.length > maxLength) {
            message = message.slice(0, maxLength - 3) + "...";
          }
          return message;
        }
      } catch {}
    }
  } catch {
    // Ignore errors reading transcript
  }

  return "Task completed";
}

function sendNotification(title: string, message: string): void {
  // Try notify-send (Linux)
  if (existsSync("/usr/bin/notify-send")) {
    spawn(
      "/usr/bin/notify-send",
      [title, message, "-i", "dialog-information"],
      {
        stdio: "ignore",
        detached: true,
      }
    );
    return;
  }

  // Try osascript (macOS)
  if (existsSync("/usr/bin/osascript")) {
    spawn(
      "/usr/bin/osascript",
      ["-e", `display notification "${message}" with title "${title}"`],
      { stdio: "ignore", detached: true }
    );
    return;
  }

  // TODO: Fallback, write to console only in verbose mode
}

function playSound(): void {
  // Try paplay (PipeWire/PulseAudio on Linux)
  if (existsSync("/usr/bin/paplay")) {
    const soundPath = "/usr/share/sounds/freedesktop/stereo/complete.oga";
    if (existsSync(soundPath)) {
      spawn("/usr/bin/paplay", [soundPath], {
        stdio: "ignore",
        detached: true,
      });
      return;
    }
  }

  // Try aplay (ALSA fallback)
  if (existsSync("/usr/bin/aplay")) {
    const soundPath = "/usr/share/sounds/alsa/Front_Center.wav";
    if (existsSync(soundPath)) {
      spawn("/usr/bin/aplay", [soundPath], { stdio: "ignore", detached: true });
    }
  }
}

function hasUncommittedChanges(): {
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
} {
  const gitDir = path.join(process.cwd(), ".git");
  if (!existsSync(gitDir)) {
    return { staged: false, unstaged: false, untracked: false };
  }

  try {
    // Check for staged changes
    const statusResult = spawn("git", ["status", "--porcelain"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let statusOutput = "";
    statusResult.stdout.on("data", (data) => (statusOutput += data.toString()));

    return new Promise((resolve) => {
      statusResult.on("close", () => {
        const lines = statusOutput.trim().split("\n").filter(Boolean);
        let staged = false;
        let unstaged = false;
        let untracked = false;

        for (const line of lines) {
          const status = line.slice(0, 2);
          const firstChar = status[0];
          const secondChar = status[1];

          if (firstChar === "A" || firstChar === "M" || secondChar === "M") {
            staged = true;
          }
          if (firstChar === " " || secondChar === " ") {
            unstaged = true;
          }
          if (firstChar === "?" || secondChar === "?") {
            untracked = true;
          }
        }

        resolve({ staged, unstaged, untracked });
      });
      statusResult.on("error", () => {
        resolve({ staged: false, unstaged: false, untracked: false });
      });
    });
  } catch {
    return { staged: false, unstaged: false, untracked: false };
  }
}

function runGitCommand(
  args: string[]
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    proc.stdout.on("data", (data) => (output += data.toString()));
    proc.stderr.on("data", (data) => (output += data.toString()));
    proc.on("close", (code) => {
      resolve({ success: code === 0, output });
    });
    proc.on("error", () => {
      resolve({ success: false, output: "" });
    });
  });
}

async function stageAndCommit(message: string): Promise<boolean> {
  // Stage all changes (tracked + untracked)
  const addResult = await runGitCommand(["add", "-A"]);
  if (!addResult.success) return false;

  // Create commit
  const commitResult = await runGitCommand([
    "commit",
    "-m",
    `WIP: ${message}`,
    "--no-gpg-sign",
  ]);

  return commitResult.success;
}

export default class HooksStop extends BaseCommand<typeof HooksStop> {
  static description = "Session end hook - notifications and commit prompt";

  static examples = [
    "<%= config.bin %> hooks stop",
    "cohe hooks stop --silent",
  ];

  static flags = {
    silent: {
      description: "Run silently without output",
      shorthand: "s",
      type: "boolean",
    },
    verbose: {
      description: "Show detailed output",
      shorthand: "v",
      type: "boolean",
    },
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(HooksStop);
    const options: StopOptions = {
      silent: flags.silent ?? false,
      verbose: flags.verbose ?? false,
    };

    // Get transcript path from stdin
    let transcriptPath = "";
    try {
      const stdin = fs.readFileSync("/dev/stdin", "utf-8");
      const input = JSON.parse(stdin);
      transcriptPath = input.transcript_path || "";
    } catch {
      // Not JSON or no stdin
    }

    // Extract message from transcript
    const message = extractMessageFromTranscript(transcriptPath, 100);

    // Send notification and play sound
    if (!options.silent || options.verbose) {
      sendNotification("Claude Code", message);
      playSound();
    }

    // Check for uncommitted changes
    const changes = hasUncommittedChanges();
    const hasChanges = changes.staged || changes.unstaged || changes.untracked;

    if (options.silent) {
      // Just notify and exit
      return;
    }

    // In non-silent mode, show summary
    await this.renderApp(
      <Section title="Session Complete">
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>{message}</Text>
          </Box>

          {hasChanges && (
            <Box marginTop={1}>
              <Warning>
                You have uncommitted changes. Commit with "cohe hooks stop
                --commit" or use "git commit" manually.
              </Warning>
            </Box>
          )}

          {options.verbose && (
            <Box flexDirection="column" marginTop={1}>
              <Info>Git status:</Info>
              <Box marginLeft={2}>
                <Text>
                  Staged: {changes.staged ? "Yes" : "No"} | Unstaged:{" "}
                  {changes.unstaged ? "Yes" : "No"} | Untracked:{" "}
                  {changes.untracked ? "Yes" : "No"}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Section>
    );
  }
}
