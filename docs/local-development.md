---
id: local-development
title: Local development
---

When you're iterating on a component, it's often useful to run Happo from your
machine before opening a PR. Combined with the [`--only`](cli#--only-json) flag,
you can scope the run down to just the components you care about and get a link
to the report in the browser.

This works for both the [Storybook integration](storybook.mdx) and
[custom integrations](custom.mdx).

## The job URL

When Happo finishes uploading, it logs two URLs:

```
[HAPPO] Async report URL: https://happo.io/a/8/async-reports/2387412
[HAPPO] Async comparison URL: https://happo.io/a/8/jobs/2233741
```

The second one — the **async comparison URL** — is the one to open. It takes you
to a job page that shows the diff against the baseline as the screenshots come
in.

The report you land on will contain **all** components and snapshots from your
project — the ones included via `--only` are freshly rendered, and the rest are
carried over from the baseline report so the comparison is complete. You're only
charged quota for the snapshots that were actually generated.

## Running with `--only`

*The `--only` flag is available in `happo` v6.10.0 and later.*

The `--only` flag accepts a JSON array of components or story files to render
exclusively. See the [CLI reference](cli#--only-json) for the full entry format.

```sh
npm run happo --only '[{"component":"Card"}]'
```

Typing the JSON by hand gets old quickly, so a small wrapper script is usually
nicer to work with. Two patterns we've found useful are below.

## Pattern 1: pass the file as an argument

The simplest setup is a script that takes a single file path on the command line
and forwards it to Happo as `--only`. The script needs to:

1. Read the file (or component) name from `process.argv`.
2. Build the `--only` JSON payload — for example
   `[{ storyFile: './src/stories/Button.stories.js' }]` for Storybook, or
   `[{ component: 'Button' }]` for custom integrations.
3. Spawn `happo --only <json>` with inherited stdio so the
   `[HAPPO] Async comparison URL` line shows up in your terminal.

Run it like this:

```sh
node scripts/happo-only.mjs src/stories/Button.stories.js
```

When the run finishes, click the **Async comparison URL** in the output to see
the report.

## Pattern 2: detect changed files automatically

To run Happo against every story or component affected by your in-flight
changes, you can combine `git diff` with a dependency-graph tool such as
[`jest-haste-map`](https://github.com/jestjs/jest/tree/main/packages/jest-haste-map)
or [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser). The
idea: collect the files you've changed since the base branch, then walk the
import graph to find the story/example files that (transitively) depend on any
of them.

The script needs to:

1. Collect changed files — `git diff --name-only origin/main...HEAD` for
   committed work plus `git diff --name-only` for uncommitted edits.
2. Build a dependency graph for the project. `jest-haste-map` and
   `dependency-cruiser` are both good options; any tool that can answer "given
   file X, what does it import?" works.
3. Find the story or example files that depend on a changed file. For Storybook,
   filter to `*.stories.{js,ts,jsx,tsx}`; for custom integrations, filter to
   whatever pattern your examples live under.
4. Map each match to an `--only` entry —
   `{ storyFile: './path/to/foo.stories.js' }` for Storybook,
   `{ component: 'Foo' }` for custom integrations.
5. Spawn `happo --only <json>` with inherited stdio. Always log the JSON you
   computed — if a run looks wrong, that log is the fastest way to see what was
   included.

Run it from the project root with no arguments:

```sh
node scripts/happo-changed.mjs
```

Happo runs a partial build — only the components your change touches are freshly
rendered, and the report still includes everything else carried over from the
baseline so the comparison is complete. The CLI prints the **Async comparison
URL** when the run is done.

## Tips

- Log the `--only` value your script computes. It's the quickest way to diagnose
  a run that included more or fewer components than you expected.
- If your script can't find any affected stories, exit early instead of running
  a full Happo build — `--only` with an empty array is not the same as "nothing
  changed."
