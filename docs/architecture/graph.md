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

## Consequences

Coupling the accumulated state's own shape to the graph-rendering library's node/edge types keeps the split clean
— pure transforms stay separate from the stateful merge, and every expandable node gets isolated request state —
at the cost that swapping the rendering library later would mean reshaping how the accumulated state itself is
stored, since a decoupled alternative would need a second, hand-kept position map running in parallel, for no
benefit in an app that only ever renders one way.

Radial placement can still leave nodes overlapping in a dense component; every node
stays draggable, and tuning the layout algorithm's placement quality further is a deliberately separate concern
from the accumulator itself (tracked in `TO-DO.md`).
