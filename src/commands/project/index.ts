// project command - Project management (init, doctor, config, first-run)

export async function handleProject(args: string[]): Promise<void> {
  const action = args[0] as string | undefined;

  switch (action) {
    case "init": {
      const { handleProjectInit } = await import("./init.js");
      await handleProjectInit();
      break;
    }

    case "doctor": {
      const { handleProjectDoctor } = await import("./doctor.js");
      await handleProjectDoctor();
      break;
    }

    case "config": {
      console.log(`
ImBIOS Project Configuration

This command will help you configure project-specific settings.

Commands:
  init          Initialize a new project with CLAUDE.md
  doctor        Check project health and diagnose issues
  first-run     Run the first-time setup wizard

Usage:
  cohe project init          # Create CLAUDE.md from template
  cohe project doctor        # Check project health
  cohe project first-run     # Run setup wizard

Examples:
  cohe project init          # Initialize in current directory
  cohe project doctor ~/myapp # Check ~/myapp project
`);
      break;
    }

    case "first-run": {
      const { default: FirstRun } = await import("../first-run.js");
      const cmd = new FirstRun([""]);
      await cmd.run();
      break;
    }

    default: {
      console.log(`
ImBIOS Project Management

Commands:
  init          Initialize a new project with CLAUDE.md
  doctor        Check project health and diagnose issues
  config        Configure project settings
  first-run     Run the first-time setup wizard

Usage:
  cohe project <command> [options]

Examples:
  cohe project init          # Create CLAUDE.md from template
  cohe project doctor        # Check project health
  cohe project first-run     # Run setup wizard

For more info, visit: https://github.com/ImBIOS/coding-helper
`);
    }
  }
}
