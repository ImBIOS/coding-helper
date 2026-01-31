import type { Command } from "@oclif/core";
import { Config } from "./commands/config.js";
import { Cost } from "./commands/cost.js";
import { Doctor } from "./commands/doctor.js";
import { Help } from "./commands/help.js";
import { History } from "./commands/history.js";
import { Models } from "./commands/models.js";
import { Status } from "./commands/status.js";
import { Switch } from "./commands/switch.js";
import { Test } from "./commands/test.js";
import { Usage } from "./commands/usage.js";
import { Version } from "./commands/version.js";

export const commands: Record<string, Command.Class> = {
  config: Config as unknown as Command.Class,
  switch: Switch as unknown as Command.Class,
  status: Status as unknown as Command.Class,
  usage: Usage as unknown as Command.Class,
  test: Test as unknown as Command.Class,
  version: Version as unknown as Command.Class,
  help: Help as unknown as Command.Class,
  doctor: Doctor as unknown as Command.Class,
  models: Models as unknown as Command.Class,
  history: History as unknown as Command.Class,
  cost: Cost as unknown as Command.Class,
};
