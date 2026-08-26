# Findings — what it does

The Whiteboard's Achados view and its printable Relatório both read the same already-resolved graph an analyst is
already looking at and surface which parts of it matter to a corporate-investigation decision: an entity carrying an
active sanction, two otherwise-unrelated entities sharing an address or contact, a still-open identity question
between two people, or a fact whose most recent source disagrees with an older one. Nothing here fetches, expands, or
persists anything new — every finding is read off data the Whiteboard already merged and the analyst already
resolved (which revision wins a conflict, which override was set), so a finding can never contradict what the same
graph shows in the Graph or Table view. A finding names one entity or one pair, a fixed severity, and a
plain-language reason — never a computed score.

## Decisions

Every rule runs entirely on this side of the boundary, never inside the sibling backend that expands and ingests the
underlying data. Two ideas the Whiteboard invented for itself — which revision of a conflicting fact currently wins,
and an analyst's explicit override of that pick — exist only here; the backend has no notion of either. A rule
evaluated against the backend's own data would have to re-implement that resolution or ignore it outright, and
ignoring it means a finding could flag a conflict the analyst already resolved, or read a fact the analyst
deliberately overrode as if it were still live. Findings therefore only ever look at the graph after resolution, the
same graph the analyst is already looking at, so a finding can never disagree with what the Graph or Table view of
the same data currently shows.

The backend's own pluggable policies for how a revision is chosen and merged are real dependency-injected
components, swapped at startup — a pattern this feature deliberately did not copy. That pattern earns its cost where
more than one implementation can plausibly be selected at runtime; here there is exactly one consumer of the whole
rule set (the Achados view and the printable report read the same list) and no scenario where a different rule set
would be swapped in without a code change anyway. The rules instead sit in one flat, ordered list that a single pass
runs straight through, mirroring how the same graph's own conflict-resolution step is already a plain function over
plain data rather than an injected object graph. Adding a rule is appending one function and one line; nothing about
the shape changes as the list grows past the five rules it launched with.

Severity is a fixed property of which rule fired, not a number computed from weighted factors. A scored model
invites exactly the kind of tuning — what weight a shared address deserves against a sanction, where the cutoff
between two bands sits — that has no principled answer yet and would otherwise get decided under launch-week time
pressure and never revisited. A fixed severity per rule also keeps every finding explainable in one sentence: it
fired because this specific, named condition held, not because a formula crossed a threshold nobody reading the
report could reconstruct — which matters more here than in most dashboards, since the audience is deciding whether
to act on a legal or reputational risk.

The rule that flags two entities sharing an address, phone, or e-mail has to look for the shared contact turning up
two different ways, not one. A real expansion against an official source links an entity straight to its address; text
ingestion never does — it only links the entity and the address separately to the shared block of text they were
both recognized in, since ingestion invents no relationship an official source didn't already state. A rule that
only looked for the direct link would stay silent on every graph built purely from ingested documents, which is the
only path available before a paid or credentialed expansion has run against a given entity.

A separate, sibling project already exists purely to evaluate composable rules against arbitrary events and return a
fully auditable decision trace — the natural long-term home for this kind of logic, and a stronger one than anything
built here, since every decision it returns names the exact rule and evaluation path that produced it. It was
deliberately not wired in yet: nothing today defines what an event drawn from this graph would look like to that
engine, and standing up a third service with no existing contract between them, under a fixed delivery date, is a
cost this feature did not need to pay to be useful now. Moving to it later replaces the flat rule list wholesale
without changing anything the Achados view or the report reads.

## Consequences

A rule can only ever see the same resolved overlay the analyst is currently looking at, never the full stack of
conflicting revisions underneath it — a fact that was true in an older, since-overridden revision but is no longer
true in the current one produces no finding, by design, since the analyst already made that call. Severity bands and
the shape of the shared-contact rule are both easy to revisit — nothing about the flat list or the fixed severities
is load-bearing for anything else in the Whiteboard — but neither should move without deciding first whether the
sibling rule-engine project is finally the better home, since building a second, more elaborate version of the same
idea here would be the wrong direction.
