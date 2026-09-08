import { formatFetchedAt } from "@/lib/overlay";
import { cn } from "@/lib/utils";

export interface VersionCandidate {
  content_id: string;
  revision: { fetched_at: string; merged_at?: string | null; provider: string };
}

export interface VersionChipsProps<T extends VersionCandidate> {
  candidates: T[];
  isSelected: (candidate: T) => boolean;
  onToggle: (candidate: T) => void;
}

export function VersionChips<T extends VersionCandidate>({
  candidates,
  isSelected,
  onToggle,
}: VersionChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1">
      {candidates.map((candidate) => {
        const selected = isSelected(candidate);
        return (
          <button
            key={candidate.content_id}
            type="button"
            onClick={() => {
              onToggle(candidate);
            }}
            className={cn(
              "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] transition-colors",
              selected
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-surface text-muted hover:bg-foreground/5",
            )}
          >
            {formatFetchedAt(candidate.revision.fetched_at)}
            <span className="opacity-70">· {candidate.revision.provider}</span>
            {candidate.revision.merged_at !== null &&
            candidate.revision.merged_at !== undefined ? (
              <span className="rounded-sm bg-foreground/5 px-1 text-[9px] uppercase">
                mesclado
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
