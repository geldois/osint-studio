# 2. Incremental graph accumulator with idempotent merge

## Status

Accepted — node idempotency section partially superseded by [ADR-0004](0004-node-idempotency-via-identity-fields.md)

## Context

The graph explorer must let the user expand the network progressively: type a CNPJ
to seed the canvas, then click a company node to fetch and append its neighborhood.
Nodes and edges already on the canvas must not be duplicated or repositioned when a
new expansion overlaps them — a person owning two companies must appear once, with
edges drawn to both. The backend serves this via `GET /cnpj/{cnpj}`, returning a
`GraphSchema { root_id, nodes, edges }` for one entity's neighborhood; `root_id` is
the queried company. This is fundamentally an imperative accumulate-and-merge flow,
not a declarative "this key maps to this data" query.

## Decision

**State:** a Zustand store (`useGraphStore`) holds React Flow `Node[]`/`Edge[]`
already in render shape, not raw API nodes. `mergeGraph(schema, anchorId)` dedups
incoming nodes by `id` and appends only new ones; existing nodes are never touched,
so their positions (including user drags) are stable.

**Node idempotency (verified against the backend):** node dedup by `id` is safe
because osint-engine derives every entity id as a deterministic
`uuid5(namespace, all-fields)` (`Entity.calculate_id`), not a random `uuid4`. A person
who is a partner (QSA) of two separately-queried companies yields the same id in both
responses, so the second expansion dedups the person and links its edges to the
existing node — the required "link to nodes already in memory" behavior. Caveat: the
hash covers all fields, not just the natural key, so dedup holds only when the backend
returns byte-identical field values across calls (e.g. a partner name formatted
differently in two responses would not dedup). This is a backend data-quality concern,
not a frontend bug — the merge honors whatever id the contract emits.

**Edge idempotency:** edges are deduped by the composite key
`${source_id}|${target_id}|${type}`, which is also used as the React Flow edge id —
not by the backend's `edge.id`. This keeps the merge idempotent even if the backend's
edge-id policy ever changes, and is independent of the node-id guarantee above.

**Layout:** new nodes are placed radially around the anchor (the clicked node's
current position, or the origin on first load); the root of a first load sits at the
center. No layout library (dagre rejected: the CNPJ graph has cycles).

**Fetching:** modeled with TanStack Query `useMutation` (not `useQuery`), since each
call side-effects the store. `useExpand` is called per-node, giving every expandable
node its own isolated `isPending`/`error`. The `QueryClientProvider` lives at the root
(`app/providers.tsx`) so both route groups — `(auth)/login` and `(app)/whiteboard` —
can issue mutations.

## Consequences

- **Gained:** correct, stable incremental expansion; idempotency that survives an
  unknown backend edge-id policy; a clean split — pure transforms in
  `graph-adapter.ts`, stateful merge in the store, isolated request state per node.
- **Accepted cost:** the store depends on `@xyflow/react` node/edge types (coupling to
  the renderer); swapping renderers would require reshaping stored state. Chosen over
  a decoupled raw-node store because the latter needs a parallel position map kept in
  sync — more surface for bugs, no benefit for a single-renderer app.
- **Accepted cost:** radial placement around an anchor can overlap pre-existing nodes;
  nodes are draggable, and visual layout tuning is deliberately out of scope.
- **Accepted cost:** per-node `useMutation` creates one mutation observer per
  expandable node — negligible at this scale, revisit only for very large graphs.
- **Deferred:** responses are cast (`as Promise<GraphSchema>`) without runtime
  validation; a schema mismatch would surface at render, not at the boundary.
