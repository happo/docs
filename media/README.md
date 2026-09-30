# Docs media

Screenshots and videos in the docs are produced by scripts, so they can be refreshed whenever the product changes instead of going stale.

Each image or video is a **scene** in [`scenes.mjs`](./scenes.mjs). A scene opens a page in Playwright, gets it into the right state, and saves a screenshot or a video to `static/`.

## Setup

Playwright's browser is downloaded separately from its npm package. After `pnpm install`, install it once:

```bash
pnpm exec playwright install chromium
```

Videos are encoded with ffmpeg. Install a current one:

```bash
brew install ffmpeg
```

`pnpm install` also downloads one through the `ffmpeg-static` package, which is used when there's no `ffmpeg` on your `PATH` with the `libsvtav1` and `libx264` encoders. It works, but it's old, and on Apple silicon it encodes AV1 many times slower. To use a particular ffmpeg, set `FFMPEG_BIN` to its path.

## Refreshing media after a product update

```bash
pnpm media status
```

This lists every image and video the docs use, which scene produces it, which pages use it, and when it was last updated. Legacy pages are listed as `legacy/…`: they share many images with the current docs, so updating an image updates those pages too. Media without a scene have to be updated by hand (or get a scene written for them).

```bash
pnpm media capture --all
```

This recaptures every automated scene. To recapture only some scenes, name them:

```bash
pnpm media capture happo-report happo-review-panel
```

After capturing, it lists media more than a year old on the same pages (including legacy pages) as anything it just updated, such as an old GIF right above a new screenshot. Update those too, so a page doesn't mix old and new UI. It also lists any `<img>` tag, on current or legacy pages, whose `width` and `height` no longer fit the new screenshot's shape, with the numbers to use instead. `pnpm media status` checks this for every image, and `pnpm media optimize --check` (which CI runs on changed images) fails on it.

Open a PR with the updated files. Happo runs on this repo, so the report on the PR shows every page where an image changed. Use it to review the new media in context.

## Keeping files small

Binary files stay in git history forever, so every image and video is optimized before it's written:

