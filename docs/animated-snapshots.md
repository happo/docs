---
id: animated-snapshots
title: Animated snapshots
---

_Available since happo v6.15.0. Options marked below as v6.17.0 need that
version or later._

Happo normally freezes animations and takes a single screenshot. With `animate`,
it can instead step an animation through a series of explicit times, take a
screenshot at each one, and store the frames as a single animated PNG (APNG).
Reviewers can then see how something moves, not just where it ends up, and a
change to the motion shows up as a diff.

An animated snapshot is also a valid plain PNG: its first frame is the default
image, so anything that doesn't understand APNG sees the first frame and treats
it like any other snapshot. In the Happo report you can scrub through the frames
of a diff, with the frames that changed the most highlighted.

## Quick start

Turn it on for a target:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      animate: {
        mode: 'auto',
        prefersReducedMotion: false,
      },
    },
  },
});
```

`mode: 'auto'` captures an animated snapshot only when the page has an animation
Happo can drive, and takes an ordinary still image of everything else. That
makes it safe to enable for a whole target: static stories cost nothing extra.

`prefersReducedMotion: false` is there because targets prefer reduced motion by
default, and components that respect that preference turn their animations off,
which would leave nothing to capture. It applies only to animated captures;
every other snapshot still renders under the target's setting. Leave it out if
you want to capture the reduced-motion version instead. See
[`prefersReducedMotion`](#prefersreducedmotion).

Most animations need nothing more. The rest of this page covers the ones that
do: transitions that need to be triggered, animations that start late or start
one another, pages that turn their own animations off, and animations that don't
use the browser's animation APIs at all (such as Lottie).

## What can be captured

| Kind                                                     | Captured                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| CSS animations (`@keyframes`)                            | Yes                                                                 |
| CSS transitions                                          | Yes, when something starts them. See [`trigger`](#trigger)         |
| `element.animate()` (Web Animations API)                 | Yes                                                                 |
| SVG SMIL animations (`<animate>`, `<animateTransform>`…) | Yes                                                                 |
| `requestAnimationFrame` loops                            | Yes, with [the virtual clock](#the-virtual-clock)                   |
| Lottie, canvas engines, anything with its own frame loop | Yes, with a [driver](#animation-drivers)                                      |
| `<video>`                                                | Yes, with the built-in [`video` driver](#the-built-in-video-driver) |
| Animated GIFs                                            | No. They're shown on their first frame, as in any Happo snapshot    |
| Animated WebP and APNG images                            | No. Happo doesn't control them, so replace them with a still image  |
| Scroll-driven animations (`ScrollTimeline`)              | No. Their progress is scroll position, not time                     |
| View transitions                                         | Not yet                                                             |

Happo drives animations by _seeking_: it pauses each one and asks it to render
at an exact time, rather than letting it play and taking screenshots as it goes.
That's what makes the same animation produce the same frames on every run.

Animated images are the exception. Happo freezes animated GIFs on their first
frame whether or not `animate` is on, but it has no way to pause or step an
animated WebP or APNG `<img>`: it keeps playing on its own, and can be caught on
a different frame each run. If your stories use one, swap it for a still image
in the story.

## Where to configure it

`animate` can be set on a target, and then per Storybook story, per example in
the custom integration, or per page in the pages integration. Per-story,
per-example and per-page options merge over the target's, one field at a time
(see [how options merge](#how-options-merge) below).

### On a target

```js title="happo.config.ts"
export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      animate: { mode: 'auto', fps: 12 },
    },
  },
});
```

Target-level `animate` is the only option for the [Cypress](cypress.mdx) and
[Playwright](playwright.mdx) integrations.

### On a Storybook story

```js title="Toast.stories.js"
export const Opening = {
  parameters: {
    happo: {
      animate: { mode: 'always', duration: 800, fps: 12 },
    },
  },
};
```

A story that sets `animate` itself also renders in a
[motion environment](#the-motion-environment), and can use [hooks](#hooks),
which targets and other integrations can't.

### In the custom integration

In the [custom integration](custom.mdx), pass `animate` with each example:

```js title="happo-examples.js"
happoCustom.registerExample({
  component: 'Toast',
  variant: 'opening',
  render: () => {
    document.body.innerHTML = '<div class="toast is-open">Saved</div>';
  },
  animate: { mode: 'auto', fps: 12 },
});
```

### On a page

In the [pages integration](full-page.mdx), set `animate` on each page:

```js title="happo.config.ts"
export default defineConfig({
  integration: {
    type: 'pages',
    pages: [{ url: 'https://example.com/', title: 'Home', animate: 'auto' }],
  },
});
```

### How options merge

A story, example or page only needs to set what it wants to change. Each field
it sets replaces the target's value for that field, and every other field keeps
the target's value:

```js
// On the target
animate: { mode: 'auto', fps: 15 }

