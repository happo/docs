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

The Source page has some details about what was used to produce the
screenshot, and there are a few buttons here that can be useful. Depending on
the type of integration you are using, you'll see one or more of these buttons:

- A "View recorded HTML" button (for [Happo Examples](examples.md) and [Cypress
  setups](cypress.md)) that allow you to see the rendered HTML directly in the
  browser, along with the CSS used.
- A "Download assets" button, where you can grab the images, fonts, etc, that
  were used when taking the screenshot.
- A "Download static package" button that let's you fetch the statically built
  package used to render the example. This will e.g. show up if you're using
  [Storybook](storybook.md), or if you're using [Happo Examples](examples.md)
  with the `prerender: false` option.
- A "Re-generate snapshot" button, that will let you retry taking the
  screenshot. Continue reading for more on this option!


### Re-generate snapshot

If you are using up-to-date happo libraries
([happo.io](https://www.npmjs.com/package/happo.io) v9.1.0 or later,
[happo-plugin-storybook](https://www.npmjs.com/package/happo-plugin-storybook)
v4.1.0 or later,
[happo-static](https://www.npmjs.com/package/happo-static) v1.0.0 or later),
you can tell Happo to retry taking the screenshot. Once that's done, the
associated report (or reports in some cases) will be updated to use the new
screenshot. Please note that updating the reports can take a minute or two to
fully propagate (because of caching).

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
var renderIter = function () {
  window.happo.nextExample().then(function (a) {
    if (!a) {
      return;
    }
    console.log(a);
    renderIter();
  });
};
renderIter();
```

## Run in VERBOSE mode

If you want to know what Happo is doing _before_ it hands over to the Happo
backend, you can invoke the CLI with a `VERBOSE=true` environment variable.

```sh
VERBOSE=true npm run happo run
```

This will increase the amount of logs generated during the happo run. Depending
on the integration type you're using, it will also store payloads so that you
can inspect the html and css created

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
