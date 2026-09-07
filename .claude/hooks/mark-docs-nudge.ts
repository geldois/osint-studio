import { isRelevantChange } from "./_docs-nudge";
import { readEvent, repoRelative, sessionId, setMarker, toolInput } from "./_hook-io";

function main(): void {
  const event = readEvent();
  const file = toolInput(event, "file_path");
  if (!file) {
    return;
  }

  const target = repoRelative(file);
  if (target === null || !isRelevantChange(target.rel)) {
    return;
  }

  setMarker("docs-nudge-pending", sessionId(event));
}

main();
