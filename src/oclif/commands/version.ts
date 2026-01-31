import { readFileSync } from "node:fs";
import { join } from "node:path";
import { info } from "../../utils/logger.js";

export default async function versionCommand() {
  const pkgPath = join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  info(`ImBIOS v${pkg.version}`);
}
