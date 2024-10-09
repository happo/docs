---
id: spurious-diffs
title: Spurious/flaky diffs
---

An important factor when constructing a good screenshot testing setup is to keep
the number of flaky diffs to a minimum. A flaky diff (i.e. spurious diff or
false positive) is when Happo finds a visual difference that isn't caused by a
change in the code. These may involve (but are not limited to):

- image loading
- font loading
- asynchronous behavior (e.g. components fetching data)
- animations
- random data, counters, etc
- dates, timestamps, etc
- stack traces

Happo tries to take care of as many of these as possible, automatically. For
instance, the following tasks are performed before taking the screenshot:

- wait for images (including background images and `srcset`)
- wait for custom fonts
- wait for asynchronous data fetching (XHR, `window.fetch`)
- disable CSS animations/transitions
- stop SVG animations

## Tips & tricks

In some cases however, Happo can't automatically detect things that cause flaky
diffs. Here are some tips & tricks that you might find useful when dealing with
flaky diffs.

### Dates and timestamps

If you have dates/timestamps, either injecting a fixed
`new Date('2024-05-23T08:28:02.446Z')` into your component or freezing time via
something like [mockdate](https://www.npmjs.com/package/mockdate) or
[Sinon.js](https://sinonjs.org/) can help.

### External data

If a component depends on external data (e.g. via an API), consider splitting
out the data fetching from the visual component and test the visual component
without data fetching, injecting the data needed to render it.

### Animations

If you have animations controlled from JavaScript, find a way to disable them
for the Happo test suite.

#### `prefers-reduced-motion` media query

One way to avoid flaky diffs caused by animations is to disable animations for
browsers that signal they prefer reduced motion and
[configure your Happo targets to use the `prefersReducedMotion` option](./configuration#target-prefersreducedmotion).

### Stack traces

If you have components that throw errors, consider catching them and rendering a
normalized error message. This is especially useful if you have components that
render stack traces, which are likely to change between test runs.

One way to normalize these stack traces in a React component is to use an error
boundary. Here's an example:

```jsx
import { ErrorBoundary } from 'react-error-boundary';

// https://github.com/bvaughn/react-error-boundary?tab=readme-ov-file#errorboundary-with-fallbackrender-prop
const fallbackRender = ({ error }) => {
  // We need to sanitize ports, asset hashes, and line/col numbers from
  // the stack trace to make the Happo diffs stabilized.
  error.stack = error.stack.replace(
    /http:\/\/localhost:\d{4}.*?:\d+:\d+/g,
    'http://localhost:1234/path-to-file.1234abcd.bundle.js:1234:56',
  );

  throw error;
};

export const MiscFailing = () => (
  <ErrorBoundary fallbackRender={fallbackRender}>
    <ComponentThatThrows />
  </ErrorBoundary>
);
```

### Hiding content with `data-happo-hide`

If individual elements are known to cause spuriousness,
[consider adding the `data-happo-hide` attribute](hiding-content.md). This will
render the element invisible in the screenshot. E.g.
`<div data-happo-hide>{Math.random()}</div>`.
