import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

/**
 * Identifies the ETL code that produced a row: the short git SHA, plus
 * "-dirty" when there are uncommitted changes. Stored on every row as
 * `transform_version` so published data can be traced back to its code.
 */
export function getTransformVersion(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
