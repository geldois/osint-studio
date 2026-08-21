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

**Merge**: Storing a freshly fetched `GraphSchema` (`receiveGraph`/`receiveHistory`). Every **Revision** ever
fetched is kept, indexed by `content_id` — nothing is ever replaced or discarded, unlike osint-engine's own
server-side merge-by-filled-fields policy. Re-merging the same **Revision** is idempotent. Picking which
**Revision** to draw, when more than one is selected, is the **Overlay**'s job, not this one. _Avoid_: sync, upsert,
combine, replace

**Overlay**: The composed projection of the selected **Revision**s onto one Whiteboard render (`overlayRevisions`,
`useOverlay`). Per node `id` or relationship `edgeKey`, the candidate with the newest `revision.fetched_at` wins —
a tie breaks on the greater `content_id`, so the render never changes between two calls with the same input. An
**Override** always wins over that automatic pick. _Avoid_: projection, view (when talking about this composition,
not the Graph/Table **Whiteboard** views), merge (for this picking step)

**Conflict**: Two or more candidates of the same node `id` or relationship `edgeKey`, distinct by `content_id`,
present among the selected **Revision**s (`overlayRevisions`'s `conflicts`). Marked on the **Card** and offered in
the `version-menu`, never hidden behind a silent tie-break. _Avoid_: duplicate, mismatch

**Override**: An analyst's explicit pick of one **Revision** for a node or relationship, stored separately from the
**Revision**s themselves (`nodeOverrides`/`edgeOverrides`) and always winning the **Overlay**'s automatic
resolution regardless of `fetched_at`. Clearing it (`overrideNode(id, null)`) returns that entity to the automatic
pick. _Avoid_: pin, lock

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

- A **Whiteboard** renders one **Overlay** of selected **Revision**s in either the **Graph** or **Table** view
- **Expansion** and **Ingestion** both **Merge** a `GraphSchema` into the store — never lost, never overwritten
- Every **Expansion** and **Ingestion** returns one **Revision**, restamped onto each of its nodes and edges
- Two **Revision**s of one graph share a **Root** and differ by **Content id**
- The **Overlay** picks one **Revision** per node/relationship out of every one **Merge**d so far
- Two or more **Revision**s of the same node or relationship in one **Overlay** is a **Conflict**
- An **Override** always wins a **Conflict**'s automatic pick, until cleared
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
