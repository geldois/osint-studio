# Harness — what it does

This is the editor/agent integration layer under `.claude/` — distinct from the developer-facing gate façade
`tooling.md` documents, though it calls into that same façade's own tools. Four hooks, all read-only: none of them
ever rewrites a file the assistant might be holding in context, so a fixer's rewrite can never leave that
in-context copy silently wrong.

## Decisions

Fixing and checking both run inside the git hook itself, on the whole repository, on every commit and merge
attempt — never per edit, never at any other point in the assistant's turn. An earlier design ran fixing once per
turn instead, on the reasoning that a hook mid-turn would invalidate the assistant's own in-context copy of a file
it had just edited. That reasoning still holds for editing, but fixing no longer needs to run mid-turn at all:
since the assistant never runs a check or fixer itself and gets no automated lint feedback of any kind, nothing is
waiting on an intermediate result, so fixing only needs to have happened once, right before the check that gates
the commit — so it happens there.

A newly-introduced comment is never auto-removed, at commit time or otherwise — the real TypeScript-parser rewrite
this used to run carried edge cases (a JSX expression container holding only a comment, trivia trailing a node's own
end) that could silently corrupt a file nobody reviews before it lands. A per-edit hook instead nudges the assistant
to remove it or make the name say what it said, leaving the actual judgment call to whoever wrote the comment. That
check is widened beyond the shipped source alone to every tracked, non-generated file in the repository — root
configuration, CI workflow, and this project's own tooling included — since every comment that used to live in one
of those had a real decision behind it, and that decision now lives in one of this project's own documentation
surfaces instead. A written change is checked against its own diff; a plain file read has nothing to diff against,
so it is checked whole, surfacing a pre-existing comment as a pattern not to imitate rather than as something newly
introduced.

A check running before every shell command nudges — it does not block — away from re-running the gate façade or a
bare full-project lint/format/type/build/test tool directly, redirecting to just committing instead: `pre-commit`
already runs the full gate on every commit and reports any failure inline, so a direct run duplicates a guarantee
already given, with nothing left for a manual run to learn early that the hook wouldn't already say. A targeted
single-file run is left alone for fast local iteration; a hard deny was considered and left out, since with fixing
and checking both fully owned by the git hook, a plain reminder already earns back the cost. The assistant edits
code and attempts the commit or merge it was already going to make, reading the gate's own failure output if it
blocks.

A successful commit or merge doesn't guarantee the working tree is now clean — the fixer may have reformatted a
file the assistant never staged, or unrelated work may simply still be in progress. A nudge fires after every
commit or merge the assistant makes and checks `git status` itself: if anything is left, it asks the assistant to
judge whether that's leftover fix output that deserves its own commit now, or a deliberate work-in-progress being
set aside for later — never deciding that automatically.

The end-of-turn pass nudges toward updating a touched area's own `docs/architecture/<area>.md`, leaving the
judgment of whether the change was actually semantic — versus a rename or a purely mechanical refactor — to
whoever is finishing the turn. Where the project also keeps a `docs/adr/`, the same nudge points at migrating a
decision there into `docs/architecture/<area>.md` instead, unless the user explicitly asked for an ADR.
