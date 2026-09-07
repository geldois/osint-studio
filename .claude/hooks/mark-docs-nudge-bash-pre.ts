import { pathMtimes, porcelainPaths, serializeMtimes } from "./_docs-nudge";
import { gitRoot, readEvent, run, sessionId, setMarker, takeMarker } from "./_hook-io";

function main(): void {
  const root = gitRoot(process.cwd());
  if (root === null) {
    return;
  }

  const session = sessionId(readEvent());
  const status = run(
    ["git", "status", "--porcelain", "-z", "--untracked-files=all"],
    root,
  );
  if (status?.status !== 0) {
    takeMarker("bash-pre-state", session);
    return;
  }

  const mtimes = pathMtimes(root, porcelainPaths(status.stdout));
  setMarker("bash-pre-state", session, serializeMtimes(mtimes));
}

main();
