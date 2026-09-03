# Tooling — what it does

The project's own developer-facing quality gate — formatting, linting, type-checking, building, and automated
tests — runs identically for every contributor from committed git hooks, against the real working tree exactly as
it sits at commit or merge time, whole repo, not a staged-only slice of it. A release is triggered manually and
fully automated from there: commit messages following a fixed convention determine the next version, the
changelog, and the published release, mirroring the sibling backend project's own release behavior and trigger.

## Decisions

A single combined linter-and-formatter tool was the project's initial choice, later replaced by a pairing of two
separate, dedicated tools — one purely for formatting, one purely for type-aware linting that reuses the project's
own type information directly, with no separate type-inference pass of its own. The combined tool's own type-aware
analysis, in this project's specific dependency layout, drove the editor's language server into an unbounded
indexing loop that broke save-time formatting outright; disabling that analysis to avoid the loop would have
forfeited exactly the type-aware checking that justified a strict linter in the first place, leaving no
compensating benefit over the replacement.

Release automation was built on an established, widely-used release-automation tool rather than a small hand-rolled
script, even though the hand-rolled path would have added no new dependency at all — a mature tool has already
hardened the edge cases a release process actually hits (squashed commits, reverted commits, breaking-change
markers, note generation) in a way a small script written once for this project would not have, and the tool's own
cost is paid only inside the release job itself, never by anything shipped to a user.

Automated test coverage was scoped deliberately to pure, no-rendering logic only, leaving visual, component, and
end-to-end coverage out of the commit gate for now. The one concretely identified regression risk — an expansion
silently duplicating an entity or relationship already on the Whiteboard — is exactly the kind of pure, deterministic
logic such a suite can catch cheaply; a visual or interaction regression is not, and the Whiteboard's own visual
shape is still changing weekly, so locking that down early would pay a real, ongoing cost before catching any
regression it would prevent.

Changing the shape of a backend response breaks two repositories at once, and neither one's unit suite can see
it: every mock on both sides encodes the same assumption the code does, so both stay green through a break. Running
the real path needs a live backend, a login, and for the paid providers a billable request — none of which belong in
a commit gate or in a quick verification loop. The check used instead runs the backend's own response-building code
in-process against a hand-built graph covering every node and every edge type, writes what it serializes to a file,
and parses that file with this project's own response schemas. It needs no server, no credentials and no upstream
request, and it fails on exactly the drift the mocked suites are blind to; the trade is that it exercises
serialization and not routing, so a route or guard regression still needs the live path.

One test file builds a pragma-shaped string via concatenation rather than as a literal comment: the test framework's
own environment detector greps the raw file's text for that exact string, and a literal occurrence anywhere in the
file — including inside a test asserting how the detector's pragma is recognized — would flip that whole file's own
test environment, not just the input being asserted on.

Every tool's own cache or incremental-build file is redirected under one gitignored root, rather than left at each
tool's own default location — the repository root otherwise accumulates one more file or dot-directory per tool.
The framework's own build output directory is the one exception: it is deeply assumed at its default path by the
framework's own tooling and by this project's own multi-stage container build, so relocating it trades a real,
working assumption for a cosmetic one.

Tailwind class validity and canonical-form drift (an arbitrary-variant selector that a newer Tailwind release turned
into a built-in shorthand) were previously only ever caught by an editor's own IntelliSense extension — a diagnostic
nobody but that one editor's user ever saw, invisible to the commit gate and to CI alike. A linter plugin now owns
exactly that: an unknown class name, a self-contradicting pair, a class built by string concatenation the linter
can't statically see into, and the same canonical-form suggestion the editor extension made, all fail the gate
instead of sitting unseen. Two of the plugin's own recommended rules were deliberately left out — reordering every
class into a canonical property order, and reflowing every multi-class string across several lines — since both
reformat nearly every existing `className` in the codebase for a stylistic preference nobody asked for, versus the
rules kept, which only ever fire on an actual defect or the one drift this was adopted to catch.

Fixing a file that was already staged rewrites its content on disk without touching the index, which would
otherwise leave the index holding the pre-fix version while the working tree moves on to the fixed one — an
invisible partial-stage split. The fixer re-adds any file it rewrites that had a staged diff before it ran, so the
index always ends up holding exactly what the fixer produced. When the gate fails, holding it there would leave
content the assistant never staged sitting in the index, so the runner resets the files it re-added before
returning its verdict — a retry starts from a clean index and can never commit a stale version of a rewritten file
without explicitly re-staging it. A partial commit's own select semantics leave the real index holding a rewritten
file's pre-hook version even when the commit succeeded, so `run_fix` records the files it actually rewrote — worktree
content changed — in a gitignored marker (`build/.gate-fixed-paths`, one `path<TAB>blob-sha` line each, the sha naming
the pre-fix staged blob as the deterministic restore pointer), and a `post-commit` hook resets exactly those whose
worktree content now matches `HEAD`. A stale index is synced without touching a staged next version of any other path,
and a file staged-but-then-reverted in the worktree is never in the marker — the fixer did not rewrite it — so no
commit form can wipe the only copy of a staged-only change. A file that gets reformatted without having been
staged is left alone; it surfaces in `git status` like any other drift and gets its own commit whenever that's
convenient, never folded silently into whichever commit happens to run next.

The check gate validates the real, current working tree, not an isolated snapshot of only what's staged. An
earlier design snapshotted the exact staged tree into a scratch directory before checking it, specifically so an
unrelated, half-finished file sitting unstaged elsewhere could never block an unrelated commit — but building that
snapshot meant reinstalling dependencies and rebuilding from a cold cache on every single attempt, since the
scratch directory started empty every time. Real-working-tree cost is paid instead now: an unrelated broken file
elsewhere in the tree can block a commit until it's fixed too, in exchange for every gate run reusing the same
installed dependencies, build cache, and test cache the previous run already warmed.

A content hash of every tracked file is taken right after fixing, right before checking. If it matches the hash
from the previous time this ran, the check is skipped entirely and that previous run's exact output and exit
status are replayed instead — the working tree provably hasn't changed since that result was produced, so
re-running would only reproduce it. This is what makes a long run of small, split commits cheap: the first commit
in a batch pays for the real run, and every later one that leaves the tree exactly as it was replays for free.

Every safe fixer the repository owns, and every lint/type/build/test check, is reachable through exactly one
command each, used identically by a human's manual pass and the commit gate — so the two never drift into two
separate sets of formatting rules. The lint gate also fails on a warning, not only an error, for the same reason a
warning left inside the codebase indefinitely stops being noticed at all.

## Consequences

The formatting tool's own house style for emphasis in prose documents is fixed and not configurable, so the
project's documentation-linting rules were changed to match what it actually produces rather than fighting it file
by file forever.

Every plugin a release configuration references — including ones bundled with the release tool's own core — has to
be declared as an explicit project dependency, since the package manager's strict dependency resolution does not
implicitly expose a transitive package by name; adding a plugin to the release configuration always means also
adding it as a dependency.
