import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { error, info, section, success, warning } from "../../utils/logger.js";

export async function handleHooksSetup(): Promise<void> {
  const claudeSettingsPath = path.join(os.homedir(), ".claude");
  const settingsFilePath = path.join(claudeSettingsPath, "settings.json");

  // Hook commands - using cohe CLI directly for auto-updates
  const sessionStartCommand = "cohe auto hook --silent";
  const postToolCommand = "cohe hooks post-tool --silent";
  const stopCommand = "cohe hooks stop --silent";

  try {
    // Read existing settings or create new
    let settings: Record<string, unknown> = {};
    if (fs.existsSync(settingsFilePath)) {
      const content = fs.readFileSync(settingsFilePath, "utf-8");
      try {
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }
    }

    // Initialize hooks object if it doesn't exist
    if (!settings.hooks) {
      settings.hooks = {};
    }

    let hooksInstalled = 0;
    let hooksSkipped = 0;

    // Install SessionStart hook (auto-rotate)
    if (!settings.hooks.SessionStart) {
      settings.hooks.SessionStart = [];
    }
    const sessionStartExists = (
      settings.hooks.SessionStart as Array<unknown>
    ).some(
      (hookConfig: any) =>
        hookConfig.type === "command" &&
        hookConfig.command &&
        (hookConfig.command === sessionStartCommand ||
          hookConfig.command.includes("auto hook") ||
          hookConfig.command.includes("auto-rotate.sh"))
    );
    if (sessionStartExists) {
      hooksSkipped++;
    } else {
      (settings.hooks.SessionStart as Array<unknown>).push({
        matcher: "startup|resume|clear|compact",
        hooks: [
          {
            type: "command",
            command: sessionStartCommand,
          },
        ],
      });
      hooksInstalled++;
    }

    // Install PostToolUse hook (format files)
    if (!settings.hooks.PostToolUse) {
      settings.hooks.PostToolUse = [];
    }
    const postToolExists = (settings.hooks.PostToolUse as Array<unknown>).some(
      (hookConfig: any) =>
        hookConfig.type === "command" &&
        hookConfig.command &&
        hookConfig.command.includes("hooks post-tool")
    );
    if (postToolExists) {
      hooksSkipped++;
    } else {
      (settings.hooks.PostToolUse as Array<unknown>).push({
        matcher: "Write|Edit",
        hooks: [
          {
            type: "command",
            command: postToolCommand,
          },
        ],
      });
      hooksInstalled++;
    }

    // Install Stop hook (notifications)
    if (!settings.hooks.Stop) {
      settings.hooks.Stop = [];
    }
    const stopExists = (settings.hooks.Stop as Array<unknown>).some(
      (hookConfig: any) =>
        hookConfig.type === "command" &&
        hookConfig.command &&
        hookConfig.command.includes("hooks stop")
    );
    if (stopExists) {
      hooksSkipped++;
    } else {
      (settings.hooks.Stop as Array<unknown>).push({
        hooks: [
          {
            type: "command",
            command: stopCommand,
          },
        ],
      });
      hooksInstalled++;
    }

    // Write updated settings
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));

    section("Hooks Setup");
    success(
      `Installed ${hooksInstalled} hook(s), ${hooksSkipped} already present.`
    );
    info(`Settings location: ${settingsFilePath}`);
    info("");
    info("Installed hooks:");
    info("  • SessionStart: Auto-rotate API keys on startup");
    info("  • PostToolUse: Format files after Write|Edit");
    info("  • Stop: Notifications + commit prompt on session end");
    info("");
    info(
      "Uses the cohe CLI directly, so all hooks auto-update with the package."
    );
  } catch (err: any) {
    section("Hooks Setup");
    error("Failed to install hooks");
    error(err.message);
  }
}

export async function handleHooksUninstall(): Promise<void> {
  const settingsFilePath = path.join(os.homedir(), ".claude", "settings.json");
  const hooksDir = path.join(os.homedir(), ".claude", "hooks");
  const hookScriptPath = path.join(hooksDir, "auto-rotate.sh");

  try {
    let hookRemoved = false;
    let settingsModified = false;
    let hooksRemoved = 0;

    // Remove legacy hook script if it exists
    if (fs.existsSync(hookScriptPath)) {
      fs.unlinkSync(hookScriptPath);
      hookRemoved = true;
    }

    // Update settings.json to remove all cohe hooks
    if (fs.existsSync(settingsFilePath)) {
      const content = fs.readFileSync(settingsFilePath, "utf-8");
      let settings: Record<string, unknown>;

      try {
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }

      const hookTypes = ["SessionStart", "PostToolUse", "Stop"] as const;

      for (const hookType of hookTypes) {
        if (settings.hooks?.[hookType]) {
          const originalLength = (settings.hooks[hookType] as Array<unknown>)
            .length;

          (settings.hooks[hookType] as Array<unknown>) = (
            settings.hooks[hookType] as Array<unknown>
          ).filter((hookGroup: any) => {
            if (!(hookGroup.hooks && Array.isArray(hookGroup.hooks))) {
              return true;
            }

            const hasOurHook = hookGroup.hooks.some((hookConfig: any) => {
              if (hookConfig.type !== "command" || !hookConfig.command) {
                return false;
              }

              const cmd = hookConfig.command;
              return (
                cmd === hookScriptPath ||
                cmd.includes("auto-rotate.sh") ||
                cmd.includes("auto hook") ||
                cmd === "cohe auto hook --silent" ||
                cmd.includes("hooks post-tool") ||
                cmd.includes("hooks stop")
              );
            });

            return !hasOurHook;
          });

          if (
            (settings.hooks[hookType] as Array<unknown>).length !==
            originalLength
          ) {
            hooksRemoved +=
              originalLength -
              (settings.hooks[hookType] as Array<unknown>).length;
            settingsModified = true;

            // Clean up empty arrays
            if ((settings.hooks[hookType] as Array<unknown>).length === 0) {
              delete settings.hooks[hookType];
            }
          }
        }
      }

      // Clean up empty hooks object
      if (settings.hooks && Object.keys(settings.hooks).length === 0) {
        settings.hooks = undefined;
      }

      if (settingsModified) {
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
      }
    }

    section("Hooks Uninstall");

    if (!(hookRemoved || settingsModified)) {
      info("No cohe hooks found.");
      info("Hooks may have already been removed or were never installed.");
      return;
    }

    success(`Removed ${hooksRemoved} hook(s).`);

    if (hookRemoved) {
      info("Removed legacy hook script");
    }
    if (settingsModified) {
      info(`Updated Claude settings: ${settingsFilePath}`);
    }

    info("");
    info(
      "Auto-rotation, formatting, and notifications are no longer automatic."
    );
    info("To re-enable hooks, run 'cohe hooks setup'.");
  } catch (err: any) {
    section("Hooks Uninstall");
    error("Failed to uninstall hooks");
    error(err.message);
  }
}

