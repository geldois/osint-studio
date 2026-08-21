"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { useEdgeHistory, useNodeHistory } from "@/hooks/use-entity-history";
import { formatFetchedAt } from "@/lib/overlay";
import { useGraphStore } from "@/store/graph";
import type { ApiEdge, ApiNode } from "@/types/api";

function VersionList<
  T extends { content_id: string; revision: { fetched_at: string; provider: string } },
>({
  candidates,
  currentOverrideContentId,
  onChoose,
  onExpand,
  expanded,
}: {
  candidates: T[];
  currentOverrideContentId: string | undefined;
  onChoose: (candidate: T) => void;
  onExpand: () => void;
  expanded: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] text-muted uppercase tracking-wide">Versões</h4>
      <ul className="space-y-1">
        {candidates.map((candidate) => (
          <li key={candidate.content_id}>
            <button
              type="button"
              onClick={() => {
                onChoose(candidate);
              }}
              className={`w-full rounded-sm px-1.5 py-1 text-left text-[11px] ${
                currentOverrideContentId === candidate.content_id
                  ? "bg-white/10"
                  : "hover:bg-white/5"
              }`}
            >
              {formatFetchedAt(candidate.revision.fetched_at)} ·{" "}
              {candidate.revision.provider}
            </button>
          </li>
        ))}
      </ul>
      {!expanded ? (
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
          onClick={onExpand}
        >
          <History size={11} />
          ver histórico completo
        </button>
      ) : null}
    </div>
  );
}

export function NodeVersionMenu({
  nodeId,
  conflictCandidates,
  currentOverride,
}: {
  nodeId: string;
  conflictCandidates: ApiNode[];
  currentOverride: ApiNode | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const overrideNode = useGraphStore((s) => s.overrideNode);
  const historyQuery = useNodeHistory(expanded ? nodeId : null);
  const candidates = expanded
    ? (historyQuery.data ?? conflictCandidates)
    : conflictCandidates;

  if (candidates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {currentOverride !== undefined ? (
        <button
          type="button"
          className="text-[11px] underline"
          onClick={() => {
            overrideNode(nodeId, null);
          }}
        >
          voltar ao automático
        </button>
      ) : null}
      <VersionList
        candidates={candidates}
        currentOverrideContentId={currentOverride?.content_id}
        onChoose={(candidate) => {
          overrideNode(nodeId, candidate);
        }}
        onExpand={() => {
          setExpanded(true);
        }}
        expanded={expanded}
      />
    </div>
  );
}

export function EdgeVersionMenu({
  overlayEdgeKey,
  edgeEntityId,
  conflictCandidates,
  currentOverride,
}: {
  overlayEdgeKey: string;
  edgeEntityId: string;
  conflictCandidates: ApiEdge[];
  currentOverride: ApiEdge | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const overrideEdge = useGraphStore((s) => s.overrideEdge);
  const historyQuery = useEdgeHistory(expanded ? edgeEntityId : null);
  const candidates = expanded
    ? (historyQuery.data ?? conflictCandidates)
    : conflictCandidates;

  if (candidates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {currentOverride !== undefined ? (
        <button
          type="button"
          className="text-[11px] underline"
          onClick={() => {
            overrideEdge(overlayEdgeKey, null);
          }}
        >
          voltar ao automático
        </button>
      ) : null}
      <VersionList
        candidates={candidates}
        currentOverrideContentId={currentOverride?.content_id}
        onChoose={(candidate) => {
          overrideEdge(overlayEdgeKey, candidate);
        }}
        onExpand={() => {
          setExpanded(true);
        }}
        expanded={expanded}
      />
    </div>
  );
}
