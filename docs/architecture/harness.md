# Harness — what it does

This is the editor/agent integration layer under `.claude/` — distinct from the developer-facing gate façade
`tooling.md` documents, though it calls into that same façade's own tools. Under half the hooks only ever read and
report; none of them rewrites a file the assistant might be holding in context, so a fixer's rewrite can never leave
that in-context copy silently wrong. The rest touch only their own session-scoped marker files under the system temp
directory, entirely outside the repository, never a tracked file: one pair records and reads back before/after state
around each shell command, and a separate marker is set by either that pair or a per-edit hook and consumed exactly
once, at the end of the turn.

## Decisions

Fixing and checking both run inside the git hook itself, on the whole repository, on every commit and merge attempt —
never per edit, never at any other point in the assistant's turn. An earlier design ran fixing once per turn instead, on
the reasoning that a hook mid-turn would invalidate the assistant's own in-context copy of a file it had just edited.
That reasoning still holds for editing, but fixing no longer needs to run mid-turn at all: since the assistant never
runs a check or fixer itself and gets no automated lint feedback of any kind, nothing is waiting on an intermediate
result, so fixing only needs to have happened once, right before the check that gates the commit — so it happens there.

A newly-introduced comment is never auto-removed, at commit time or otherwise — the real TypeScript-parser rewrite this
used to run carried edge cases (a JSX expression container holding only a comment, trivia trailing a node's own end)
that could silently corrupt a file nobody reviews before it lands. A per-edit hook instead nudges the assistant to
remove it or make the name say what it said, leaving the actual judgment call to whoever wrote the comment. That check
is widened beyond the shipped source alone to every tracked, non-generated file in the repository — root configuration,
CI workflow, and this project's own tooling included — since every comment that used to live in one of those had a real
decision behind it, and that decision now lives in one of this project's own documentation surfaces instead. A written
change is checked against its own diff; a plain file read has nothing to diff against, so it is checked whole instead —
either way, the nudge treats a pre-existing comment exactly as insistently as a newly introduced one, now, in the same
turn, since pre-existing is never a reason to leave one in place.

A check running before every shell command nudges — it does not block — away from re-running the gate façade or a bare
full-project lint/format/type/build/test tool directly, redirecting to just committing instead: `pre-commit` already
runs the full gate on every commit and reports any failure inline, so a direct run duplicates a guarantee already given,
with nothing left for a manual run to learn early that the hook wouldn't already say. A targeted single-file run is left
alone for fast local iteration; a hard deny was considered and left out, since with fixing and checking both fully owned
by the git hook, a plain reminder already earns back the cost. The assistant edits code and attempts the commit or merge
it was already going to make, reading the gate's own failure output if it blocks.

A successful commit or merge doesn't guarantee the working tree is now clean — the fixer may have reformatted a file the
assistant never staged, or unrelated work may simply still be in progress. A nudge fires after every commit or merge the
assistant makes and checks `git status` itself: if anything is left, it asks the assistant to judge whether that's
leftover fix output that deserves its own commit now, or a deliberate work-in-progress being set aside for later — never
deciding that automatically.

The end-of-turn pass nudges toward updating a touched area's own `docs/architecture/<area>.md`, leaving the judgment of
whether the change was actually semantic — versus a rename or a purely mechanical refactor — to whoever is finishing the
turn. What counts as "touched this turn" is a marker, not a live git query: a per-edit hook sets it the moment a
relevant file is written, and the end-of-turn pass only ever consumes it once, so a file dirtied three turns ago and
still uncommitted doesn't keep re-firing the same nudge forever. A doc file, a generated or vendored path, and the
lockfile are the only paths that never count as "touched" for this purpose — everything else does, including a project's
own root-level configuration, since a tooling decision lives there as often as in application source.

A shell command has no per-file signal to hook into the way an edit does, so catching one that changes something
relevant — deleting a file, a package-manager or codegen rewrite — needs its own mechanism: a check immediately before
the command records every currently-dirty path's own modification time, and a check immediately after compares the same
paths' modification times against that record, marking the turn only for whichever paths actually moved. Comparing
modification times rather than the command's own git-status text is what tells a file that was already dirty and
rewritten again apart from one that was already dirty and left alone — the two would otherwise be indistinguishable
text, and conflating them either re-fires on old, already-handled drift or misses a real further edit to it. Git's own
path-quoting for unusual filenames is turned off at the source (a machine-readable status form) rather than parsed back
out, so a modification time is always looked up under the real name, never a quoted, escaped stand-in for it that can
never exist on disk.

The marker mechanism is entirely local to this project's own hook suite: no shared state, directory name, or import
connects it to any other project's or the wider agent harness's own equivalent, so these hooks keep working unmodified
on a machine that has none of that wider harness installed at all.