- Images and videos wider than 1916px are scaled down. The docs content column is at most 958px wide, so that's the most detail anyone sees on a high-DPI screen.
- PNGs are reduced to a 256-color palette, which usually halves their size with no visible difference for UI screenshots. If that would change the image too much (common with photos and gradients), the PNG stays lossless instead.
- Each video is a pair in `static/video/`: an AV1 `.webm` and an H.264 `.mp4`, both at up to 30 fps and without sound. Browsers that can play AV1 get the `.webm`, under half the size of the VP9 videos they replaced, and under a tenth of a GIF's. The rest, such as Safari on devices without an AV1 decoder, get the `.mp4`. `src/data/videos.json` records each pair's size and codecs, which `<Video>` needs (see [Showing a video](#showing-a-video)).
- `pnpm media optimize` only replaces a PNG with a smaller one, and never reduces the colors of a PNG that already has a palette. It leaves a video whose pair is already right alone, and re-encodes only the file of a pair that isn't, so it's safe to run on files that are already optimized.

Screenshots and videos from `pnpm media capture` are optimized automatically. Run files you make by hand through the same step before committing them:

```bash
pnpm media optimize static/img/my-screenshot.png
```

Prefer a short video over a GIF for anything animated. Record your screen, then run the recording through `pnpm media optimize`. It makes the pair for a `.mov`, `.mp4` or `.gif` in `static/video/`, named after it, prints the `<Video>` to show it with, and lists the docs pages that still use the old file:

```bash
pnpm media optimize static/video/my-recording.mov
```

Docs videos autoplay muted, so sound in a recording is never heard. If a video has an audio track, `pnpm media optimize` stops and asks you to confirm that the sound can be removed:

```bash
pnpm media optimize --drop-audio static/video/my-recording.mov
```

A GitHub Actions check runs `pnpm media optimize --check` on the images and videos a PR adds or changes, and on every video when `src/data/videos.json` changes. It fails when a file is wider than 1916px, when optimizing a PNG would make it more than 10% and 10 KB smaller, or when a video's pair is missing a file, isn't AV1 and H.264, is over 30 fps, has an audio track, or doesn't match its entry in `src/data/videos.json`. It prints the `pnpm media optimize` command that fixes it. For GIFs it only prints a warning. Run the check yourself with:

```bash
pnpm media optimize --check static/img/my-screenshot.png
```

## Scenes that need a login

Some pages are only visible when logged in. Scenes for those pages have an `auth` profile. Log in once per profile, and the session is saved to `media/.auth/` (gitignored):

```bash
pnpm media login happo
pnpm media login github
```

Log in with a demo account, not a personal or customer account, so that screenshots don't show real data.

## Happo reports

Scenes that show a Happo report use the demo PRs in [happo/happo-showcase](https://github.com/happo/happo-showcase). Each one keeps its report in a known state: needs review, accepted, rejected, with accessibility violations, with an animated diff, and with a diff reported as flake. `showcaseReport()` in `scenes.mjs` looks up the current report for a PR through the GitHub API when the scene runs, since reports expire and get re-created. Set `GITHUB_TOKEN` if you run into GitHub's rate limit.

If a lookup fails because a report is missing, run the **Refresh demo reports** workflow in happo-showcase and try again.

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
  target: page => page.locator('.panel'), // or an array of locators
  padding: 16,                           // or { top, right, bottom, left }
  mask: page => [page.locator('.avatar')],

  // Videos: define record() instead of target. Output static/video/<id>.webm;
  // the .mp4 is written next to it.
  async record(page, { click, hover, moveTo, pause }) {},
}
```

- Screenshots are taken at 2x pixel density so they're sharp on high-DPI screens, then optimized (see above).
- Crop tightly. Most app pages are much wider than their content, so a whole-viewport screenshot has wide empty margins. Set `target` to the part of the page the docs talk about. When a target returns several locators, the screenshot covers every visible, non-empty element they match, which helps when part of a panel only appears in some states. `pnpm media capture` warns when more than 15% of a screenshot on any side is empty background (beyond the scene's padding).
- A target taller than the viewport is still captured in full.
- Videos show a mouse pointer. Use the `click`, `hover` and `moveTo` helpers so the pointer glides to each element instead of jumping.
- Pace videos for someone seeing the UI for the first time. The helpers do most of this: a video starts with a still moment, the pointer eases between elements, `click` rests on an element before clicking it, and `hover` rests on one without clicking. Give anything new that appears (like an open menu) a second or two before moving on.
- End a video on the thing the docs are about. If the next step leaves the page (e.g. choosing a menu item that navigates), point at it with `hover` instead of clicking. A screenshot can show where it leads.
- Scenes must not change real data. Don't click anything that saves (Accept, Reject, Create token, …). If you need a page in a certain state, use one that's already in that state.
- Use `pnpm media capture <id> --headed` to watch a scene run while you write it.
- Some media can't be scripted safely, such as installing a GitHub app or creating an access token. Add those as `manual` scenes with instructions, so they still show up in `pnpm media status`.
- If a scene needs data that has to be set up by hand first (like a webhook that has sent deliveries), throw `SceneSkipped` with instructions when it's missing. `pnpm media capture` then reports the scene as skipped instead of failed.

## Showing a video

Show a video on a page with `<Video>`, which every page can use without an import. `name` is its file name in `static/video/` without the extension, and `label` describes what it shows, for screen readers:

```jsx
<Video
  name="happo-view-source"
  label="Opening the … menu on a snapshot and choosing View source"
/>
```

It offers the browser both files of the pair, and reserves the video's space so the page doesn't jump when it loads. It loops without sound, and plays only while it's on screen. Readers who prefer reduced motion get it paused, with controls to play it. The HTML the server renders has it paused on its first frame, which is what Happo screenshots, so a video can't make them flaky.