// On one story
animate: { maxFrames: 60 }

// What that story is captured with
{ mode: 'auto', fps: 15, maxFrames: 60 }
```

`animate: false` on a story, example or page turns capture off for just that
one.

### Shorthands

| Shorthand         | Means                |
| ----------------- | -------------------- |
| `animate: 'auto'` | `{ mode: 'auto' }`   |
| `animate: true`   | `{ mode: 'always' }` |
| `animate: false`  | `{ mode: 'off' }`    |

## Options

### `mode`

_Available since happo v6.15.0._ Type: `'off' | 'auto' | 'always'`. Default:
`'off'`.

- `'off'` takes a still image.
- `'auto'` captures an animated snapshot when the page has an animation Happo
  can drive, and a still image otherwise. SMIL animations and stories on the
  [virtual clock](#the-virtual-clock) are captured too, even though neither can
  report its length.
- `'always'` captures even when nothing on the page reports how long it runs.

### `duration`

_Available since happo v6.15.0._ Type: `number | 'auto'`. Default: `'auto'`.

The capture window, in milliseconds. `'auto'` takes it from the animations on
the page: the longest one wins.

Leave it at `'auto'` whenever the page can report the length, since a hand-set
duration goes stale when the animation changes. Set it for SMIL,
`requestAnimationFrame` loops and long videos, which can't report a useful
length (the window would otherwise be [`maxDuration`](#maxduration)).

When you do set it, take the value from the component so the two can't drift
apart:

```js title="Toast.js"
export const ENTER_DURATION_MS = 300;

export function Toast({ children }) {
  return (
    <div style={{ animation: `toast-enter ${ENTER_DURATION_MS}ms ease-out` }}>
      {children}
    </div>
  );
}
```

```js title="Toast.stories.js"
import { Toast, ENTER_DURATION_MS } from './Toast';

