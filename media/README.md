# Docs media

Screenshots and videos in the docs are produced by scripts, so they can be
refreshed whenever the product changes instead of going stale.

Each image or video is a **scene** in [`scenes.mjs`](./scenes.mjs). A scene
opens a page in Playwright, gets it into the right state, and saves a screenshot
or a video to `static/`.

## Setup

Playwright's browser is downloaded separately from its npm package. After
`pnpm install`, install it once:

```bash
pnpm exec playwright install chromium
```

## Refreshing media after a product update

```bash
pnpm media status
```

This lists every image and video the docs use, which scene produces it, and when
it was last updated. Media without a scene have to be updated by hand (or get a
scene written for them).

```bash
pnpm media capture --all
```

This recaptures every automated scene. To recapture only some scenes, name them:

```bash
pnpm media capture happo-report happo-review-panel
```

Open a PR with the updated files. Happo runs on this repo, so the report on the
PR shows every page where an image changed. Use it to review the new media in
context.

## Keeping files small

Binary files stay in git history forever, so every image is optimized before
it's written:

- Images wider than 1916px are scaled down. The docs content column is at most
  958px wide, so that's the most detail anyone sees on a high-DPI screen.
- PNGs are reduced to a 256-color palette, which usually halves their size with
  no visible difference for UI screenshots. If that would change the image too
  much (common with photos and gradients), the PNG stays lossless instead.
- `pnpm media optimize` only replaces a file with a smaller one, so it's safe to
  run on images that are already optimized.

Screenshots from `pnpm media capture` are optimized automatically. Run
screenshots you take by hand through the same step before committing them:

```bash
pnpm media optimize static/img/my-screenshot.png
```

Prefer a short `.webm` video over a GIF for anything animated. Videos are a
fraction of the size of GIFs.

## Scenes that need a login

Some pages are only visible when logged in. Scenes for those pages have an
`auth` profile. Log in once per profile, and the session is saved to
`media/.auth/` (gitignored):

```bash
pnpm media login happo
pnpm media login github
```

Log in with a demo account, not a personal or customer account, so that
screenshots don't show real data.

## Happo reports

Scenes that show a Happo report use the demo PRs in
[happo/happo-showcase](https://github.com/happo/happo-showcase). Each one keeps
its report in a known state: needs review, accepted, rejected, with
accessibility violations, with an animated diff, and with a diff reported as
flake. `showcaseReport()` in `scenes.mjs` looks up the current report for a PR
through the GitHub API when the scene runs, since reports expire and get
re-created. Set `GITHUB_TOKEN` if you run into GitHub's rate limit.

If a lookup fails because a report is missing, run the **Refresh demo reports**
workflow in happo-showcase and try again.

## Writing a scene

```js
{
  id: 'happo-review-panel',              // name used on the command line
  output: 'static/img/happo-review-panel.png',
  url: 'https://happo.io/…',             // or an async function returning one
  auth: 'happo',                         // optional, see above
  viewport: { width: 1400, height: 900 }, // default 1400x900
  colorScheme: 'light',                  // or 'dark'
  css: '.banner { display: none }',      // extra CSS for this scene

  async setup(page) {},                  // runs before the page loads, e.g. page.route()
  async prepare(page) {},                // runs after the page loads, e.g. wait for images

  // Screenshots: omit `target` for the whole viewport.
  target: page => page.locator('.panel'),
  padding: 16,
  mask: page => [page.locator('.avatar')],

  // Videos: define record() instead of target. Output a .webm file.
  async record(page, { click, moveTo, pause }) {},
}
```

- Screenshots are taken at 2x pixel density so they're sharp on high-DPI
  screens, then optimized (see above).
- Videos show a mouse pointer. Use the `click` and `moveTo` helpers so the
  pointer glides to each element instead of jumping.
- Scenes must not change real data. Don't click anything that saves (Accept,
  Reject, Create token, …). If you need a page in a certain state, use one
  that's already in that state.
- Use `pnpm media capture <id> --headed` to watch a scene run while you write
  it.
- Some media can't be scripted safely, such as installing a GitHub app or
  creating an access token. Add those as `manual` scenes with instructions, so
  they still show up in `pnpm media status`.

Embed videos with a `<video>` tag instead of Markdown image syntax:

```html
<video
  src="/video/happo-view-source.webm"
  autoplay
  loop
  muted
  playsinline
  width="100%"
></video>
```
