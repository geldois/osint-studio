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

## Consequences

The formatting tool's own house style for emphasis in prose documents is fixed and not configurable, so the
project's documentation-linting rules were changed to match what it actually produces rather than fighting it file
by file forever.

Every plugin a release configuration references — including ones bundled with the release tool's own core — has to
be declared as an explicit project dependency, since the package manager's strict dependency resolution does not
implicitly expose a transitive package by name; adding a plugin to the release configuration always means also
adding it as a dependency.