export const Entering = {
  render: () => <Toast>Saved</Toast>,
  parameters: {
    happo: { animate: { mode: 'always', duration: ENTER_DURATION_MS } },
  },
};
```

### `maxDuration`

_Available since happo v6.15.0._ Type: `number`. Default: `4000`.

The ceiling for every capture window, whether you set `duration` or not. It's
also the window used when `duration` is `'auto'` but nothing reports a length:
SMIL, the virtual clock, and `mode: 'always'`.

Treat it as a safety net for long or infinite animations, not a target. Setting
it below an animation's real length captures the beginning and stops.

### `fps`

_Available since happo v6.15.0._ Type: `number`. Default: `10`.

Samples per second of animation, from 1 to 60. Ignored when
[`sampling`](#sampling) isn't `'uniform'`.

### `maxFrames`

_Available since happo v6.15.0._ Type: `number`. Default: `24`.

A hard cap on the number of frames, from 2 to 120. It wins over
`fps × duration`, and keeps a high `fps` from turning into a hundred
screenshots.

### `loop`

_Available since happo v6.15.0._ Type: `number`. Default: `0`.

How many times the APNG plays when viewed. `0` loops forever.

### `maxBytes`

_Available since happo v6.15.0._ Type: `number`. Default: `4000000`.

The size budget for the encoded file, in bytes. When a capture comes out bigger,
frames are dropped (every other one, repeatedly) until it fits, rather than the
snapshot being dropped.

### `clock`

_Available since happo v6.15.0._ Type: `'off' | 'virtual'`. Default: `'off'`.

`'virtual'` replaces the page's clock so `requestAnimationFrame` animations can
be stepped. It has to be armed on the target. See
[the virtual clock](#the-virtual-clock).

### `trigger`

_Available since happo v6.15.0._ Type: `AnimateTrigger | null`. Default: `null`.

A CSS transition doesn't exist until the property it watches changes, so there's
nothing to capture until something changes it. A trigger does that right before
the capture starts:

```js title="Toast.stories.js"
export const Opening = {
  parameters: {
    happo: {
      animate: {
        trigger: { selector: '.toast', action: 'addClass', value: 'is-open' },
      },
    },
  },
};
```

Setting a trigger turns capturing on by itself, so you don't also need `mode`.
It won't override a `mode` you set explicitly, including `'off'`.

| `action`                   | `value`                       | Notes                                                      |
| -------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `addClass` / `removeClass` | class name                    |                                                            |
| `setAttribute`             | `{ name, value }` or a string | A bare string sets that attribute to `""`                  |
| `removeAttribute`          | attribute name                |                                                            |
| `click`                    | none                          | Calls `element.click()`, so your click handlers run        |
| `focus`                    | none                          |                                                            |
| `hover`                    | none                          | Moves a real pointer over the element, so `:hover` applies |

The selector is matched through shadow roots.

#### Trigger functions

_Available since happo v6.17.0. Storybook stories only._

In a story, `trigger` can also be a function. It runs on the page with the
story's root element:

```js title="Menu.stories.js"
export const Opening = {
  parameters: {
    happo: {
      animate: {
        mode: 'auto',
        trigger: async ({ rootElement }) => {
          rootElement.querySelector('button[aria-haspopup]').click();
        },
      },
    },
  },
};
```

Unlike a declarative trigger, a function doesn't turn capturing on by itself, so
set `mode`. A story's trigger function replaces a declarative trigger set on the
target.

### `prefersReducedMotion`

_Available since happo v6.16.0._ Type: `boolean | null`. Default: `null`.

Targets prefer reduced motion by default (see
[the target's `prefersReducedMotion`](configuration.md#target-prefersreducedmotion)),
and a page that respects that preference usually turns its own animations off:

```css
@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}
```

With that CSS in place there's nothing to capture, and the snapshot is a still
image. That's the right result by default, since it's what the page shows, and
the reduced-motion version is often worth a snapshot of its own.

To capture the full-motion version, set `prefersReducedMotion: false` on
`animate`, for a whole target or for one story:

```js
animate: { mode: 'auto', prefersReducedMotion: false }
```

This switches the preference for the animated capture only. Every other snapshot
still renders under the target's own setting. It also works the other way:
`prefersReducedMotion: true` forces reduced motion for one capture on a target
that has it turned off. `null` uses the target's setting.

For a story that sets it, the override is applied _before the story renders_
(since v6.17.0), so components that check the preference when they mount (e.g.
with `matchMedia`) see it too.

### `discovery`

_Available since happo v6.17.0._ Type: `number | { settleMs, maxFrames }`.
Default: `{ settleMs: 0, maxFrames: 90 }`.

Happo pauses every animation it finds when the capture starts. Anything that
starts afterwards on its own, like the items of a staggered list mounted on
timers after a click, or content that arrives after a fetch, isn't there yet and
would be missed.

With `discovery`, Happo keeps looking for `settleMs` milliseconds after the
capture starts, checking once per frame, and takes over each new animation as it
appears:

```js title="SearchResults.stories.js"
export const Appearing = {
  parameters: {
    happo: {
      animate: {
        trigger: { selector: '#search', action: 'click' },
        discovery: { settleMs: 600 },
      },
    },
  },
};
```

| Field       | Default | Meaning                                                            |
| ----------- | ------- | ------------------------------------------------------------------ |
| `settleMs`  | `0`     | How long to keep looking, in ms (up to 10000). `0` looks only once |
| `maxFrames` | `90`    | The most checks (one per frame) the search may take                |

`settleMs` is a fixed limit counted from the start of the capture. Finding
something new doesn't extend it, so make it long enough to cover the last
animation you expect. `discovery: 600` is short for `{ settleMs: 600 }`.

An animation found late keeps its place in time: it starts in the capture at the
moment it appeared, so a stagger stays a stagger. Until then it shows its first
keyframe.

> **Note:** Anything that waits for timers depends on when they fire. Happo
> rounds start times to whole frames so small timing differences don't change
> the result, but an animation that starts a frame late on a slow run, or right
> at the end of the window, can come out differently.

### `stages`

_Available since happo v6.17.0._ Type: `number | { max, waitMs }`. Default:
`{ max: 1, waitMs: 1000 }`.

Some animations are a sequence where each step starts the next: a panel slides
in, then a list staggers in, and then a Lottie plays. The next step usually only
exists once the previous one finishes, because the previous one's completion
handler mounts it. So it can't be found up front.

`stages` captures them one at a time:

```js title="Onboarding.stories.js"
export const Welcome = {
  parameters: {
    happo: {
      animate: {
        mode: 'auto',
        stages: 4,
        expect: { minStages: 2 },
      },
    },
  },
};
```

Happo captures the current stage, then lets it finish so its `finished`
promises, `animationend` handlers and the like run. Whatever animations appear
next become the next stage. All stages go into one APNG, each sampled from its
own start, so the same chain produces the same frames on every run.

`stages` is a single object (or a number, as a shorthand for `max`):

| Field    | Default | Meaning                                                     |
| -------- | ------- | ----------------------------------------------------------- |
| `max`    | `1`     | The most stages to capture (up to 16). `1` means no staging |
| `waitMs` | `1000`  | How long to wait for the next stage to appear, in ms        |

The capture stops at the first of:

- `max` stages;
- nothing new appearing within `waitMs`;
- everything new looking like something already captured (the same kind of
  animation on the same element, with the same length), which is a chain that
  restarts itself rather than moving on.

A chain that never gets past its first stage still produces a plausible
animation of that stage, so pair `stages` with `expect: { minStages }`.

Things to know:

- A stage's elements have to stay mounted while it's being captured. An element
  removed when its step ends is fine; one removed partway through has nothing
  left to show.
- Infinite animations never finish, so they don't start the next stage.
- Stages can't be combined with the [virtual clock](#the-virtual-clock). With
  `clock: 'virtual'`, only the first stage is captured, with a warning.
- A [driver](#animation-drivers) can decide how its animations finish a stage, with a
  `finish()` on its handles.

### `sampling`

_Available since happo v6.17.0._ Type:
`'uniform' | { split, front, tail } | { times }`. Default: `'uniform'`.

By default frames are spread evenly across the window at `fps`. That wastes
frames on springs and overshoots, which do all their moving early and then hold
still. Two alternatives:

```js
// 7 frames across the first half of the window, 3 across the rest
animate: { sampling: { split: 0.5, front: 7, tail: 3 } }

