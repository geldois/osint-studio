# osint-studio

Renders the graph osint-engine returns and lets an analyst walk it outward, one identifier at a time.

## Language

**Whiteboard**: The canvas screen (`/whiteboard`) where the graph is drawn and explored. Two views over the same
data: **Graph** (node-and-edge canvas) and **Table** (`data-table`, one row per node). _Avoid_: canvas, board

**Root**: A node fetched directly by its own identifier (CPF/CNPJ), rather than discovered through another node's
edges. Tracked as a set (`roots`) since more than one search can accumulate in the same graph. _Avoid_: origin

**Expansion**: Fetching everything connected to one identifier and merging it into the current graph (`useExpand`).
Mirrors osint-engine's own Expansion — the frontend never resolves an identifier itself, only asks the backend to and
renders what comes back. _Avoid_: search, fetch, query

**Ingestion**: Scanning an uploaded file for identifiers and merging what osint-engine recognizes into the current
graph (`useIngest`, `/ingest`). A `.txt` travels as text, a `.csv`/`.xlsx` as a file for osint-engine to flatten
first — same recognition either way. Mirrors osint-engine's own Ingestion. _Avoid_: parsing, scanning

**Pattern name**: One atomic recognition rule the analyst switches on or off before an **Ingestion** (`CPF_LOOSE`,
`CEP_AND_NUMBER`), named exactly as osint-engine names it and carried back on every edge that rule produced. Same
concept as upstream.

**Revision**: One `GraphSchema` paired with when osint-engine fetched it, when it merged it, and which provider
it came from (`revision`). Every node and edge inside a response repeats the graph's own revision, so a **Merge**
never loses where each entity came from. Same concept as upstream. _Avoid_: snapshot

**Content id**: An entity's identity derived from its full content (`content_id`), as opposed to `id`, derived only
from the natural key (CPF, CNPJ). Two **Revision**s of the same entity share an `id` and differ by `content_id`,
and identical content collapses to one `content_id` — the key overlapping graphs deduplicate on. Same concept as
upstream. _Avoid_: fingerprint, digest

**Merge**: Combining a freshly fetched `GraphSchema` into the accumulated graph (`mergeGraph`). A node or edge already
present is replaced outright by the incoming one, never field-merged — the same no-field-synthesis default
osint-engine uses server-side. Re-merging the same schema is idempotent: keyed by `node.id` and `edgeKey`
(`source_id|target_id|type`), so nothing duplicates. _Avoid_: sync, upsert, combine

**Card**: The on-canvas visual representation of one node — a label, an icon by `NodeType`, and the rows a detail
panel or table row would show (`CardData`, `entity-node`). _Avoid_: box, tile

**Relationship**: One semantic connection between two nodes, carrying its own `EdgeType`, direction and attributes.
Distinct from the line drawn on screen: React Flow draws one line per node pair, and `groupEdgesByPair` collapses
every relationship between the same pair (e.g. a person owns a company AND shares its address) into that single
line's relationship list. _Avoid_: edge (when talking about what's drawn), connection

**Possible match**: An advisory `possibly_matches` edge between two `Person` nodes with overlapping CPFs, carried
through unchanged from osint-engine. The UI never merges the two nodes — same as upstream. _Avoid_: duplicate, same
person

**Role**: `ADMIN` or `VIEWER`, read off the login JWT's claim for display and UI gating only (`decodeRole`) — mirrors
osint-engine's own per-route role guard so the UI doesn't offer an action the API would reject, but the backend
stays the actual source of truth. _Avoid_: permission, scope

**Stub**: A node carrying only the identifier osint-engine's own ingestion recognized, not yet enriched — surfaces in
the UI as a node with most fields `null` (e.g. an `AddressNode` with only `cep`/`number` set). Same concept as
upstream. _Avoid_: placeholder

## Relationships

- A **Whiteboard** renders one accumulated graph in either the **Graph** or **Table** view
- **Expansion** and **Ingestion** both **Merge** a `GraphSchema` into the graph
- Every **Expansion** and **Ingestion** returns one **Revision**, restamped onto each of its nodes and edges
- Two **Revision**s of one graph share a **Root** and differ by **Content id**
- An **Ingestion** carries one or more **Pattern name**s, chosen per submission, never fixed
- A **Root** is a node reached by **Expansion** on its own identifier, not by any **Relationship**
- Every line drawn between two nodes groups one or more **Relationship**s for that pair
- A **Possible match** is a **Relationship**, never acted on automatically
- **Role** gates which **Expansion** document types the UI offers, mirroring the backend's own guard

## Flagged ambiguities

- **"anchor" carries two senses.** The graph glossary's **Root** avoids it, but `graph-adapter.ts`'s layout code
  uses `anchor` for the node a connected component's radial placement centers on — usually the **Root**, falling
  back to the component's first node when none is present in that component. That layout sense is unrelated to
  graph identity and stays.

- **"Card" carries two senses.** The glossary's **Card** above is the on-Whiteboard node representation.
  `src/components/ui/card.tsx` (shadcn/ui, see `docs/architecture/ui.md`) is an unrelated generic UI container,
  used only outside the Whiteboard (`/login`, `/settings`, `/ingest`) — never for node rendering. Both stay; the
  import path (`@/components/ui/card` vs `@/components/nodes/*`) disambiguates.
