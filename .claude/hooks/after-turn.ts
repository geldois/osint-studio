import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { docsNudgeText } from "./_docs-nudge";
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

  const areas = readdirSync(architectureDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length))
    .sort();

  context("Stop", docsNudgeText(areas));
}

main();
