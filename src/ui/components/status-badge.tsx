import { Text } from "ink";
import type React from "react";

type LogLevel = "trace" | "debug" | "info" | "success" | "warning" | "error";

type LevelColor = "magenta" | "gray" | "cyan" | "green" | "yellow" | "red";

interface StatusBadgeProps {
  level: LogLevel;
  children: React.ReactNode;
  showTimestamp?: boolean;
}

const LEVEL_COLORS: Record<LogLevel, LevelColor> = {
  trace: "magenta",
  debug: "gray",
  info: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
};

const LEVEL_PREFIXES: Record<LogLevel, string> = {
  trace: "→",
  debug: "↪",
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
};

/**
 * StatusBadge component for displaying status messages with color-coded prefixes.
 * Replaces the old logger functions (success, info, warning, error, etc.).
 */
export function StatusBadge({
  level,
  children,
  showTimestamp = false,
}: StatusBadgeProps): React.ReactElement {
  const color = LEVEL_COLORS[level];
  const prefix = LEVEL_PREFIXES[level];
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];

  return (
    <Text color={color}>
      {showTimestamp && `[${timestamp}] `}
      {prefix} {children}
    </Text>
  );
}

// Convenience components for common status types
export function Success({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <StatusBadge level="success">{children}</StatusBadge>;
}

export function Info({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <StatusBadge level="info">{children}</StatusBadge>;
}

export function Warning({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <StatusBadge level="warning">{children}</StatusBadge>;
}

export function Error({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <StatusBadge level="error">{children}</StatusBadge>;
}

export function Debug({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <StatusBadge level="debug">{children}</StatusBadge>;
}

export function Trace({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <StatusBadge level="trace">{children}</StatusBadge>;
}
