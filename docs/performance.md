---
id: performance
title: Performance
---

Short feedback cycles help you ship faster. Waiting for CI to finish is neither
fun nor productive. We work hard to keep Happo as fast as we possibly can
without sacrificing robustness.

Conventional screenshot testing setups are typically slow to run. Happo tries
to do better by running things in parallell, caching previous runs and
optimizing how screenshot images are stored. The time it takes to run Happo
will mostly be decided by a few factors:

- The complexity of your test suite.
- What browsers you are targeting.
- The dimensions of your components.

Keep complexity down by reducing the number of images and other assets in your
tests, avoid testing the same elements multiple times, and keep components
isolated.

Browsers perform differently. The fastest ones we have are Chrome and Firefox,
capable of producing more than 10 screenshots per second. Internet Explorer is
the slowest one, with peak performance of about 2.5 screenshots per second. Choose
your [targets](configuration.md#targets) wisely as the performance of your test
suite is mostly going to be decided by your slowest target. The (global)
average time it takes to produce a screenshot on a Happo worker is 200 ms.

## Examples in the wild

### Mineral UI

[Mineral UI](https://github.com/mineral-ui/mineral-ui/) is a UI toolkit.
They have ~350 snapshots in their test suite. Happo runs take about 4 mins in
CI. Out of that, ~3 mins is spent `npm install`ing and building files, then
the actual Happo run takes just over a minute. They use a "generated examples"
approach where they use an already-existing style guide to generate happo
examples. The `.happo.js` config and a call to the `happo-ci-travis` script
provided by the happo.io library is what's required to get things working in
CI.

### Airbnb's Lunar project

[Airbnb's Lunar project](https://github.com/airbnb/lunar) has a slightly more
complex setup.  They have ~600 snapshots. Happo tests are split up in two
projects — one with a light theme and one with a dark theme. Happo CI runs take
10 mins in total (5 mins installing and building, 5 mins taking screenshots).
They use the happo-plugin-storybook plugin where happo examples are taken
straight from a Storybook setup. The config required to get happo running in CI
involves a .happo.js file and a call to the `happo-ci-travis` script provided
by the happo.io library.

## Execution time

To calculate the execution time for a test suite, you can use this rough formula:

```
npm install time +
precompilation (optional) +
prerendering (optional) +
(number of examples × 200ms) +
between 2 and 20 seconds network time/time in queue
= total happo time
```

The 200 milliseconds per screenshot is a global average for all Happo.io
projects. For smaller components, this number is a lot smaller, so don't worry
if your test suite consists of a lot of examples.
