export interface ShellType {
  name: string;
  completions: string;
}

export const SHELLS: ShellType[] = [
  {
    name: "bash",
    completions: `_imbios_completions() {
  local cur prev words cword
  _init_completion || return
  case "${cur}" in
    --*)
      COMPREPLY=($(compgen -W "--help --version" -- "${cur}"))
      ;;
    *)
      COMPREPLY=($(compgen -W "config switch status usage history cost test plugin doctor env models help version" -- "${cur}"))
      ;;
  esac
}
complete -F _imbios_completions imbios`,
  },
  {
    name: "zsh",
    completions: `#compdef imbios

_imbios() {
  local -a commands
  commands=(
    'config:Configure API providers'
    'switch:Switch active provider'
    'status:Show current status'
    'usage:Query usage statistics'
    'history:Show usage history'
    'cost:Estimate model costs'
    'test:Test API connection'
    'plugin:Manage plugin'
    'doctor:Diagnose issues'
    'env:Export environment'
    'models:List models'
    'help:Show help'
    'version:Show version'
  )

  _describe -t commands 'imbios command' commands
}

_imbios`,
  },
  {
    name: "fish",
    completions: `complete -c imbios -f
complete -c imbios -a 'config' -d 'Configure API providers'
complete -c imbios -a 'switch' -d 'Switch active provider'
complete -c imbios -a 'status' -d 'Show current status'
complete -c imbios -a 'usage' -d 'Query usage statistics'
complete -c imbios -a 'history' -d 'Show usage history'
complete -c imbios -a 'cost' -d 'Estimate model costs'
complete -c imbios -a 'test' -d 'Test API connection'
complete -c imbios -a 'plugin' -d 'Manage plugin'
complete -c imbios -a 'doctor' -d 'Diagnose issues'
complete -c imbios -a 'env' -d 'Export environment'
complete -c imbios -a 'models' -d 'List models'
complete -c imbios -a 'help' -d 'Show help'
complete -c imbios -a 'version' -d 'Show version'`,
  },
];

export function getShellCompletion(shell: string): string {
  const shellConfig = SHELLS.find((s) => s.name === shell);
  if (!shellConfig) {
    throw new Error(
      `Unsupported shell: ${shell}. Supported shells: bash, zsh, fish`
    );
  }
  return shellConfig.completions;
}

export function getAllCompletions(): Record<string, string> {
  return SHELLS.reduce(
    (acc, shell) => {
      acc[shell.name] = shell.completions;
      return acc;
    },
    {} as Record<string, string>
  );
}

export function installCompletion(
  shell: string,
  dryRun = false
): { success: boolean; message: string } {
  const completion = getShellCompletion(shell);
  const paths: Record<string, string> = {
    bash: "~/.bash_completion",
    zsh: "~/.zshrc",
    fish: "~/.config/fish/completions/imbios.fish",
  };

  const path = paths[shell];
  if (dryRun) {
    return { success: true, message: `Would write completion to ${path}` };
  }

  return {
    success: true,
    message: `Completion for ${shell} installed. Restart your shell or source the file.`,
  };
}