export async function handleHooksStatus(): Promise<void> {
  const settingsFilePath = path.join(os.homedir(), ".claude", "settings.json");
  const hooksDir = path.join(os.homedir(), ".claude", "hooks");
  const hookScriptPath = path.join(hooksDir, "auto-rotate.sh");

  const scriptExists = fs.existsSync(hookScriptPath);
  const scriptExecutable =
    scriptExists && (fs.statSync(hookScriptPath).mode & 0o755) !== 0;

  interface HookStatus {
    name: string;
    command: string;
    registered: boolean;
    hookType: string;
  }

  const hooks: HookStatus[] = [
    {
      name: "SessionStart",
      command: "cohe auto hook --silent",
      registered: false,
      hookType: "auto-rotate",
    },
    {
      name: "PostToolUse",
      command: "cohe hooks post-tool --silent",
      registered: false,
      hookType: "format",
    },
    {
      name: "Stop",
      command: "cohe hooks stop --silent",
      registered: false,
      hookType: "notify",
    },
  ];

  let settingsFound = false;
  let rotationEnabled = false;
  let rotationStrategy = "unknown";

  if (fs.existsSync(settingsFilePath)) {
    try {
      const content = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(content);
      settingsFound = true;

      for (const hook of hooks) {
        if (settings.hooks?.[hook.name]) {
          (settings.hooks[hook.name] as Array<unknown>).forEach(
            (hookGroup: any) => {
              if (hookGroup.hooks && Array.isArray(hookGroup.hooks)) {
                hookGroup.hooks.forEach((hookConfig: any) => {
                  if (
                    hookConfig.type === "command" &&
                    hookConfig.command &&
                    (hookConfig.command.includes(hook.command.split(" ")[1]) ||
                      hookConfig.command.includes(hook.hookType))
                  ) {
                    hook.registered = true;
                  }
                });
              }
            }
          );
        }
      }
    } catch {
      // Invalid JSON
    }
  }

  // Check rotation config
  const configPath = path.join(os.homedir(), ".claude", "imbios.json");
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent);
      rotationEnabled = config.rotation?.enabled ?? false;
      rotationStrategy = config.rotation?.strategy ?? "unknown";
    } catch {
      // Invalid JSON
    }
  }

  const allHooksInstalled = hooks.every((h) => h.registered);
  const someHooksInstalled = hooks.some((h) => h.registered);

  section("Hooks Status");

  console.log(
    `Overall Status: ${allHooksInstalled ? "✓ All Installed" : someHooksInstalled ? "⚠ Partial" : "✗ Not Installed"}`
  );

  console.log("");
  console.log("Installed Hooks:");
  for (const hook of hooks) {
    const status = hook.registered ? "✓" : "○";
    const typeLabel = {
      "auto-rotate": "Auto-rotate",
      format: "Format files",
      notify: "Notifications",
    }[hook.hookType];
    console.log(`  ${status} ${hook.name}: ${typeLabel}`);
    if (hook.registered) {
      console.log(`    ${hook.command}`);
    }
  }

  console.log("");
  console.log(
    `Legacy Hook Script: ${scriptExists ? (scriptExecutable ? "✓ Found" : "⚠ Not Executable") : "○ Not Found"}`
  );
  if (scriptExists) {
    console.log(`  ${hookScriptPath}`);
  }

  console.log("");
  console.log(`Registered in Settings: ${settingsFound ? "✓ Yes" : "✗ No"}`);
  if (settingsFound && !someHooksInstalled) {
    console.log(`  ${settingsFilePath}`);
  }

  console.log("");
  console.log(`Rotation Enabled: ${rotationEnabled ? "✓ Yes" : "○ No"}`);
  console.log(`Rotation Strategy: ${rotationStrategy}`);

  console.log("");
  if (!allHooksInstalled) {
    warning(`Run 'cohe hooks setup' to install missing hooks.`);
  } else if (rotationEnabled) {
    success("All hooks are installed and rotation is enabled!");
  } else {
    warning(
      "Hooks installed but rotation is disabled. Run 'cohe auto enable'."
    );
  }
}
