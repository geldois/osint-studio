# Ingestion — what it does

An analyst uploads a document and every Brazilian identifier the backend recognizes inside it becomes a node linked to
that document, merged into the graph already on screen. Which recognition rules run is chosen per upload, not fixed by
the application.

## Decisions

The rules to apply are selected individually rather than by the backend's own named shortcut. The shortcut exists and
would have been one value to send instead of a list, but the only one the backend seeds today groups a single rule —
the loose CPF one — so an upload full of company registration numbers would have matched nothing at all, silently and
with no way for the analyst to tell the difference between "this document has nothing" and "nothing here was being
looked for". Listing every rule the backend advertises, all switched on to start, makes what a run covers visible and
adjustable at the moment it matters, and costs one request that was already being made to populate the screen.

Every rule starts switched on, including the only one that has no checksum to confirm its matches. That rule can
therefore invent an address from a coincidence of digits in prose, which the others structurally cannot. The trade was
made toward the visible failure: a spurious address node is obvious on the graph and can be ignored, whereas the
alternative failure mode — a run that quietly matched less than the analyst assumed — looks identical to a clean run
and is the one that misleads a conclusion.

A spreadsheet is handed to the backend as a file rather than being read in the browser and forwarded as text. The
backend already flattens every sheet, cell by cell, including the last computed value of a formula, and applies its own
size and row ceilings while doing it. Reading the workbook on the client would mean shipping a parser to the browser
and reimplementing those ceilings a second time, where they could drift from the ones actually enforced. A plain text
file still travels as text, since there is nothing to flatten and the backend offers no advantage over sending it
directly.

The client mirrors the backend's file ceilings rather than inventing its own, so an oversized upload is refused before
it occupies the network instead of after. This duplicates a constant across two repositories on purpose: the backend
stays the enforcing authority and rejects anything that slips past, and the client's copy is only an early, cheaper
refusal.

## Consequences

An upload's result now depends on which rules were active for that specific submission, so the same document uploaded
twice with different selections legitimately yields different graphs. The rules that produced each match travel back
with the relationship, so the graph itself records what was looked for, not just what was found.

The backend's named shortcuts are parsed and then ignored. If one ever grows into a genuinely useful preset, wiring it
back in means presenting it alongside the individual rules rather than replacing them, since the reason for showing
them individually was visibility, not the absence of a shortcut.
