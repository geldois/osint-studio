# Graph — what it does

The Whiteboard lets an analyst progressively expand a network: seed it with one identifier, then expand any node to
pull in and append its neighborhood. A node or edge already there must never be duplicated or repositioned when a
new expansion overlaps it — an entity appearing in two different neighborhoods must render
once, with edges drawn to every context it appears in. Each expansion returns one entity's neighborhood as a small,
self-contained graph fragment naming its own root; merging fragments into the accumulated whole, not querying a
single growing dataset, is the shape of the problem.

The accumulated graph is held in render-ready shape, not as raw records — merging an incoming fragment
deduplicates its nodes by identity and appends only the new ones, leaving every already-present node, including any
position a user dragged it to, untouched. Nodes are laid out radially by a general-purpose layout engine, one run
per connected component around that component's own anchor, with the components then packed side by side. Each
expandable node runs its own expansion independently — expanding is a mutation with a side effect on the
accumulated graph, not a cached read, and an independent request per node means one node's failure or in-flight
state never blocks another's.

## Decisions

Node deduplication by identity is safe because identity itself is derived deterministically from a fixed,
agreed-upon subset of each entity's own fields — for a person, its document number; for a company, its
registration number; for an address, its normalized location fields — rather than from every field a response
happens to carry. Early on, identity was derived from every field together, which meant two responses describing
the same real-world entity with even slightly different incidental formatting (a name capitalized differently, for
instance) would silently produce two different identities and duplicate the entity on the Whiteboard. A backend-side
change to narrow identity down to the true natural key eliminated that failure mode structurally, with no change
needed on this side of the boundary, since the merge already deduplicated by whatever identity a response carried.

A response also carries a second identity per entity, derived from its full content rather than from its natural
key, and the merge deliberately does not key on it. Keying on content would reinstate the exact failure the
natural-key change eliminated — one real-world entity rendered twice because an incidental field came back
formatted differently. That content identity is what distinguishes two observations of the same entity from each
other, which is a different question from which entity a node is, and it is answered somewhere other than the
accumulator.

The layout engine's radial algorithm requires a strict tree, and this domain graph is not one: an address shared by
a company and its owner gives that address two parents. The placement math therefore runs over a spanning tree
derived from each component, while every relationship is still drawn. Very uneven card sizes can leave the
algorithm's own radius calculation with residual overlap, repaired afterwards by a bounded local push-apart pass
rather than by replacing the algorithm.

Edge deduplication uses a composite key built from the edge's own endpoints and its relationship type, rather than
an identifier the backend happens to assign the edge — this keeps the merge's own idempotency independent of
however the backend chooses to identify edges, and immune to that choice ever changing.

A layout run in progress watches the accumulated node set through a value the render loop itself never depends on,
kept in step by a separate effect instead. The rendering library fires several internal size-change updates while
newly placed nodes settle right after a reset, and depending on the node set directly from inside the layout would
tear the in-flight run down and restart it on every one of those incidental updates — the running expansion could
then cancel its own layout before it finished and leave every card stacked in place.

Re-laying-out the graph after a merge no longer re-frames the whole viewport to fit every node. It instead keeps
whatever zoom level the analyst already had and re-centers on whichever node the analyst's own action was about.
The earlier behavior recalculated a fit around the bounding box of every node on screen, which is a point that
corresponds to no node in particular once the graph has more than a couple of components — visually, it read as
landing on an arbitrary card rather than on what the analyst just asked to expand. The one exception is a graph
with no reachable root among its current nodes, which still falls back to fitting everything, since there is
nothing more specific to center on.

Which node counts as "what the action was about" is tracked as its own piece of state, set explicitly by the
action that triggered a merge — never inferred from the root_id a just-received fragment happens to carry. A
single Expansion can merge more than one fragment at once (the CNEP/CEIS sanction lookups that ride along with
an admin's CNPJ/CPF Expansion, for instance), and a sanction fragment's own root can be the sanctioned party
rather than the document the analyst actually expanded — inferring focus from "whichever fragment merged last"
picked that unrelated party's Card as often as it picked the one the Expansion was actually for. Only the
primary fragment's root ever sets focus now.

A company's own label — on its Card, in the table, everywhere its name is shown — now prefers its registered
legal name over its trade name over its registration number, the reverse of the order it used before. The trade
name is what a company is publicly known as and reads friendlier, but the legal name is what every official
record actually keys on, and this is a tool for tracing formal registrations and ownership, not for recognizing
a storefront — matching the record's own primary identifier by default was judged more useful than the more
casual name.

Two nodes can carry more than one relationship between them at once, and the rendering library draws one line per
relationship rather than one line carrying several — a marker representing that pair therefore has to know which of
the two directions it belongs to, computed the same way for every relationship rather than trusted to whatever the
rendering library's own generic edge label position happens to report, since that generic position is only the
bounding-box midpoint and drifts off the actual line once a path curves; the true midpoint of a straight path is
still just the average of its two endpoints.

The detail panel no longer offers a single generic "expand" action for every expandable node. A company's CNPJ,
shown among its attributes, is itself the trigger — clicking it Expands directly, since looking up a CNPJ costs
nothing. A person's CPF is not directly clickable in the same way: expanding a CPF has a real per-lookup cost
(the same `KIPFLOW_CPF_COST_BRL` the table's batch consumption bar already prices), so clicking it and the
panel's own consumption block both run the same estimate-then-confirm flow the table already used for a batch —
now available one entity at a time from the graph, not just from a row selection in the table. A masked CPF
offers neither path, since the backend can't resolve one to look anything up.

## Consequences

Coupling the accumulated state's own shape to the graph-rendering library's node/edge types keeps the split clean
— pure transforms stay separate from the stateful merge, and every expandable node gets isolated request state —
at the cost that swapping the rendering library later would mean reshaping how the accumulated state itself is
stored, since a decoupled alternative would need a second, hand-kept position map running in parallel, for no
benefit in an app that only ever renders one way.

Radial placement can still leave nodes overlapping in a dense component; every node
stays draggable, and tuning the layout algorithm's placement quality further is a deliberately separate concern
from the accumulator itself (tracked in `TO-DO.md`).
