import { config } from "@dotenvx/dotenvx";

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads .env file by searching up the directory tree.
 * This resolves the ../../ path issue by automatically finding the root .env.
 */
function findEnvFile(startPath: string): string | null {
  let current = dirname(startPath);
  const root = resolve("/");

  while (current !== root && current !== dirname(current)) {
    const envPath = resolve(current, ".env");
    if (existsSync(envPath)) {
      return envPath;
    }
    current = dirname(current);
  }

  return null;
}

// Auto-load .env when this module is imported
// Using dotenvx with quiet: true to suppress console messages
const __filename = fileURLToPath(import.meta.url);
const envPath = findEnvFile(__filename);
if (envPath) {
  config({ path: envPath, quiet: true });
}