// exactly these times, in milliseconds
animate: { sampling: { times: [0, 80, 160, 240, 400, 800] } }
```

| Form                     | Meaning                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `'uniform'`              | Evenly, at `fps`                                                                                                        |
| `{ split, front, tail }` | `front` frames across the first `split` (0.05–0.95) of the window, `tail` across the rest. Always ends on the end state |
| `{ times }`              | Exactly these times. The end state is included only if you list it                                                      |

Both alternatives ignore `fps`. `maxFrames` still applies: a split asking for
more is scaled down, and extra `times` are dropped.

However the frames are spread, the APNG plays at the animation's real speed:
each frame stays on screen until the time of the next sample. Uneven sampling
makes playback smoother in some stretches and choppier in others, never faster
or slower.

### `root`

_Available since happo v6.17.0._ Type: `string | null`. Default: `null`.

A CSS selector (matched through shadow roots) that limits which animations are
captured. Only the animations inside it are captured, and only they decide the
capture window.

Say a story renders a page shell with a spinner in its header, and you want to
capture the notification panel sliding in, not the spinner:

```js title="Notifications.stories.js"
export const PanelOpening = {
  render: () => (
    <AppShell>
      <NotificationPanel open />
    </AppShell>
  ),
  parameters: {
    happo: {
      animate: { mode: 'auto', root: '[data-testid="notification-panel"]' },
    },
  },
};
```

The panel's animation decides the window and is stepped through it. The spinner
is outside `root`, so it's held on its first frame in every frame, as it would
be in a still image. The snapshot itself still shows the whole story: `root`
limits the animations, not the image. If `root` matches nothing, nothing is
captured and you get a still image.

### `expect` and `onExpectationFailure`

_Available since happo v6.17.0._ `expect`: an object, or `null` (the default).
`onExpectationFailure`: `'image' | 'fail' | 'warn'`, default `'image'`.

A capture that finds nothing falls back to a still image. That's what makes
`mode: 'auto'` safe across a whole target, but it's not what you want for a
story that exists to show an animation: if the animation breaks, the snapshot
becomes a perfectly plausible still image and nothing fails.

`expect` says what the capture has to find:

```js
animate: {
  mode: 'auto',
  expect: { minAnimations: 1, minFrames: 3 },
}
```

| Check           | Meaning                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `minAnimations` | At least this many animations found (SVG SMIL roots count)                 |
| `minFrames`     | At least this many distinct frames in the APNG                             |
| `triggered`     | `true` requires the trigger to have matched an element                     |
| `minStages`     | At least this many [stages](#stages) captured                  |
| `drivers`       | At least this many animations per [driver](#animation-drivers), e.g. `{ lottie: 1 }` |

When a check fails, `onExpectationFailure` decides what happens:

- **`'image'`** (default): the snapshot is replaced with an image describing the
  failure, listing what was expected and every animation that was found. It
  shows up in the report as a diff that explains itself.
- **`'fail'`**: the job fails with that description as its error, like any other
  [failure on the worker](debugging.md#failed-on-worker). You'll find the
  message in your Happo dashboard under "Snap-requests".
- **`'warn'`**: Happo logs a warning with the description and keeps the capture.

`expect` merges one field at a time like the rest of `animate`. A common pattern
is to set checks on the target and let the occasional deliberately-still story
opt out with `expect: null`.

### `drivers`

_Available since happo v6.17.0._ Type: `string[] | null`. Default: `null`.

Which [drivers](#animation-drivers) to use. `null` uses every driver you registered.
Naming one is also how you turn on a built-in driver, like
[`video`](#the-built-in-video-driver).

### `setup` and `verify`

_Available since happo v6.17.0. Storybook stories only._

Functions that run on the page: `setup` before the story renders, `verify` after
the capture. See [hooks](#hooks).

## How to choose values

Start with `animate: 'auto'` and change nothing else. The defaults work for
typical UI animations like toasts, menus and spinners, and most animations don't
need tuning.

**Frame count drives the cost.** Every frame is a full screenshot, so a 24-frame
snapshot takes roughly 24 times as long to capture as a still screenshot. Run
time and the time reviewers wait for a report both grow with it. Frame count
also widens the diff surface: any frame that renders a pixel differently makes
the whole snapshot a diff.

File size tends to stay small, because only the part of each frame that changed
is stored. In one measurement, twelve frames of an element moving across a
1280×900 page came to about 36 KB, against 25 KB for a still screenshot of the
same page. [`maxBytes`](#maxbytes) caps it either way.

- **`fps`**: use the lowest rate that still reads as motion. For most UI
  animation (a toast sliding in, a spinner, a progress bar) 8–12 is plenty.
- **`duration`**: leave it at `'auto'` unless the page can't report a length.
- **`maxDuration`**: a safety net, not a target.
- **`maxFrames`**: leave it alone unless one animation really needs more.

If an animation is too long to capture in full at a useful frame rate, decide
which part of it matters most and spend your frames there. Shorten `duration` to
cover just that part, or use [`sampling`](#sampling) to put more frames in that
stretch and fewer everywhere else.

A looping animation (`animation-iteration-count: infinite`) is captured across
exactly one iteration, so the APNG loops without a stutter. A one-shot animation
is captured including its end state.

## The virtual clock

An animation driven by `requestAnimationFrame` has no timeline to seek: its
state lives in whatever its frame callback changes. `clock: 'virtual'` replaces
the page's clock (`Date`, `performance.now()`, `requestAnimationFrame` and
timers), pauses it, and moves it forward one frame at a time.

The clock has to be in place before the page loads, so **it's armed on the
target**. Each story then decides whether it captures:

```js title="happo.config.ts"
export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      animate: { clock: 'virtual' },
    },
  },
});
```

```js title="ProgressRing.stories.js"
export const Filling = {
  parameters: {
    happo: { animate: { mode: 'always', duration: 2000, fps: 10 } },
  },
};
```

- A `requestAnimationFrame` loop can't report its length, so the window is
  `duration` if you set it and `maxDuration` otherwise. Set `duration`.
- A story asking for `clock: 'virtual'` on a target that didn't arm it gets a
  warning, and the capture falls back to seeking.
- The virtual clock costs a little more than seeking, which is why it's opt-in.
- It has no effect in the Cypress and Playwright integrations, whose snapshots
  don't run scripts.
- It can't be combined with [`stages`](#stages).

### Mixing clock-driven and CSS animations

One target can serve both. While the clock steps a story's
`requestAnimationFrame` loop, its CSS animations, transitions and
`element.animate()` animations are still seeked to each frame's time. So a story
with both kinds is captured in step, and a story with only CSS animations works
too: it just goes through the clock's capture path, which captures the whole
page and crops afterwards.

Two things to keep in mind:

- Arm the clock with capture off on the target (`animate: { clock: 'virtual' }`,
  as above) and turn capture on per story. If the target also sets
  `mode: 'auto'`, every story gets a window of `maxDuration`, because the clock
  counts as something to drive. Static stories still come out as still images,
  but only after being captured frame by frame.
- A story that only needs seeking can set `clock: 'off'`, for
  [`stages`](#stages) or to skip the wider capture. The clock stays
  armed on the page; that story just doesn't use it.

## The motion environment

_Available since happo v6.17.0. Storybook stories only._

Some things are decided before a story has finished rendering, which is too late
for anything done afterwards:

- a component that checks `prefers-reduced-motion` when it mounts has already
  decided not to animate;
- a test setup that makes `element.animate()` zero-duration (to keep still
  images still) has already made every animation zero-duration;
- a global rule that turns animations off has already stopped the transitions
  the story starts as it mounts.

So a Storybook story that sets `animate` in its own parameters renders in a
**motion environment**, which is set up right before the story renders and
undone after its screenshot:

- `<html>` gets a `data-happo-animate` attribute.
- Happo's own animation-freezing CSS (the CSS behind
  [`freezeAnimations`](configuration.md#target-freezeanimations)) steps aside,
  so transitions stay alive.
- The story's `prefersReducedMotion` override is applied.
- The story's [`setup` hook](#hooks) runs.

If your Storybook setup turns animations off for Happo, scope that rule so
animated stories are left alone:

```css title=".storybook/preview.css"
html:not([data-happo-animate]) * {
  animation: none !important;
  transition: none !important;
}
```

Only stories get a motion environment. Setting `animate` on a target doesn't
change how stories render.

## Hooks

_Available since happo v6.17.0. Storybook stories only._

A story's `animate` can include functions. They run on the page, next to your
story, and Happo calls into them during the capture:

```js title="Confetti.stories.js"
export const Celebrating = {
  parameters: {
    happo: {
      animate: {
        mode: 'auto',

        // Runs right before the story renders. Return a function to undo it
        // after the screenshot.
        setup: ({ rootElement }) => {
          restoreRealAnimate();
          return () => shimAnimateAgain();
        },

        // Instead of a declarative trigger.
        trigger: async ({ rootElement }) => {
          rootElement.querySelector('button').click();
        },

        // Runs after the capture. Throw to fail it, the way
        // `onExpectationFailure` says.
        verify: trace => {
          if (trace.animationCount < 2) {
            throw new Error('the follow-up animation never started');
          }
        },
      },
    },
  },
};
```

| Hook      | Called                         | With              | Returns                                      |
| --------- | ------------------------------ | ----------------- | -------------------------------------------- |
| `setup`   | Right before the story renders | `{ rootElement }` | Optionally a cleanup function (may be async) |
| `trigger` | When the capture starts        | `{ rootElement }` | Nothing (may be async)                       |
| `verify`  | After the capture              | the trace below   | Nothing; throw to fail the capture           |

A `setup` hook that throws is reported like a failed `verify`: the story didn't
get the environment it asked for.

The trace `verify` receives:

| Field            | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `animationCount` | Animations found, including those found by drivers                                   |
| `svgCount`       | SVG roots with SMIL animations                                                       |
| `driverCounts`   | Animations found per driver, e.g. `{ lottie: 2 }`                                    |
| `animations`     | Up to 20 of them, each `{ kind, name, target, startMs, endMs }`                      |
| `durationMs`     | The capture window, in ms                                                            |
| `frameTimes`     | The times sampled, in ms                                                             |
| `frameCount`     | Distinct frames in the APNG                                                          |
| `stageCount`     | Stages captured                                                                      |
| `stages`         | An array with one entry per stage, each `{ animationCount, durationMs, animations }` |

Hooks are only available on stories. Target, example and page options are sent
to Happo's browsers as plain data, which functions can't be part of.

## Animation drivers

_Available since happo v6.17.0._

Some animations never go through the browser's animation APIs. Anything that
runs its own frame loop, like Lottie or a canvas-based engine, is invisible to
Happo, so it can neither find nor seek it. A driver teaches it how.

### Writing a driver

A driver has a `name` and a `discover(root)` function. `discover` returns a
_handle_ for each animation under `root`, and Happo seeks the handles alongside
everything else, on the same timeline.

Register drivers in your Storybook preview:

```js title=".storybook/preview.js"
import lottie from 'lottie-web';
import { registerAnimationDriver } from 'happo/storybook/register';

