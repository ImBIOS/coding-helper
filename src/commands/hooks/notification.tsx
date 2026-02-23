import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { Flags } from "@oclif/core";
import { BaseCommand } from "../../oclif/base";

/**
 * Notification hook - Show desktop notifications for Claude Code events.
 *
 * This command reads hook input from stdin to extract transcript information,
 * then shows desktop notifications with the task details.
 *
 * Usage: cohe hooks notification [--message "default message"]
 */
export default class HooksNotification extends BaseCommand<
  typeof HooksNotification
> {
  static description = "Show desktop notifications for Claude Code events";
  static examples = [
    "<%= config.bin %> hooks notification",
    "<%= config.bin %> hooks notification --message 'Task completed'",
  ];

  static flags = {
    message: Flags.string({
      description: "Default message if no transcript found",
      default: "Task completed",
    }),
    silent: Flags.boolean({
      description: "Suppress actual notifications (for testing)",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(HooksNotification);

    // Read hook input from stdin
    let hookInput = "";
    try {
      hookInput = process.stdin.isTTY ? "{}" : readFileSync(0, "utf-8");
    } catch {
      hookInput = "{}";
    }

    let message = flags.message ?? "Task completed";

    // Try to extract transcript path and message from hook input
    try {
      const parsed = JSON.parse(hookInput);
      const transcriptPath = parsed.transcript_path;

      if (transcriptPath && existsSync(transcriptPath)) {
        message = this.extractLastUserMessage(transcriptPath) || message;
      }
    } catch {
      // Use default message if parsing fails
    }

    // Truncate message if too long
    if (message.length > 100) {
      message = `${message.slice(0, 97)}...`;
    }

    if (!flags.silent) {
      this.showNotification(message);
    }
  }

  /**
   * Extract the last user message from a transcript file.
   */
  private extractLastUserMessage(transcriptPath: string): string | null {
    try {
      const content = readFileSync(transcriptPath, "utf-8");
      const lines = content.split("\n").filter(Boolean).reverse();

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.role === "user") {
            const entryContent = entry.content;
            if (Array.isArray(entryContent)) {
              // Content is an array of blocks (text, image, etc.)
              const textBlocks = entryContent
                .filter((b: unknown) => {
                  if (typeof b === "object" && b !== null && "type" in b) {
                    return (b as { type: string }).type === "text";
                  }
                  return false;
                })
                .map((b: unknown) => {
                  if (typeof b === "object" && b !== null && "text" in b) {
                    return (b as { text: string }).text;
                  }
                  return "";
                });
              return textBlocks.join(" ").trim() || null;
            }
            if (typeof entryContent === "string") {
              return entryContent.trim() || null;
            }
            return null;
          }
        } catch {}
      }
    } catch {
      // Return null if file read fails
    }
    return null;
  }

  /**
   * Show desktop notification using available methods.
   */
  private showNotification(message: string): void {
    // Try notify-send (Linux)
    try {
      execSync(
        `notify-send "Claude Code" "${message}" -i dialog-information 2>/dev/null`,
        { stdio: "ignore" }
      );
    } catch {
      // notify-send not available, try osascript (macOS)
    }

    // Try osascript (macOS)
    try {
      execSync(
        `osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "Claude Code"'`,
        { stdio: "ignore" }
      );
    } catch {
      // osascript not available
    }

    // Try paplay for sound (Linux)
    try {
      execSync(
        "paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null",
        { stdio: "ignore" }
      );
    } catch {
      // paplay not available
    }
  }
}
