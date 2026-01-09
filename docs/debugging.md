---
id: debugging
title: Debugging
---

Here's a list of tips & tricks you can use when your test suite isn't working
the way you've intended.

## View source

If the screenshots aren't looking right you can use the "View source" feature.
You'll find it in the overflow menu to the right of a diff/screenshot:

![How to find the "View source" option](/img/happo-view-source.gif) _This is
where you find the "View source" option for a Happo report._

You'll land on the Source page. It looks something like this:
![The Source page](/img/happo-source-page.png) _The Source page for an "Alert"
snapshot_

The Source page has some details about what was used to produce the screenshot,
and there are a few buttons here that can be useful. Depending on the type of
integration you are using, you'll see one or more of these buttons:

- A "View recorded HTML" button (for [Happo Examples](examples.md) and
  [Cypress setups](cypress.md)) that allow you to see the rendered HTML directly
  in the browser, along with the CSS used.
- A "Download assets" button, where you can grab the images, fonts, etc, that
  were used when taking the screenshot.
- A "Download static package" button that let's you fetch the statically built
  package used to render the example. This will e.g. show up if you're using
  [Storybook](storybook.md), or if you're using [Happo Examples](examples.md)
  with the `prerender: false` option.
- A "Re-generate snapshot" button, that will let you retry taking the
  screenshot. Continue reading for more on this option!

### Re-generate snapshot

If you are using an up-to-date
[`happo` package](https://www.npmjs.com/package/happo) v6.0.0 or later, you can
tell Happo to retry taking the screenshot. Once that's done, the associated
report (or reports in some cases) will be updated to use the new screenshot.
Please note that updating the reports can take a minute or two to fully
propagate (because of caching).

### Static package downloads

When you download a static package as a zip file, you can debug the source
locally by following these steps:

1. Unzip the downloaded file
2. Start a http server in the unzipped folder
   ([`http-server`](https://www.npmjs.com/package/http-server) is a good option)
3. Check the URL where the server is started and open
   [`http://localhost:8080/iframe.html`](http://localhost:8080/iframe.html) in
   your browser (replace `8080` with the port used for your server).
4. Wait for the page to load, then open up a JavaScript console and run
   `window.happo.nextExample()`.
5. See your first component load.
6. Keep calling `window.happo.nextExample()` to iterate through your components.

If you quickly want to iterate through all components, copy and paste this
script in the JavaScript console:

```js
window.happo.init({ chunk: { index: 0, total: 1 } });
var renderIter = function () {
  window.happo.nextExample().then(function (a) {
    if (!a) {
      return;
    }
    console.log(a);
    requestAnimationFrame(() => renderIter());
  });
};
renderIter();
```

### Profiling static packages

When debugging performance issues or memory leaks in your static packages,
Chrome DevTools provides powerful profiling tools. Here's how to use them:

#### Running the profiler in Chrome DevTools

1. Open Chrome DevTools (F12 or Cmd+Option+I on Mac)
2. Navigate to the **Performance** tab
3. Click the **Record** button (or press Cmd+E / Ctrl+E)
4. Interact with your static package (e.g., call `window.happo.nextExample()` to
   cycle through components, or use the `renderIter()` setup described above)
5. Click **Stop** when you're done recording
6. Analyze the timeline to identify performance bottlenecks, long tasks, or
   memory issues

#### Creating a heap snapshot for Detached Nodes

Detached Nodes are DOM elements that have been removed from the document tree
but are still referenced in JavaScript, preventing garbage collection and
causing memory leaks. This is a common source of slowness in Happo test suites,
and can cause instability (browser crashes, timeouts) on the Happo workers.

To identify Detached Nodes:

1. Open Chrome DevTools and go to the **Memory** tab
2. Select **Detached elements** in the list of profiling types
3. Click **Take snapshot**
4. Review the list of detached nodes to identify which elements are not being
   properly cleaned up

#### Tips for getting rid of Detached Nodes

Detached Nodes often occur when event listeners, timers, or references to DOM
elements aren't cleaned up when components unmount. Here's a React example
showing the problem and solution:

**Before (causing Detached Nodes):**

```jsx
function MyComponent() {
  const [count, setCount] = useState(0);

  // ❌ Event listener is never cleaned up
  useEffect(() => {
    const handleClick = () => {
      setCount(c => c + 1);
    };
    document.addEventListener('click', handleClick);
  }, []);

  return <div>Count: {count}</div>;
}
```

**After (properly cleaned up):**

```jsx
function MyComponent() {
  const [count, setCount] = useState(0);

  // ✅ Event listener is cleaned up on unmount
  useEffect(() => {
    const handleClick = () => {
      setCount(c => c + 1);
    };
    document.addEventListener('click', handleClick);

    // Cleanup function removes the event listener
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return <div>Count: {count}</div>;
}
```

Common sources of Detached Nodes and how to fix them:

- **Event listeners**: Always remove event listeners in the cleanup function of
  `useEffect`
- **Timers**: Clear `setInterval` and `setTimeout` in cleanup functions
- **Subscriptions**: Unsubscribe from observables, WebSocket connections, or
  other subscriptions
- **DOM references**: Avoid storing references to DOM elements in component
  state or refs that persist after unmount

## Failed on worker

In some cases, your happo runs will fail with a `Failed on worker` message. In
some cases, there's an additional error message that might hint at why the job
failed. To see this error message, go to your
[Happo dashboard](https://happo.io/dashboard), look under "Snap-requests" and
click on the one that has a failure icon.

### `Timed out while waiting for window.happo`

A common error when using [the Storybook integration](storybook.md) is
`Timed out while waiting for window.happo`. This is often caused by missing to
register the `happo-plugin-storybook` plugin. See how to get rid of this in
[the Storybook docs](storybook.md#troubleshooting).
