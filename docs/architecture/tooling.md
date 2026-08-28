# Tooling — what it does

The project's own developer-facing quality gate — linting, formatting, type-checking, and automated tests — runs
identically for every contributor from committed git hooks, materialized fresh against exactly what is staged on
every commit, never against whatever else happens to be sitting unstaged in the working copy. A release is
triggered manually and fully automated from there: commit messages following a fixed convention determine the next
version, the changelog, and the published release, mirroring the sibling backend project's own release behavior and
trigger.

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
already given. A targeted single-file run is left alone for fast local iteration.

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

Automated fixing runs once at the end of every turn rather than at commit time or after every single edit. Fixing
at commit time only reformats whatever drifted since the last commit in one lump, landing unrelated formatting
noise inside whichever commit happens to run un-skipped, invisibly, since the assistant only ever sees that hook's
pass or fail. Fixing after every single edit was considered and rejected too: the assistant's own in-context copy
of a file goes stale the moment an external process rewrites it mid-turn, breaking a following edit that expected
the file exactly as it left it. Once per turn, after that turn's edits are done, nothing is still relying on the
file's prior exact shape, so every changed file can be reformatted for free and no formatting residue ever survives
to a commit.

Every safe fixer the repository owns, and every lint/type/build/test check, is reachable through exactly one
command each, used identically by a human's manual pass, the assistant's automatic one, and the commit gate — so
the three never drift into three separate sets of formatting rules. The lint gate also fails on a warning, not only
an error, for the same reason a warning left inside the codebase indefinitely stops being noticed at all.

A direct, manual run of any of those checks or fixers by the assistant is denied outright rather than merely
discouraged: a per-turn reminder in its own instructions was tried first and did not hold once a session ran long
enough, since the assistant would rediscover a reason to run one by hand anyway. The one door left open runs both
steps together and prints a single line either way — a plain confirmation, or the actual failure — precisely
because that combined command is the only path that still makes sense to reach for once the two automatic passes
already cover everything else: at the point something is checked by hand, either both steps are wanted, or neither
automatic pass would have caught it yet regardless of which one is asked for.

## Consequences

The formatting tool's own house style for emphasis in prose documents is fixed and not configurable, so the
project's documentation-linting rules were changed to match what it actually produces rather than fighting it file
by file forever.

Every plugin a release configuration references — including ones bundled with the release tool's own core — has to
be declared as an explicit project dependency, since the package manager's strict dependency resolution does not
implicitly expose a transitive package by name; adding a plugin to the release configuration always means also
adding it as a dependency.