registerAnimationDriver({
  name: 'lottie',
  discover: root =>
    lottie
      .getRegisteredAnimations()
      .filter(animation => root.contains(animation.wrapper))
      .map(animation => ({
        target: animation,
        element: animation.wrapper,
        durationMs: (animation.totalFrames / animation.frameRate) * 1000,
        pause: () => animation.pause(),
        seek: timeMs => animation.goToAndStop(timeMs, false),
      })),
});
```

`registerAnimationDriver` does nothing outside a Happo run, so it's safe to
leave in your preview. Outside Storybook (for example in the
[pages integration](full-page.mdx)), register on the global instead:
`window.happoAnimate?.registerDriver({ ... })`.

A handle has:

| Field        | Required    | Meaning                                                                                                                                        |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `seek(ms)`   | Yes         | Render the animation at `ms` milliseconds. May return a promise, which Happo waits for                                                         |
| `durationMs` | Yes         | How long the animation runs, in ms. Counts toward the capture window like any other animation                                                  |
| `target`     | Recommended | What the handle drives. `discover` can be called once per frame, and a handle whose `target` was seen before is the same animation found again |
| `pause()`    | No          | Stop the animation moving on its own                                                                                                           |
| `release()`  | No          | Hand it back after the capture                                                                                                                 |
| `finish()`   | No          | How to end it when a [stage](#stages) is done. Without it, it's seeked to its end                                                  |
| `repeats`    | No          | `true` for a loop, which is captured across one iteration                                                                                      |
| `name`       | No          | Shown in the trace and in expectation failures                                                                                                 |
| `element`    | No          | The element it renders into; shown in the trace                                                                                                |

Guidelines:

- **Return only what's under `root`.** `root` is how a story limits the capture
  to part of the page, and `discover` is also called on the whole page.
- **Make `seek` render synchronously if you can.** If your renderer draws later
  (on a worker, on the next frame), return a promise that resolves once the
  frame is drawn.
- **Don't start anything in `discover`.** It's called repeatedly and should only
  report what already exists.
- **Errors are contained.** A driver that throws is logged and skipped, and the
  rest of the capture carries on.

### Example: a custom frame loop

```js title=".storybook/preview.js"
import { registerAnimationDriver } from 'happo/storybook/register';
import { activeEngines } from '../src/particles';

