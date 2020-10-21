---
id: storybook
title: Storybook
---

The `happo-plugin-storybook` library is a
[happo.io](https://github.com/enduire/happo.io) plugin for Storybook. See [this
blog
post](https://medium.com/happo-io/cross-browser-screenshot-testing-with-happo-io-and-storybook-bfb0b848a97a)
for a lengthier introduction to this plugin.

## Installation

```sh
npm install --save-dev happo.io happo-plugin-storybook
```

## Configuration

Add the following to your `.happo.js` configuration file:

```js
// .happo.js
const happoPluginStorybook = require('happo-plugin-storybook');

module.exports = {
  // ...
  plugins: [
    happoPluginStorybook({
      // options go here
    }),
  ],
};
```

Add this to `.storybook/preview.js` (or `.storybook/config.js` if you're using
Storybook < v5):

```js
// .storybook/preview.js

import 'happo-plugin-storybook/register';
```

Add a `happo` script to `package.json`:

```json
{
  "scripts": { "happo": "happo" }
}
```

## Options

These options are available to the `happoPluginStorybook` function:

- `configDir` specify the name of the Storybook configuration directory. The
  default is `.storybook`.
- `outputDir` the name of the directory where compiled files are saved. The
  default is '.out'.
- `staticDir` directory where to load static files from, comma-separated list.
- `usePrebuiltPackage` set to `true` to skip building storybook and instead use
  an already built package. It's important that the `outputDir` matches the
  place where the prebuilt package is located. Default is `false`.

These options are mostly the same ones used for the `build-storybook` CLI
command. See
https://storybook.js.org/configurations/cli-options/#for-build-storybook

## Running

To execute the test suite, run

```sh
npm run happo run
```

## Tips and Tricks

If you want to have better control over what addons and/or decorators get
loaded you can make use of the `isHappoRun` function exported by
`happo-plugin-storybook/register`:

```js
import { isHappoRun } from 'happo-plugin-storybook/register';

if (!isHappoRun()) {
  // load some addons/decorators that happo won't use
} else {
  // load some addons/decorators that happo will use
}
```

### Disabling a story

In a perfect case scenario, your stories should be built in such a way that all of them work well in Happo environment. Sometimes though you might want to disable some of the stories in Happo preview, i.e. because they depend on dynamic data that can't be accessed from Happo environment.

In such case you can pass `happo: false` story parameter to it:

```js
storiesOf('FooComponent', module)
  .add('Default', () => <FooComponent />);
  .add('Dynamic', () => <DynamicFooComponent />, { happo: false });

// or

storiesOf('FooComponent', module)
  .addParameters({ happo: false })
  .add('Dynamic', () => <DynamicFooComponent />);
```

### Setting delay for a story

Happo will make its best to wait for your stories to render, but at times you
might need a little more control in the form of delays. There are two ways to
set delays: one global and one per story. Here's an example of setting a global
delay:

```js
import { setDefaultDelay } from 'happo-plugin-storybook/register';

setDefaultDelay(100); // in milliseconds
```

Here's how you set an individual delay:

```js
storiesOf('FooComponent', module).add('delayed', () => <FooComponent />, {
  happo: { delay: 200 },
});
```

### Waiting for content

In some cases, examples might not be ready by the time Happo takes the
screenshot. Adding a delay might help, but only if the asynchronous event is
consistently timed. In these cases the `waitForContent` parameter might help.
Let's assume that `PaymentForm` in the example below loads some third-party
iframe that you have no control over, loading a credit card form. In order to
wait for the iframe to finish, we can add a `waitForContent` parameter with
some unique string in the iframe.

```js
storiesOf('PaymentForm', module).add('default', () => <PaymentForm />, {
  happo: { waitForContent: 'Credit card' },
});
```

## Caveats

When you're using this plugin, some of the regular Happo commands and
configuration options aren't available. These include:

- [`include`](configuration.md#include)
- [`type`](configuration.md#type)
- [`customizeWebpackConfig`](configuration.md#customizewebpackconfig)
- [`publicFolders`](configuration.md#publicfolders)
- [`setupScript`](configuration.md#setupscript)
- [`renderWrapperModule`](configuration.md#renderwrappermodule)
- [`rootElementSelector`](configuration.md#rootelementselector)
- [`jsdomOptions`](configuration.md#jsdomoptions)

## Debugging

If you want to debug your test suite similar to how the Happo browser workers do it, you can follow these steps:

1. In a browser, go to the storybook URL. E.g. http://localhost:3000
2. The URL will change to something like http://localhost:3000/?selectedKind=foo&selectedStory=default
3. Change the URL to point to `/iframe.html`, e.g. http://localhost:3000/iframe.html
4. Open the javascript console
5. Paste this javascript snippet and hit enter: `happo.nextExample().then((item) => console.log(item))`
6. Run that code again repeatedly to step through each example (use the arrow up key to reuse the last command)

To quickly run through all examples, follow steps 1-4, then paste this script instead:

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

## Troubleshooting

- Getting a `Failed on worker` error? Make sure you are making a call to `import 'happo-plugin-storybook/register'` in your `.storybook/preview.js` file.
- Getting spurious diffs from fonts not loading? Happo workers will wait for fonts to load before taking the screenshot, but it assumes that fonts it has already seen are already available. Make sure the `@font-face` declaration is declared globally and not part of the stories themselves.
