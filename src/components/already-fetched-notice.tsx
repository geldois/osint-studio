import { Checkbox } from "@/components/ui/checkbox";

export interface AlreadyFetchedNoticeProps {
  alreadyFetched: boolean;
  force: boolean;
  label: string;
  onForceChange: (force: boolean) => void;
}

export function AlreadyFetchedNotice({
  alreadyFetched,
  force,
  label,
  onForceChange,
}: AlreadyFetchedNoticeProps) {
  if (!alreadyFetched) {
    return null;
  }
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted">
      <Checkbox checked={force} onCheckedChange={onForceChange} />
      {label}
    </label>
  );
}
