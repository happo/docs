# Happo docs

The public documentation site for Happo, served at https://docs.happo.io. It's a [Docusaurus](https://docusaurus.io/) 3 site, built to static files and served from a Docker image.

## Working agreement

- **Run commands through mise:** `mise exec -- pnpm ...` (`mise.toml` pins Node and pnpm; bare `pnpm` may not be on PATH).
- **Work in a git worktree** under `.claude/worktrees/<branch>` (gitignored), branched off a freshly fetched `origin/main`.
- **ESM only.** `package.json` has `"type": "module"`.
- **Build before you push a docs change.** `docusaurus.config.js` makes broken links, anchors and Markdown links throw, so `pnpm build` is the check for them (CI runs it too).
- **Docs for server behavior that isn't deployed yet are marked unreleased.** See [Unreleased docs](#unreleased-docs).
- **Optimize media before committing it.** See [media/README.md](media/README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

- **Dev server:** `pnpm start`
- **Build:** `pnpm build` (writes `build/`) · **Serve the build:** `pnpm serve`
- **Format:** `pnpm format` (`prettier --write .`) · **Check formatting:** `pnpm lint` (`prettier --check .`)
- **Media:** `pnpm media status`, `pnpm media capture ...`, `pnpm media optimize ...` (see [media/README.md](media/README.md))
- **Release:** `pnpm release` runs `release-with-ease`, which reads `.env`, writes the changelog entry at the top of `README.md` and tags `v<version>`. A `v*` tag makes CircleCI publish the `enduire/happo-docs` image and trigger the production deploy.

## Layout

- `docs/` — current docs pages (`.md`/`.mdx`). `docs/_partials/` holds MDX fragments imported by several pages; they aren't pages themselves.
- `versioned_docs/version-legacy/` + `versioned_sidebars/` + `versions.json` — the frozen "Legacy" version of the docs.
- `sidebars.json` — sidebar for the current docs. Add new pages here.
- `docusaurus.config.js` — site config (navbar, redirects, Prism, versions).
- `src/` — site code: `pages/index.js` (redirects `/` to getting started), `clientModules/plausible.js` (analytics), `css/customTheme.css`, the unreleased marker (`remark/unreleased.js`, `components/Unreleased.js`) and `<Video>` (`components/Video.js`, with each video's size and codecs in `data/videos.json`, which `pnpm media` writes), both registered for every page in `theme/MDXComponents.js`.
- `static/` — images, videos and CSS served as-is. Each video in `static/video/` is a pair: an AV1 `.webm` and an H.264 `.mp4` (see [media/README.md](media/README.md)).
- `media/` — Playwright scripts that capture and optimize the screenshots and videos in `static/` (`pnpm media`).
- `server.mjs` + `Dockerfile` — the production image: the Dockerfile builds the site and bundles `server.mjs` (a `serve-handler` static server on port 3344) with esbuild into a distroless image.
- `happo.config.mjs`, `buildHappoCustom.mjs`, `runHappo.mjs` — Happo visual tests of the built pages. `runHappo.mjs` skips pages a PR didn't touch.

## Unreleased docs

Docs must not go live before the server behavior they describe. Once this site is in the monorepo, the server deploy releases it from the commit it deployed, so docs that ship in the same PR as the server change need nothing special. Docs that would otherwise go out early do: a feature that lands over several PRs, or, while this is still its own repo, a docs PR merged before the server release. Mark them unreleased:

- **A whole page:** `unreleased: true` in its front matter. It can go in `sidebars.json` straight away.
- **Part of a page:** wrap it in `<Unreleased>...</Unreleased>` (no import needed; blank lines inside the tags so the Markdown in between still renders). It works inline too.

The PR that finishes the feature removes the marker. `src/remark/unreleased.js` does the work:

- **Production builds** (`pnpm build`, the Docker image, `build.yml`) leave unreleased docs out. A page becomes a Docusaurus draft (no route, not in the sidebar); a block is removed before the page is compiled, so its text and its headings never reach the bundle or the table of contents. The one trace is a draft page's doc id, which Docusaurus keeps in its global data, so don't put anything in a file name that shouldn't be public.
- **The dev server** (`pnpm start`) and **builds with `DOCS_SHOW_UNRELEASED=true`** show them, labelled as unreleased. The Happo workflow sets it, so a PR's screenshots include them.
- **A link from a released page to an unreleased page** breaks the production build (broken links throw). Put the link inside an `<Unreleased>` block.

## CI

- GitHub Actions: `build.yml` (`pnpm lint`, site build, CircleCI config validation), `happo.yml` (Happo run), `media.yml` (checks added/changed media are optimized). Shared setup is `.github/actions/setup-env`.
- CircleCI (`.circleci/config.yml`): builds and smoke-tests the Docker image on every push, and publishes it on `v*` tags.
