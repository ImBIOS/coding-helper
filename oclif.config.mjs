import { type CliConfig } from "@oclif/core";

export default {
  version: "2.0.0",
  bin: "imbios",
  dirname: "imbios",
  commands: "./src/oclif/commands",
  topics: {
    account: {
      description: "Multi-account management",
    },
    profile: {
      description: "Configuration profiles",
    },
    dashboard: {
      description: "Web dashboard management",
    },
    alert: {
      description: "Alert configuration",
    },
    rotate: {
      description: "API key rotation",
    },
    plugin: {
      description: "Claude Code plugin management",
    },
    env: {
      description: "Environment variables",
    },
    completion: {
      description: "Shell completion",
    },
  },
} satisfies CliConfig;
