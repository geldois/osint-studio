import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { docsNudgeText, SIBLING_REPO_NAME } from "./_docs-nudge";
import {
  context,
  gitRoot,
  readEvent,
  sessionId,
  stopReinvoked,
  takeMarker,
} from "./_hook-io";

const ARCHITECTURE_DIR = "docs/architecture";

function main(): void {
  const event = readEvent();
  if (stopReinvoked(event)) {
    return;
  }

  if (!takeMarker("docs-nudge-pending", sessionId(event))) {
    return;
  }

  const root = gitRoot(process.cwd());
  if (root === null) {
    return;
  }

  const architectureDir = resolve(root, ARCHITECTURE_DIR);
  if (!existsSync(architectureDir)) {
    return;
  }

  const siblingDir = resolve(root, "..", SIBLING_REPO_NAME);
  const siblingPath = existsSync(siblingDir) ? siblingDir : null;

  context("Stop", docsNudgeText(siblingPath));
}

main();
