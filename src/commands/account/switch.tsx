import { Args } from "@oclif/core";
import { Box } from "ink";
import { switchAccount } from "../../../config/accounts-config.js";
import { BaseCommand } from "../../oclif/base.tsx";
import { Error as ErrorBadge, Success } from "../../ui/index.js";

export default class AccountSwitch extends BaseCommand<typeof AccountSwitch> {
  static description = "Switch to an account";
  static examples = ["<%= config.bin %> account switch acc_123456"];

  static args = {
    id: Args.string({
      description: "Account ID to switch to",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const id = this.args.id;

    if (switchAccount(id)) {
      await this.renderApp(
        <Box>
          <Success>Switched to account {id}</Success>
        </Box>
      );
    } else {
      await this.renderApp(
        <Box>
          <ErrorBadge>Account "{id}" not found.</ErrorBadge>
        </Box>
      );
    }
  }
}
