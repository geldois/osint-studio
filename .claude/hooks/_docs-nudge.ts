export const GENERATED_PREFIXES = [
  "node_modules/",
  ".next/",
  ".cache/",
  "build/",
  "coverage/",
];

const EXCLUDED_PREFIXES = ["docs/", ...GENERATED_PREFIXES];
const EXCLUDED_FILES = new Set(["README.md", "TO-DO.md", "CLAUDE.md", "CONTEXT.md"]);

export function isRelevantChange(rel: string): boolean {
  if (EXCLUDED_FILES.has(rel)) {
    return false;
  }
  return !EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

export const SIBLING_REPO_NAME = "osint-engine";

export function docsNudgeText(siblingPath: string | null): string {
  const siblingClause = siblingPath
    ? ` ${SIBLING_REPO_NAME} at ${siblingPath} shares this system's ` +
      "contract — check its docs/architecture/, README.md, CONTEXT.md, and " +
      "TO-DO.md too if this change could affect it."
    : "";
  return (
    "Files changed this turn. Judge, don't act reflexively: was the change " +
    "semantic (business/flow logic, a new library, a new tool/pattern, a " +
    "trade-off worth remembering) or purely mechanical (rename, typing, " +
    "refactor)? If semantic, the whole docs surface of this repo applies, " +
    "not just one matching file — every docs/architecture/*.md, plus " +
    `README.md, CONTEXT.md, and TO-DO.md.${siblingClause} Update whichever ` +
    "no longer tells the truth, in natural language — never cite a " +
    "function, class, or type name. If mechanical, skip."
  );
}
