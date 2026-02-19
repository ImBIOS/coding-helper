/**
 * Sound playback and flavor management module
 *
 * Provides sound playback functionality for hooks with support for
 * multiple sound flavor themes. Falls back to system sounds when
 * custom sound packs are not available.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getSoundConfig } from "../config/accounts-config";
import type { SoundEvent, SoundFlavor, SoundHook } from "../types/sound";
import { HOOK_SOUND_EVENTS } from "../types/sound";

/**
 * Get the sounds directory path (~/.claude/sounds/)
 */
export function getSoundsDir(): string {
  const homeDir = process.env.HOME || homedir();
  return join(homeDir, ".claude", "sounds");
}

/**
 * Get the path to a sound file for a given flavor and event
 *
 * @param flavor - The sound flavor (default, warcraft, retro, etc.)
 * @param event - The sound event (complete, error, start)
 * @returns Path to the sound file, or null if not found
 */
export function getSoundPath(
  flavor: SoundFlavor,
  event: SoundEvent
): string | null {
  const soundsDir = getSoundsDir();
  const flavorDir = join(soundsDir, flavor);

  // Check if flavor directory exists
  if (!existsSync(flavorDir)) {
    return null;
  }

  // Try different file extensions
  const extensions = [".ogg", ".wav", ".mp3"];
  for (const ext of extensions) {
    const soundPath = join(flavorDir, `${event}${ext}`);
    if (existsSync(soundPath)) {
      return soundPath;
    }
  }

  return null;
}

/**
 * Get a fallback system sound path
 * Used when custom sound packs are not installed
 */
function getFallbackSoundPath(): string | null {
  const systemSounds = [
    // Linux (Freedesktop)
    "/usr/share/sounds/freedesktop/stereo/complete.oga",
    "/usr/share/sounds/freedesktop/stereo/dialog-information.oga",
    "/usr/share/sounds/freedesktop/stereo/service-login.oga",
    // Linux (PulseAudio)
    "/usr/share/sounds/PulseAudio/audio-volume-change.ogg",
    // Linux (ALSA)
    "/usr/share/sounds/alsa/Front_Center.wav",
    "/usr/share/sounds/alsa/Noise.wav",
    // macOS
    "/System/Library/Sounds/Glass.aiff",
    "/System/Library/Sounds/Pop.aiff",
    "/System/Library/Sounds/Submarine.aiff",
    // Windows (via WSL or if present)
    "/mnt/c/Windows/Media/Windows Notify Calendar.wav",
  ];

  for (const path of systemSounds) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Play a sound file using the best available player
 *
 * @param soundPath - Path to the sound file
 * @param volume - Volume level (0-1)
 */
export function playSoundFile(soundPath: string, _volume = 0.7): void {
  // Try different players based on the platform
  const players = [
    // Linux (PipeWire/PulseAudio)
    { cmd: "/usr/bin/paplay", args: (p: string) => [p] },
    // Linux (ALSA)
    { cmd: "/usr/bin/aplay", args: (p: string) => [p] },
    // macOS
    { cmd: "/usr/bin/afplay", args: (p: string) => [p] },
    // Linux (sox)
    { cmd: "/usr/bin/play", args: (p: string) => ["-q", p] },
  ];

  for (const player of players) {
    if (existsSync(player.cmd)) {
      try {
        const args = player.args(soundPath);
        const proc = spawn(player.cmd, args, {
          stdio: "ignore",
          detached: true,
        });
        proc.unref();
        return;
      } catch {
        // Try next player
      }
    }
  }

  // If no player worked, try a simple fallback
  try {
    // Last resort: try using 'play' from ImageMagick or sox
    const fallback = spawn(
      "sh",
      ["-c", `cat "${soundPath}" > /dev/null 2>&1 &`],
      {
        stdio: "ignore",
        detached: true,
      }
    );
    fallback.unref();
  } catch {
    // Silent fail - sound is non-critical
  }
}

/**
 * Play a sound for a specific hook
 *
 * @param hook - The hook type (stop, post-tool, session-start)
 * @param config - Optional sound config (uses loaded config if not provided)
 */
export function playHookSound(
  hook: SoundHook,
  config?: { flavor: SoundFlavor; enabled: boolean; volume: number }
): void {
  const soundConfig = config ?? getSoundConfig();

  // Check if sound is enabled
  if (!soundConfig.enabled) {
    return;
  }

  const event = HOOK_SOUND_EVENTS[hook];

  // First try to find custom sound for the configured flavor
  const customPath = getSoundPath(soundConfig.flavor, event);

  if (customPath) {
    playSoundFile(customPath, soundConfig.volume);
    return;
  }

  // Fall back to system sounds if custom sound not found
  const fallbackPath = getFallbackSoundPath();
  if (fallbackPath) {
    playSoundFile(fallbackPath, soundConfig.volume);
  }
}

/**
 * List available sound flavors (directories in ~/.claude/sounds/)
 */
export function getAvailableFlavors(): SoundFlavor[] {
  const soundsDir = getSoundsDir();

  if (!existsSync(soundsDir)) {
    return ["default"];
  }

  try {
    const entries = readdirSync(soundsDir, { withFileTypes: true });
    const flavors: SoundFlavor[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Validate it's a known flavor
        const validFlavors: SoundFlavor[] = [
          "default",
          "warcraft",
          "retro",
          "classic-doom",
          "pokemon",
          "zelda",
        ];
        if (validFlavors.includes(entry.name as SoundFlavor)) {
          flavors.push(entry.name as SoundFlavor);
        }
      }
    }

    // Always include default
    if (!flavors.includes("default")) {
      flavors.unshift("default");
    }

    return flavors;
  } catch {
    return ["default"];
  }
}

/**
 * Ensure the sounds directory exists
 */
export function ensureSoundsDir(): void {
  const soundsDir = getSoundsDir();
  if (!existsSync(soundsDir)) {
    mkdirSync(soundsDir, { recursive: true });
  }
}

/**
 * Get the default sound events for a flavor
 */
export function getSoundEventsForFlavor(_flavor: SoundFlavor): SoundEvent[] {
  return ["complete", "error", "start"];
}
