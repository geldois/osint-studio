export const GENERATED_PREFIXES = [
  "node_modules/",
  ".next/",
  ".cache/",
  "build/",
  "coverage/",
];

const EXCLUDED_PREFIXES = ["docs/", ...GENERATED_PREFIXES];
const EXCLUDED_FILES = new Set([
  "README.md",
  "TO-DO.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "CHANGELOG.md",
  "pnpm-lock.yaml",
]);

export function isRelevantChange(rel: string): boolean {
  if (EXCLUDED_FILES.has(rel)) {
    return false;
  }
  return !EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

const ARCHITECTURE_DIR = "docs/architecture";

export function docsNudgeText(areas: string[]): string {
  const areasList = areas.length > 0 ? ` (existing: ${areas.join(", ")})` : "";
  return (
    "Files changed this turn. Judge, don't act reflexively: was " +
    "the change semantic (business/flow logic, a new library, a new " +
    "pattern, a trade-off worth remembering) or purely mechanical (rename, " +
    `typing, refactor)? If semantic, update the matching ${ARCHITECTURE_DIR}/` +
    `<area>.md${areasList} in natural language — never cite a function, ` +
    "class, or type name. If mechanical, skip."
  );
}
