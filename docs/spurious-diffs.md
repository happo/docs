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
[Sinon.js](https://sinonjs.org/) can help. You can also use the
[`data-happo-hide` attribute](hiding-content.md) on the DOM element with the
timestamp.

### External data

If a component depends on external data (e.g. via an API), consider splitting
out the data fetching from the visual component and test the visual component
without data fetching, injecting the data needed to render it.

### Font loading issues

Font loading can be a common source of flaky diffs, especially when using
external font CDNs. While Happo automatically waits for custom fonts to load,
there are several scenarios where font loading can still cause inconsistencies:

#### CDN throttling and rate limiting

External font CDNs may throttle or rate-limit requests coming from the same IP
or IP range. This is particularly problematic for Happo since it generates
significant traffic to font URLs during screenshot testing. When throttling
occurs, fonts may take longer to load or fail to load entirely, causing the
browser to fall back to system fonts.

**Symptoms may include:**

- Inconsistent font rendering between test runs
- Fallback fonts being used instead of custom fonts

**Solutions:**

1. **Use locally hosted fonts:** The most stable solution is to host fonts
   locally within your testing environment. This eliminates external
   dependencies and ensures consistent font loading.
1. **Disable throttling for font URLs:** Contact your CDN provider to disable
   rate limiting for font URLs from your Happo testing environment. Using a
   custom header on outgoing requests using the
   [`outgoingRequestHeaders` option](configuration.md#target-outgoingrequestheaders)
   could make CDN configuration simpler.

### AVIF images

Avoid using images served in [AVIF format](https://en.wikipedia.org/wiki/AVIF).
These are known to render in a non-deterministic way which will cause small but
significant changes in pixel output. Use WEBP, PNG or JPG instead. If your
images are served by a CDN, it's possible that they are automatically converted
to AVIF even if the original image was of a different format.

### Animations

Happo freezes most types of animations (e.g. CSS transitions & animations, SVG
animations, etc). But if you have animations controlled from JavaScript, you
need to find a way to disable them for the Happo test suite.

**Examples of animations Happo can stop automatically:**

- CSS transitions, e.g. `.hero-img { transition: opacity 0.3s }`
- CSS animations, e.g. `.nav-menu { animation: fade-in 0.3s }`
- SVG animations, e.g.
  `<rect><animate attributeName="rx" values="0;5;0" dur="10s" /></rect>`

**Example of an animation that you need to disable yourself:**

```js
const element = document.getElementById('some-element-you-want-to-animate');
let start;

function step(timestamp) {
  if (start === undefined) {
    start = timestamp;
  }
  const elapsed = timestamp - start;

  const shift = 0.1 * elapsed;
  element.style.transform = `translateX(${shift}px)`;
  if (shift < 200) {
    requestAnimationFrame(step);
  }
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // The browser isn't asking for reduced motion -- start the animation!
  requestAnimationFrame(step);
}
```

#### `prefers-reduced-motion` media query

One way to avoid flaky diffs caused by animations is to disable animations for
browsers that signal they prefer reduced motion. By default,
[Happo is configured to prefer reduced motion](./configuration#target-prefersreducedmotion).

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
render the element invisible in the screenshot. Example:

```jsx
<div data-happo-hide>{Math.random()}</div>
```
