import {
  changedPaths,
  isRelevantChange,
  parseMtimes,
  pathMtimes,
  porcelainPaths,
} from "./_docs-nudge";
import {
  gitRoot,
  markerValue,
  readEvent,
  run,
  sessionId,
  setMarker,
  toolName,
} from "./_hook-io";

function main(): void {
  const event = readEvent();
  if (toolName(event) !== "Bash") {
    return;
  }

  const root = gitRoot(process.cwd());
  if (root === null) {
    return;
  }

  const status = run(
    ["git", "status", "--porcelain", "-z", "--untracked-files=all"],
    root,
  );
  if (status?.status !== 0) {
    return;
  }

  const session = sessionId(event);
  const rawPrevious = markerValue("bash-pre-state", session);
  if (rawPrevious === null) {
    return;
  }

  const previous = parseMtimes(rawPrevious);
  const paths = new Set([...porcelainPaths(status.stdout), ...previous.keys()]);
  const current = pathMtimes(root, [...paths]);

  if (changedPaths(current, previous).some(isRelevantChange)) {
    setMarker("docs-nudge-pending", session);
  }
}

main();
