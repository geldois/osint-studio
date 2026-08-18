# Graph — what it does

The Whiteboard lets an analyst progressively expand a network: seed it with one identifier, then expand any node to
pull in and append its neighborhood. A node or edge already there must never be duplicated or repositioned when a
new expansion overlaps it — an entity appearing in two different neighborhoods must render
once, with edges drawn to every context it appears in. Each expansion returns one entity's neighborhood as a small,
self-contained graph fragment naming its own root; merging fragments into the accumulated whole, not querying a
single growing dataset, is the shape of the problem.

The accumulated graph is held in render-ready shape, not as raw records — merging an incoming fragment
deduplicates its nodes by identity and appends only the new ones, leaving every already-present node, including any
position a user dragged it to, untouched. New nodes are placed radially around the node that triggered the
expansion (or the origin, on first load); no general-purpose graph-layout library is used, since the domain graph
routinely contains cycles that a tree-oriented layout algorithm rejects outright. Each expandable node runs its own
expansion independently — expanding is a mutation with a side effect on the accumulated graph, not a cached read,
and an independent request per node means one node's failure or in-flight state never blocks another's.

## Decisions

Node deduplication by identity is safe because identity itself is derived deterministically from a fixed,
agreed-upon subset of each entity's own fields — for a person, its document number; for a company, its
registration number; for an address, its normalized location fields — rather than from every field a response
happens to carry. Early on, identity was derived from every field together, which meant two responses describing
the same real-world entity with even slightly different incidental formatting (a name capitalized differently, for
instance) would silently produce two different identities and duplicate the entity on the Whiteboard. A backend-side
change to narrow identity down to the true natural key eliminated that failure mode structurally, with no change
needed on this side of the boundary, since the merge already deduplicated by whatever identity a response carried.

Edge deduplication uses a composite key built from the edge's own endpoints and its relationship type, rather than
an identifier the backend happens to assign the edge — this keeps the merge's own idempotency independent of
however the backend chooses to identify edges, and immune to that choice ever changing.

Whether to trust an incoming response's shape at the boundary, or verify it there with runtime schema validation,
was deferred: a response is currently trusted as typed without a validation step, so a shape mismatch would only
surface once something tries to render the malformed data, not at the moment it arrives.

## Consequences

Coupling the accumulated state's own shape to the graph-rendering library's node/edge types keeps the split clean
— pure transforms stay separate from the stateful merge, and every expandable node gets isolated request state —
at the cost that swapping the rendering library later would mean reshaping how the accumulated state itself is
stored, since a decoupled alternative would need a second, hand-kept position map running in parallel, for no
benefit in an app that only ever renders one way.

Radial placement around the triggering node can still overlap pre-existing nodes in a dense graph; every node
stays draggable, and tuning the layout algorithm's placement quality further is a deliberately separate concern
from the accumulator itself (tracked in `TO-DO.md`).