registerAnimationDriver({
  name: 'particles',
  discover: root =>
    activeEngines
      .filter(engine => root.contains(engine.canvas))
      .map(engine => ({
        target: engine,
        element: engine.canvas,
        durationMs: engine.duration,
        repeats: engine.loop,
        pause: () => engine.stop(),
        seek: timeMs => {
          engine.time = timeMs;
          engine.draw();
        },
      })),
});
```

### Example: a renderer that draws asynchronously

```js
seek: (timeMs) =>
  new Promise((resolve) => {
    renderer.renderAt(timeMs, resolve); // calls back once the frame is drawn
  }),
```

### Example: finishing a stage

When a Lottie's `complete` event mounts the next part of a sequence, give its
handle a `finish()` that plays it out so the event fires:

```js
finish: () => animation.goToAndPlay(animation.totalFrames - 1, true),
```

### Choosing and requiring drivers

Every driver you registered is used by default. A story can pick the ones it
wants with [`drivers`](#drivers):

```js
animate: { mode: 'auto', drivers: ['lottie'] }
```

A driver named there that isn't registered is reported as a warning. To make a
capture fail when a driver finds nothing (e.g. a Lottie that failed to load),
use `expect`:

```js
animate: { mode: 'auto', expect: { drivers: { lottie: 1 } } }
```

### The built-in `video` driver

Videos are normally shown on their first frame. The built-in `video` driver
steps them through the capture instead:

```js
animate: { mode: 'auto', drivers: ['video'], duration: 2000, fps: 4 }
```

It's meant for short clips that are part of the UI, like a looping background or
an animated illustration shipped as a video file, not for long-form video that
people sit and watch. Each seek waits until the frame at that time has actually
been decoded and shown, so frames never show the previous position or a black
frame. A video's length counts toward the capture window, capped by
`maxDuration`, so set a `duration` for anything longer than a few seconds.

Built-in drivers are only used when a story or target names them, so enabling
`mode: 'auto'` doesn't turn every story with a video into an animated snapshot.

## Keeping captures deterministic

A few things happen during a capture so that the same animation produces the
same frames on every run:

- **Animations that already finished are still captured.** Happo records every
  animation from the moment the page loads, so a short entrance that ends while
  Happo is still waiting for fonts and images is rewound rather than missed.
  Animations whose element has since been removed, or that the page cancelled,
  are left out.
- **Page code can't move a captured animation.** While a capture runs, calls
  like `play()`, `pause()` and `finish()` on a captured animation, and writes to
  its `currentTime`, are ignored. Everything is handed back afterwards.
- **The page doesn't see animation events.** Seeking an animation to its end
  fires `animationend` just as playing it would. A listener that reacted, for
  example by removing a class or swapping content, would change every frame, so
  `animation*` and `transition*` events are kept from the page during a capture.
  (With [`stages`](#stages), the ones a finished stage missed are
  delivered when it ends.)
- **Smooth scrolling is off**, so a `scrollTo()` from a trigger lands
  immediately instead of being caught part-way.

## What you get back

An animated snapshot is stored as a `.apng` file and carries two extra fields,
`frameCount` and `durationMs`. `durationMs` is how long the APNG plays for,
which is one frame longer than the window it sampled because the last frame is
held too: a 1-second animation at `fps: 10` plays for 1111 ms.

Runs of identical frames are merged, so an animation that settles early costs
one frame rather than ten, and a page that never actually moved produces a plain
still image. Which one you get is decided by what was captured, not by what was
asked for.

## Browser and integration support

|                                                         | Supported                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `chrome`, `edge`, `firefox`, `safari`                   | Yes                                                                          |
| `ios-safari`, `ipad-safari`                             | No. The run fails with an error explaining why                               |
| `accessibility`                                         | Ignored, since accessibility snapshots aren't images                         |
| [Storybook](storybook.mdx)                              | Yes, including hooks and the motion environment                              |
| [Custom integration](custom.mdx)                        | Yes, per example. No hooks or motion environment                             |
| [Pages](full-page.mdx)                                  | Yes, per page. No hooks or motion environment                                |
| [Cypress](cypress.mdx) and [Playwright](playwright.mdx) | Target-level only. No virtual clock, since their snapshots don't run scripts |

## Troubleshooting

| Symptom                                             | Likely cause and fix                                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A still image where you expected an animation       | The page turned its animation off under reduced motion: set `prefersReducedMotion: false` on `animate`. Or a transition needs a [trigger](#trigger). Add `expect: { minAnimations: 1 }` to catch this in the report. |
| A `requestAnimationFrame` animation comes out still | Arm `clock: 'virtual'` on the target, and turn capture on for the story with a `duration`.                                                                                                                            |
| Only the first part of a sequence is captured       | Later steps start when earlier ones finish. Use [`stages`](#stages) with `expect: { minStages }`.                                                                                                         |
| Staggered items are missing                         | They mount after the capture starts. Use [`discovery`](#discovery).                                                                                                                                  |
| Your own "disable animations" CSS still wins        | Scope it with `html:not([data-happo-animate])`. See [the motion environment](#the-motion-environment).                                                                                                                |
| Lottie or canvas animations don't move              | They need a [driver](#animation-drivers).                                                                                                                                                                                       |
| The snapshot is a box describing a failure          | An [expectation](#expect-and-onexpectationfailure) wasn't met. The box lists what was expected and what was found.                                                                                                                       |
| Too slow or too big                                 | Lower `fps` or `duration` first. See [how to choose values](#how-to-choose-values).                                                                                                                                        |

## TypeScript

Types for all of this are exported from `happo`. `StoryAnimateConfig` is the
type of a story's `parameters.happo.animate` (hooks included), `AnimateConfig`
the type of `animate` on targets, examples and pages, and `AnimationDriver` the
type of a driver.
