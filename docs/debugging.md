---
id: debugging
title: Debugging
---

Here's a list of tips & tricks you can use when your test suite isn't working
the way you've intended.

## View source

If the screenshots aren't looking right you can use the "View source" feature.
You'll find it in the overflow menu to the right of a diff/screenshot:

![How to find the "View source" option](/img/happo-view-source.gif)
_This is where you find the "View source" option for a Happo report._

Depending on the type of integration you are using, the view source option
leads to one of two things:

- For [Happo Examples](examples.md) and [Cypress setups](cypress.md), you'll
  land on a page where the source html and css is rendered.
- For [Storybook integrations](storybook.md) and [when using `prerender: false`](configuration.md#prerender), the source is a zip file.

### Rendered source

This page shows you roughly what Happo workers saw when they rendered the
component. You can inspect the DOM to make sure the right HTML and CSS is
present. It is an estimation though, and there are some caveats:

- Assets (images/fonts/etc) aren't available (although you'll see them
  referenced in the source)
- There will be an additional wrapper element that the Happo workers won't
  have. This elemet can affect styling.

### Zip file sources

When you get a zip file source, you can debug the source locally by following these steps:

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
var renderIter = function() {
  window.happo.nextExample().then(function(a) {
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
failed. To see this error message, go to your [Happo
dashboard](https://happo.io/dashboard), look under "Snap-requests" and click on
the one that has a failure icon.

### `Timed out while waiting for window.happo`
A common error when using [the Storybook integration](storybook.md) is `Timed
out while waiting for window.happo`. This is often caused by missing to
register the `happo-plugin-storybook` plugin. See how to get rid of this in
[the Storybook docs](storybook.md#troubleshooting).
