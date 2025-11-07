---
id: performance
title: Performance
---

Short feedback cycles help you ship faster. Waiting for CI to finish is neither
fun nor productive. We work hard to keep Happo as fast as we possibly can
without sacrificing robustness.

Conventional screenshot testing setups are typically slow to run. Happo tries to
do better by running things in parallel and optimizing how screenshot images are
stored. The time it takes to run Happo will mostly be decided by the following
factors:

- component rendering speed
- test suite complexity
- number of targets
- component dimensions
- type of browsers you are targeting
- Happo queue size

Keep complexity down by reducing the number of images and other assets in your
tests, avoid testing the same elements multiple times, and keep components
isolated.

Browsers perform differently. The fastest ones we have are Chrome and Firefox,
capable of producing more than 10 screenshots per second. Other browsers are
slightly slower and will max out at 5-10 screenshots per second. Choose your
[targets](configuration.md#targets) wisely as the performance of your test suite
is mostly going to be decided by your slowest target. The (global) average time
it takes to produce a screenshot on a Happo worker is 200 ms.

## Component performance

Timing information is displayed below each screenshot in a Happo comparison. It
looks like this:

```
Render 44 ms • Wait 53 ms • Screenshot 106 ms
```

### Render performance

`Render` is the time it takes to render the component.

The average component render time for across all Happo customers is 117
milliseconds. However, some Happo customers like Patreon have a much faster test
suite with an average component render time of 65 milliseconds. At Happo, our
internal projects average 17 milliseconds.

The render time is largely dependent on the component's complexity. Components
with a lot of moving parts, such as those with many children or complex state
and style changes, will naturally take longer to render.

If you are noticing extremely long render times, it may be caused by needing to
wait for slow interactions to complete or the component encountering an infinite
render loop.

To troubleshoot slow render times, render the component in isolation in the same
browser that Happo is using, and use the browser's dev tools to profile the
component
([Chrome devTools documentation](https://developer.chrome.com/docs/devtools/performance)).

If you notice that render times are significantly worse in one specific browser
but not others, you may be encountering a browser quirk or browser bug with your
component's implementation.

Improving your render times for Happo will also improve performance in your
production app.

### Wait performance

`Wait` is the time the browser has to wait for all of the component's assets
such as images and fonts to finish loading.

To improve your wait time, try to avoid using external resources where possible,
and reuse assets across examples to maximize browser cache utilization. Smaller
images in modern formats will load faster than larger images in older and less
optimized formats.

### Screenshot performance

`Screenshot` is the time it takes to capture a screenshot image of the
component.

The screenshot time is largely dependent on the dimensions of the screenshot
that is being taken and whether everything fits within the configured viewport.

Browsers also perform differently, so the screenshot time will vary between
browsers.

To improve your screenshot time, prefer taking smaller screenshots of smaller
components instead of larger screenshots of larger components. Avoid combining
multiple unrelated components in the same screenshot.

## Test suite execution time

To calculate the execution time for a test suite, you can use this rough
formula:

```
npm install time +
precompilation (optional) +
prerendering (optional) +
(number of examples × 200ms) +
between 2 and 20 seconds network time/time in queue
= total happo time
```

The 200 milliseconds per screenshot is a global average for all Happo projects.
For smaller components, this number is a lot smaller, so don't worry if your
test suite consists of a lot of examples.

## Examples in the wild

### Mineral UI

[Mineral UI](https://github.com/mineral-ui/mineral-ui/) is a UI toolkit. They
have ~350 snapshots in their test suite. Happo runs take about 4 mins in CI. Out
of that, ~3 mins is spent `npm install`ing and building files, then the actual
Happo run takes just over a minute. They use a "generated examples" approach
where they use an already-existing style guide to generate happo examples. The
Happo config and a call to the happo script is what's required to get things
working in CI.

### Airbnb's Lunar project

[Airbnb's Lunar project](https://github.com/airbnb/lunar) has a slightly more
complex setup. They have ~600 snapshots. Happo tests are split up in two
projects — one with a light theme and one with a dark theme. Happo CI runs take
10 mins in total (5 mins installing and building, 5 mins taking screenshots).
They use the happo-plugin-storybook plugin where happo examples are taken
straight from a Storybook setup. The config required to get happo running in CI
involves a Happo config file and a call to the happo script.
