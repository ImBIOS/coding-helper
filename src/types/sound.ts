/**
 * Sound system types for hook notifications
 *
 * This module defines types for the sound effect flavor system
 * that allows customization of sounds across different hook events.
 */

export type SoundFlavor =
  | "default"
  | "warcraft"
  | "retro"
  | "classic-doom"
  | "pokemon"
  | "zelda";

/**
 * Hook events that can trigger sounds
 */
export type SoundHook = "stop" | "post-tool" | "session-start";

/**
 * Sound event types
 */
export type SoundEvent = "complete" | "error" | "start";

/**
 * Mapping of hook types to their corresponding sound events
 */
export const HOOK_SOUND_EVENTS: Record<SoundHook, SoundEvent> = {
  stop: "complete",
  "post-tool": "complete",
  "session-start": "start",
} as const;

/**
 * Sound configuration
 */
export interface SoundConfig {
  flavor: SoundFlavor;
  enabled: boolean;
  volume: number;
  customPaths?: Partial<Record<SoundFlavor, Record<string, string>>>;
}

/**
 * Sound file paths for each flavor
 * Maps flavor -> sound event -> filename
 */
export interface SoundFlavorPaths {
  [flavor: string]: {
    [event: string]: string;
  };
}

/**
 * Available sound pack information
 */
export interface SoundPackInfo {
  flavor: SoundFlavor;
  name: string;
  description: string;
  events: SoundEvent[];
}
