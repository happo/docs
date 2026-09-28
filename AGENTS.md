# Happo docs

The public documentation site for Happo, served at https://docs.happo.io. It's a
[Docusaurus](https://docusaurus.io/) 3 site, built to static files and served
from a Docker image.

## Working agreement

- **Run commands through mise:** `mise exec -- pnpm ...` (`mise.toml` pins Node
  and pnpm; bare `pnpm` may not be on PATH).
- **Work in a git worktree** under `.claude/worktrees/<branch>` (gitignored),
  branched off a freshly fetched `origin/main`.
- **ESM only.** `package.json` has `"type": "module"`.
- **Build before you push a docs change.** `docusaurus.config.js` makes broken
  links, anchors and Markdown links throw, so `pnpm build` is the check for them
  (CI runs it too).
- **Optimize media before committing it.** See
  [media/README.md](media/README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

- **Dev server:** `pnpm start`
- **Build:** `pnpm build` (writes `build/`) · **Serve the build:** `pnpm serve`
- **Format:** `pnpm format` (`prettier --write .`) · **Check formatting:**
  `pnpm lint` (`prettier --check .`)
- **Media:** `pnpm media status`, `pnpm media capture ...`,
  `pnpm media optimize ...` (see [media/README.md](media/README.md))
- **Release:** `pnpm release` runs `release-with-ease`, which reads `.env`,
  writes the changelog entry at the top of `README.md` and tags `v<version>`. A
  `v*` tag makes CircleCI publish the `enduire/happo-docs` image and trigger the
  production deploy.

## Layout

- `docs/` — current docs pages (`.md`/`.mdx`). `docs/_partials/` holds MDX
  fragments imported by several pages; they aren't pages themselves.
- `versioned_docs/version-legacy/` + `versioned_sidebars/` + `versions.json` —
  the frozen "Legacy" version of the docs.
- `sidebars.json` — sidebar for the current docs. Add new pages here.
- `docusaurus.config.js` — site config (navbar, redirects, Prism, versions).
- `src/` — site code: `pages/index.js` (redirects `/` to getting started),
  `clientModules/plausible.js` (analytics), `css/customTheme.css`.
- `static/` — images, videos and CSS served as-is.
- `media/` — Playwright scripts that capture and optimize the screenshots and
  videos in `static/` (`pnpm media`).
- `server.mjs` + `Dockerfile` — the production image: the Dockerfile builds the
  site and bundles `server.mjs` (a `serve-handler` static server on port 3344)
  with esbuild into a distroless image.
- `happo.config.mjs`, `buildHappoCustom.mjs`, `runHappo.mjs` — Happo visual
  tests of the built pages. `runHappo.mjs` skips pages a PR didn't touch.

## CI

- GitHub Actions: `build.yml` (site build + CircleCI config validation),
  `happo.yml` (Happo run), `media.yml` (checks added/changed media are
  optimized). Shared setup is `.github/actions/setup-env`.
- CircleCI (`.circleci/config.yml`): builds and smoke-tests the Docker image on
  every push, and publishes it on `v*` tags.
