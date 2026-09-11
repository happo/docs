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
      animate: 'auto',
    },
  },
});
```

`'auto'` captures an animated snapshot only when the page has an animation Happo
can drive, and takes an ordinary still of everything else. That makes it safe to
enable for a whole target: static stories cost nothing extra.

Most animations need nothing more. The rest of this page covers the ones that
do: transitions that need to be triggered, animations that start late or start
one another, pages that turn their own animations off, and animations that don't
use the browser's animation APIs at all (such as Lottie).

## What can be captured

| Kind                                                     | Captured                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| CSS animations (`@keyframes`)                            | Yes                                                                 |
| CSS transitions                                          | Yes, when something starts them — see [triggers](#triggers)         |
| `element.animate()` (Web Animations API)                 | Yes                                                                 |
| SVG SMIL animations (`<animate>`, `<animateTransform>`…) | Yes                                                                 |
| `requestAnimationFrame` loops                            | Yes, with [the virtual clock](#the-virtual-clock)                   |
| Lottie, canvas engines, anything with its own frame loop | Yes, with a [driver](#drivers)                                      |
| `<video>`                                                | Yes, with the built-in [`video` driver](#the-built-in-video-driver) |
| Scroll-driven animations (`ScrollTimeline`)              | No — their progress is scroll position, not time                    |
| View transitions                                         | Not yet                                                             |

Happo drives animations by _seeking_: it pauses each one and asks it to render
at an exact time, rather than letting it play and taking screenshots as it goes.
That's what makes the same animation produce the same frames on every run.

## Where to configure it

`animate` can be set on a target, on a Storybook story, and on a page in the
[pages integration](full-page.mdx). Story and page options merge over the
target's, field by field.

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

A story can add to the target's options — a target with
`{ mode: 'auto', fps: 15 }` and a story with `{ maxFrames: 60 }` capture with
all three — or opt out with `animate: false`.

A story that sets `animate` itself also renders in a
[motion environment](#the-motion-environment), and can use [hooks](#hooks),
which a target can't.

### On a page

```js title="happo.config.ts"
export default defineConfig({
  integration: {
    type: 'pages',
    pages: [{ url: 'https://example.com/', title: 'Home', animate: 'auto' }],
  },
});
```

### Shorthands

| Shorthand         | Means                |
| ----------------- | -------------------- |
| `animate: 'auto'` | `{ mode: 'auto' }`   |
| `animate: true`   | `{ mode: 'always' }` |
| `animate: false`  | `{ mode: 'off' }`    |

## Options

| Option                 | Type                                                                    | Default                          | Since   |
| ---------------------- | ----------------------------------------------------------------------- | -------------------------------- | ------- |
| `mode`                 | `'off'` \| `'auto'` \| `'always'`                                       | `'off'`                          | v6.15.0 |
| `duration`             | `number` \| `'auto'`                                                    | `'auto'`                         | v6.15.0 |
| `maxDuration`          | `number`                                                                | `4000`                           | v6.15.0 |
| `fps`                  | `number`                                                                | `10`                             | v6.15.0 |
| `maxFrames`            | `number`                                                                | `24`                             | v6.15.0 |
| `clock`                | `'off'` \| `'virtual'`                                                  | `'off'`                          | v6.15.0 |
| `trigger`              | `AnimateTrigger` \| function \| `null`                                  | `null`                           | v6.15.0 |
| `loop`                 | `number`                                                                | `0`                              | v6.15.0 |
| `maxBytes`             | `number`                                                                | `4000000`                        | v6.15.0 |
| `prefersReducedMotion` | `boolean` \| `null`                                                     | `null`                           | v6.16.0 |
| `discovery`            | `number` \| `{ settleMs, maxFrames }`                                   | `{ settleMs: 0, maxFrames: 90 }` | v6.17.0 |
| `sampling`             | `'uniform'` \| `{ split, front, tail }` \| `{ times }`                  | `'uniform'`                      | v6.17.0 |
| `root`                 | `string` \| `null`                                                      | `null`                           | v6.17.0 |
| `expect`               | `{ minAnimations, minFrames, triggered, minStages, drivers }` \| `null` | `null`                           | v6.17.0 |
| `onExpectationFailure` | `'image'` \| `'fail'` \| `'warn'`                                       | `'image'`                        | v6.17.0 |
| `stages`               | `number` \| `{ max, waitMs }`                                           | `{ max: 1, waitMs: 1000 }`       | v6.17.0 |
| `drivers`              | `string[]` \| `null`                                                    | `null`                           | v6.17.0 |
| `setup` (story only)   | function                                                                | —                                | v6.17.0 |
| `verify` (story only)  | function                                                                | —                                | v6.17.0 |

What each one does:

- **`mode`** — `'off'` takes a still. `'auto'` captures an animation when there
  is one Happo can drive, and a still otherwise. `'always'` captures even when
  nothing on the page reports how long it runs, using `maxDuration` as the
  window — needed for `requestAnimationFrame` loops and SMIL.
- **`duration`** — the capture window in milliseconds, or `'auto'` to take it
  from the animations on the page (the longest one wins).
- **`maxDuration`** — the ceiling for a derived duration, and the window used by
  `mode: 'always'`.
- **`fps`** — samples per _second_ of animation. 500 ms at `fps: 6` is 3 frames,
  not 6.
- **`maxFrames`** — a hard cap on the number of frames. Wins over
  `fps × duration`. Between 2 and 120.
- **`clock`** — `'virtual'` replaces the page's clock so `requestAnimationFrame`
  animations can be stepped. See [the virtual clock](#the-virtual-clock).
- **`trigger`** — what to do to the page to start the animation. See
  [triggers](#triggers).
- **`loop`** — how many times the APNG plays; `0` loops forever.
- **`maxBytes`** — the size budget for the encoded file. When it's exceeded,
  frames are dropped (every other one, repeatedly) rather than the snapshot.
- **`prefersReducedMotion`** — overrides the target's `prefersReducedMotion` for
  this capture. See [reduced motion](#reduced-motion).
- **`discovery`** — keep looking for animations that only start after the
  capture does. See [animations that start late](#animations-that-start-late).
- **`sampling`** — where in the window frames are taken. See
  [sampling](#sampling).
- **`root`** — a CSS selector limiting which animations are captured. See
  [limiting the capture to part of the page](#limiting-the-capture-to-part-of-the-page).
- **`expect`** and **`onExpectationFailure`** — what a capture has to find, and
  what happens when it doesn't. See [expectations](#expectations).
- **`stages`** — capture animations that start one another, one stage at a time.
  See [chained animations](#chained-animations).
- **`drivers`** — which [drivers](#drivers) to use. `null` uses every driver you
  registered; naming one is also how you enable a built-in driver.
- **`setup`**, **`verify`**, and a function `trigger` — [hooks](#hooks) that run
  on the page. Stories only.

## Choosing values

Start with `animate: 'auto'` and change nothing else. The defaults are meant to
be boring, and most animations don't need tuning.

**Frame count is the cost.** Every frame is a full screenshot, so a 24-frame
snapshot takes roughly 24 times as long to capture as a still. Run time and the
time reviewers wait for a report both grow with it. Frame count also widens the
diff surface: any frame that renders a pixel differently makes the whole
snapshot a diff.

File size is rarely the problem. Only the part of each frame that changed is
stored, so twelve frames of a small element moving across a large page come to
little more than a single still.

- **`fps`** — use the lowest rate that still reads as motion. For most UI
  animation (a toast sliding in, a spinner, a progress bar) 8–12 is plenty.
- **`duration`** — leave it at `'auto'`; a hand-set duration goes stale when the
  CSS changes. Set it for SMIL, `requestAnimationFrame` loops, and long videos,
  which can't report a useful one.
- **`maxDuration`** — a safety net for long or infinite animations, not a
  target. Lowering it below an animation's real length captures the opening and
  stops.
- **`maxFrames`** — the backstop that stops a high `fps` from producing a
  hundred screenshots. Leave it alone unless one animation really needs more.

If an animation is too long to capture in full, capture the first second or two
at a normal frame rate rather than the whole thing at two frames a second. The
interesting part of most animations is the start.

A looping animation (`animation-iteration-count: infinite`) is captured across
exactly one iteration, so the APNG loops without a stutter. A one-shot animation
is captured including its end state.

## Triggers

A CSS transition doesn't exist until the property it watches changes, so there's
nothing to capture until something changes it. A trigger does that before the
capture starts:

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

Setting a trigger turns capturing on by itself — you don't also need `mode` —
but it won't override a `mode` you set explicitly, including `'off'`.

| `action`                   | `value`                       | Notes                                                      |
| -------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `addClass` / `removeClass` | class name                    |                                                            |
| `setAttribute`             | `{ name, value }` or a string | A bare string sets that attribute to `""`                  |
| `removeAttribute`          | attribute name                |                                                            |
| `click`                    | —                             | Calls `element.click()`, so your click handlers run        |
| `focus`                    | —                             |                                                            |
| `hover`                    | —                             | Moves a real pointer over the element, so `:hover` applies |

The selector is matched through shadow roots.

### Trigger functions

_Available since happo v6.17.0._

In a story, `trigger` can also be a function, which runs on the page with the
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

- Use `mode: 'always'` with it: a `requestAnimationFrame` loop never reports a
  duration of its own, so `'auto'` would find nothing to capture.
- A story asking for `clock: 'virtual'` on a target that didn't arm it gets a
  warning in the run log, and the capture falls back to seeking.
- The virtual clock costs a little more than seeking, which is why it's opt-in.
- It has no effect for plain HTML/CSS snapshots, which don't run scripts.
- It can't be combined with [`stages`](#chained-animations).

## Animations that start late

_Available since happo v6.17.0._

Happo pauses every animation it finds when the capture starts. Anything that
starts afterwards on its own — the items of a staggered list mounted on timers
after a click, content that arrives after a fetch — isn't there yet, and would
be missed.

`discovery` keeps looking for a while, one frame at a time, and takes over each
new animation as it appears:

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

An animation found late keeps its place in time: it starts in the capture at the
moment it appeared, so a stagger stays a stagger. Until then it shows its first
keyframe.

| Field       | Default | Meaning                                                       |
| ----------- | ------- | ------------------------------------------------------------- |
| `settleMs`  | `0`     | How long to keep looking, in ms (up to 10000). `0` looks once |
| `maxFrames` | `90`    | The most of the page's frames the search may take             |

`discovery: 600` is short for `{ settleMs: 600 }`.

> **Note:** Anything that waits for timers depends on when they fire. Happo
> rounds offsets to whole frames so small timing jitter doesn't change the
> result, but an animation that starts a frame late on a slow run — or right at
> the end of the window — can come out differently.

## Chained animations

_Available since happo v6.17.0._

Some animations are a sequence where each step starts the next: a panel slides
in, and when it's done a list staggers in, and then a Lottie plays. The next
step usually only exists once the previous one finishes — its completion handler
mounts it — so it can't be found up front.

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

Happo captures the current stage, then lets it finish — so its `finished`
promises, `animationend` handlers and the like run — and whatever animations
appear next become the next stage. All stages go into one APNG, each sampled
from its own start, so the same chain produces the same frames on every run.

| Field    | Default | Meaning                                                     |
| -------- | ------- | ----------------------------------------------------------- |
| `max`    | `1`     | The most stages to capture (up to 16). `1` means no staging |
| `waitMs` | `1000`  | How long to wait for the next stage to appear, in ms        |

`stages: 4` is short for `{ max: 4 }`. The capture stops at the first of:

- `max` stages;
- nothing new appearing within `waitMs`;
- everything new looking like something already captured — the same kind of
  animation on the same element with the same length — which is a chain that
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
- A [driver](#drivers) can decide how its animations finish a stage, with a
  `finish()` on its handles.

## Sampling

_Available since happo v6.17.0._

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
| `'uniform'`              | Evenly, at `fps` (the default)                                                                                          |
| `{ split, front, tail }` | `front` frames across the first `split` (0.05–0.95) of the window, `tail` across the rest. Always ends on the end state |
| `{ times }`              | Exactly these times. The end state is included only if you list it                                                      |

Both alternatives ignore `fps`. `maxFrames` still applies: a split asking for
more is scaled down, and extra `times` are dropped.

However the frames are spread, the APNG plays at the animation's real speed:
each frame stays on screen until the time of the next sample. Uneven sampling
makes playback smoother in some stretches and choppier in others, never faster
or slower.

## Limiting the capture to part of the page

_Available since happo v6.17.0._

`root` is a CSS selector (matched through shadow roots). Only the animations
inside it are captured, and only they decide the capture window:

```js
animate: { mode: 'auto', root: '[data-testid="notification-panel"]' }
```

`root` scopes the animations, not the image: the snapshot still shows the whole
story. Animations outside `root` are held on their first frame, as in a still.
If `root` matches nothing, nothing is captured and you get a still.

## Expectations

_Available since happo v6.17.0._

A capture that finds nothing falls back to a still. That's what makes
`mode: 'auto'` safe across a whole target, but for a story that exists to show
an animation it's the wrong kind of quiet: the animation broke, the snapshot is
a perfectly plausible still, and nothing fails.

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
| `minStages`     | At least this many [stages](#chained-animations) captured                  |
| `drivers`       | At least this many animations per [driver](#drivers), e.g. `{ lottie: 1 }` |

When a check fails, `onExpectationFailure` decides what happens:

- **`'image'`** (default) — the snapshot is replaced with an image describing
  the failure: what was expected, and every animation that was found. It shows
  up in the report as a diff that explains itself.
- **`'fail'`** — the run fails with the same description.
- **`'warn'`** — the description goes to the run log and the capture is kept.

`expect` merges field by field like the rest of `animate`. A common pattern is
to set checks on the target and let the occasional deliberately still story opt
out with `expect: null`.

## Reduced motion

Targets prefer reduced motion by default (see
[`prefersReducedMotion`](configuration.md#target-prefersreducedmotion)), and a
page that respects that preference usually turns its own animations off:

```css
@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}
```

With that CSS in place there's nothing to capture, and the snapshot is a still.
That's correct by default — it's what the page shows — and the reduced-motion
version is often worth a snapshot of its own.

_Available since happo v6.16.0._ To capture the full-motion version, set
`prefersReducedMotion: false` on `animate` itself, for a whole target or for one
story:

```js
animate: { mode: 'auto', prefersReducedMotion: false }
```

This switches the preference for just that capture. Every other snapshot still
renders under the target's own setting. It also works the other way:
`prefersReducedMotion: true` forces reduced motion for one capture on a target
that has it turned off.

For a story that sets it, the override is applied _before the story renders_
(since v6.17.0), so components that check the preference when they mount — with
`matchMedia`, say — see it too.

## The motion environment

_Available since happo v6.17.0._

Some things are decided before a story has finished rendering, which is too late
for anything done afterwards:

- a component that checks `prefers-reduced-motion` when it mounts has already
  decided not to animate;
- a test setup that makes `element.animate()` zero-duration (to keep stills
  still) has already made every animation zero-duration;
- a global rule that turns animations off has already stopped the transitions
  the story starts as it mounts.

So a Storybook story that sets `animate` in its own parameters renders in a
**motion environment**, which is set up right before the story renders and
undone after its screenshot:

- `<html>` gets a `data-happo-animate` attribute.
- Happo's own animation-freezing CSS steps aside, so transitions stay alive.
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

_Available since happo v6.17.0._

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

| Field            | Meaning                                                    |
| ---------------- | ---------------------------------------------------------- |
| `animationCount` | Animations found, including those found by drivers         |
| `svgCount`       | SVG roots with SMIL animations                             |
| `driverCounts`   | Animations found per driver, e.g. `{ lottie: 2 }`          |
| `animations`     | Up to 20 of them: `{ kind, name, target, startMs, endMs }` |
| `durationMs`     | The capture window, in ms                                  |
| `frameTimes`     | The times sampled, in ms                                   |
| `frameCount`     | Distinct frames in the APNG                                |
| `stageCount`     | Stages captured                                            |
| `stages`         | Per stage: `{ animationCount, durationMs, animations }`    |

Hooks are only available on stories. Target and page options are sent to Happo's
browsers as plain data, which functions can't be part of.

## Drivers

_Available since happo v6.17.0._

Some animations never go through the browser's animation APIs — anything that
runs its own frame loop, like Lottie or a canvas-based engine — so Happo can
neither find nor seek them. A driver teaches it to.

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
| `finish()`   | No          | How to end it when a [stage](#chained-animations) is done. Without it, it's seeked to its end                                                  |
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
wants with `drivers`:

```js
animate: { mode: 'auto', drivers: ['lottie'] }
```

A driver named there that isn't registered is reported in the run log. To make a
capture fail when a driver finds nothing — a Lottie that failed to load, say —
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

Each seek waits until the frame at that time has actually been decoded and
shown, so frames never show the previous position or a black frame. A video's
length counts toward the capture window, capped by `maxDuration`, so set a
`duration` for anything long.

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
  fires `animationend` just as playing it would. A listener that reacted — by
  removing a class or swapping content — would change every frame, so
  `animation*` and `transition*` events are kept from the page during a capture.
  (With [`stages`](#chained-animations), the ones a finished stage missed are
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
still. Which one you get is decided by what was captured, not by what was asked
for.

## Browser and integration support

|                                       | Supported                                       |
| ------------------------------------- | ----------------------------------------------- |
| `chrome`, `edge`, `firefox`, `safari` | Yes                                             |
| `ios-safari`, `ipad-safari`           | No — the run fails with an error explaining why |
| `accessibility`                       | Ignored — accessibility snapshots aren't images |
| Storybook                             | Yes                                             |
| Pages                                 | Yes                                             |
| Plain HTML/CSS snapshots              | Yes, except the virtual clock (no scripts run)  |

## Troubleshooting

| Symptom                                             | Likely cause and fix                                                                                                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A still where you expected an animation             | The page turned its animation off under reduced motion — set `prefersReducedMotion: false` on `animate`. Or a transition needs a [trigger](#triggers). Add `expect: { minAnimations: 1 }` to catch this in the report. |
| A `requestAnimationFrame` animation comes out still | Arm `clock: 'virtual'` on the target and use `mode: 'always'` on the story.                                                                                                                                            |
| Only the first part of a sequence is captured       | Later steps start when earlier ones finish — use [`stages`](#chained-animations) with `expect: { minStages }`.                                                                                                         |
| Staggered items are missing                         | They mount after the capture starts — use [`discovery`](#animations-that-start-late).                                                                                                                                  |
| Your own "disable animations" CSS still wins        | Scope it with `html:not([data-happo-animate])` — see [the motion environment](#the-motion-environment).                                                                                                                |
| Lottie or canvas animations don't move              | They need a [driver](#drivers).                                                                                                                                                                                        |
| The snapshot is a red box describing a failure      | An [expectation](#expectations) wasn't met. The box lists what was expected and what was found.                                                                                                                        |
| Too slow or too big                                 | Lower `fps` or `duration` first; see [choosing values](#choosing-values).                                                                                                                                              |

## TypeScript

The option and driver types are exported from `happo`:

```ts
import type {
  AnimateConfig,
  AnimateOptions,
  AnimateTrigger,
  AnimateTrace,
  AnimationDriver,
  AnimationDriverHandle,
  StoryAnimateOptions,
} from 'happo';
```

`StoryAnimateOptions` is `AnimateOptions` plus the story-only hooks, and is what
`parameters.happo.animate` accepts.
