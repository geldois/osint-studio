import {
  addContext,
  gitRoot,
  readEvent,
  run,
  toolInput,
  toolName,
  toolResponse,
} from "./_hook-io";

const HEREDOC = /<<-?(['"]?)(\w+)\1\n[\s\S]*?\n\s*\2(?=\s|$)/g;
const GIT_COMMIT_OR_MERGE = /\bgit\s+(?:commit|merge)\b/;

function stripHeredocs(command: string): string {
  return command.replace(HEREDOC, (_match, _quote, marker: string) => `<<${marker}`);
}

function main(): void {
  const event = readEvent();
  if (toolName(event) !== "Bash") {
    return;
  }

  const command = toolInput(event, "command");
  if (!GIT_COMMIT_OR_MERGE.test(stripHeredocs(command))) {
    return;
  }

  const response = toolResponse(event);
  const stdout = typeof response["stdout"] === "string" ? response["stdout"] : "";
  const stderr = typeof response["stderr"] === "string" ? response["stderr"] : "";
  if (stdout.includes("[FAIL]") || stderr.includes("[FAIL]")) {
    return;
  }

  const root = gitRoot(process.cwd());
  if (root === null) {
    return;
  }

  const status = run(["git", "status", "--porcelain"], root);
  if (status === null || status.stdout.trim() === "") {
    return;
  }

  addContext(
    "Working tree isn't clean after that commit or merge — judge whether " +
      "this is leftover fix output that needs its own commit(s) now, or a " +
      "deliberate, unrelated work-in-progress you'll commit later.",
  );
}

main();
