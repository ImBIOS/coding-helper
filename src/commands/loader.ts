export {
  handleAccount,
  handleAlert,
  handleCompletion,
  handleConfig,
  handleCost,
  handleDashboard,
  handleDoctor,
  handleEnv,
  handleHelp,
  handleHistory,
  handleModels,
  handlePlugin,
  handleProfile,
  handleRotate,
  handleStatus,
  handleSwitch,
  handleTest,
  handleUsage,
  handleVersion,
} from "./index";

const COMMANDS: Record<string, (args?: string[]) => Promise<void>> = {
  config: handleConfig,
  completion: (args) => handleCompletion(args?.[0]),
  switch: (args) => handleSwitch(args),
  status: handleStatus,
  usage: handleUsage,
  history: handleHistory,
  cost: (args) => handleCost(args?.[0]),
  test: handleTest,
  plugin: (args) => handlePlugin(args?.[0]),
  doctor: handleDoctor,
  env: (args) => handleEnv(args?.[0]),
  models: (args) => handleModels(args?.[0]),
  profile: (args) => handleProfile(args),
  account: (args) => handleAccount(args),
  rotate: (args) => handleRotate(args),
  dashboard: (args) => handleDashboard(args),
  alert: (args) => handleAlert(args),
  help: handleHelp,
  version: handleVersion,
};

export async function loadCommand(
  command: string,
  args: string[]
): Promise<void> {
  const handler = COMMANDS[command];
  if (handler) {
    await handler(args);
  } else {
    await handleHelp();
  }
}
