---
id: storybook
title: Storybook
---

The `happo-plugin-storybook` library is a
[happo.io](https://github.com/enduire/happo.io) plugin for Storybook. See
[this blog post](https://medium.com/happo-io/cross-browser-screenshot-testing-with-happo-io-and-storybook-bfb0b848a97a)
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

### The Happo addons panel

If you're using React, you can add a Happo panel to your Storybook UI. This is
optional but makes it easier to test hooks and see Happo parameters for your
stories.

Add this to `.storybook/main.js`:

```js
module.exports = {
  addons: ['happo-plugin-storybook/preset'],
};
```

Add this to `.storybook/preview.js`:

```js
// .storybook/preview.js
import happoDecorator from 'happo-plugin-storybook/decorator';

export const decorators = [happoDecorator];
```

## Options

These options are available to the `happoPluginStorybook` function:

- `configDir` specify the name of the Storybook configuration directory. The
  default is `'.storybook'`.
- `outputDir` the name of the directory where compiled files are saved. The
  default is `'.out'`.
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

If you want to have better control over what addons and/or decorators get loaded
you can make use of the `isHappoRun` function exported by
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

If some of your stories aren't well suited for Happo, you can disable them by
setting a `happo: false` parameter. This can be done in the default export to
globally disable all stories in the same file, or individually on certain
stories.

<!--DOCUSAURUS_CODE_TABS-->
<!-- CSF -->

```js
export default {
  title: 'FooComponent',
  parameters: {
    happo: false, // this will disable all `FooComponent` stories
  },
};

const WithBorder = () => <FooComponent bordered />;

WithBorder.parameters = {
  happo: false, // this will disable the `WithBorder` story
};

export { WithBorder };
```

<!-- storiesOf -->

```js
storiesOf('FooComponent', module)
  .add('Default', () => <FooComponent />);
  .add('Dynamic', () => <DynamicFooComponent />, { happo: false });

// or

storiesOf('FooComponent', module)
  .addParameters({ happo: false })
  .add('Dynamic', () => <DynamicFooComponent />);
```

<!--END_DOCUSAURUS_CODE_TABS-->

### Dark mode and themes

If you want to take screenshots in more than one theme, you can make Happo
automatically render stories in several themes. This is great if you for
instance want to make sure that your components look right in both dark mode and
light mode.

Start by adding a `happo.themes` parameter to one or more of your stories:

```js
const Foo = () => <FooExample />;
Foo.parameters = {
  happo: {
    themes: ['light', 'dark'],
  },
};
export { Foo };
```

Additionally, you also need to provide Happo with a "theme switcher" function.
The `happo-plugin-storybook/register` import will export a `setThemeSwitcher`
function that will allow you to control theme switching. Here's an example that
makes use of `storybook-dark-mode`:

```js
// .storybook/preview.js
import { setThemeSwitcher } from 'happo-plugin-storybook/register';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

setThemeSwitcher((theme, channel) => {
  return new Promise(resolve => {
    const isDarkMode = theme === 'dark';

    // Listen for dark mode to change and resolve.
    channel.once(DARK_MODE_EVENT_NAME, resolve);
    // Change the theme.
    channel.emit(DARK_MODE_EVENT_NAME, isDarkMode);
  });
});
```

The `theme` passed to your theme switcher function is the name of the theme that
Happo wants to switch to. If we use the `Foo` example from above, it will be
either the string `'light'` or the string `'dark'`.

The `channel` parameter passed to your theme switcher as the second argument is
[the addons channel](https://storybook.js.org/docs/vue/addons/addons-api#addonsgetchannel).
You can use this to subscribe to and send events.

If you want to set `happo.themes` globally for all stories, the best way is
through the `parameters` export in `.storybook/preview.js`:

```js
// .storybook/preview.js

export const parameters = {
  happo: { themes: ['light', 'dark'] },
};
```

### Limiting targets

If you want to avoid rendering an example in all targets, you can use a
`targets` array defined for an example. The example will then be rendered in the
specified targets exclusively.

<!--DOCUSAURUS_CODE_TABS-->
<!-- CSF -->

```js
export default {
  title: 'FooComponent',
  parameters: {
    happo: {
      targets: ['chrome-small'],
    },
  },
};
```

<!-- storiesOf -->

```js
storiesOf('FooComponent', module)
  .add('Default', () => <FooComponent />, { happo: { targets: ['chrome-small'] });

// or

storiesOf('FooComponent', module)
  .addParameters({ happo: { targets: ['chrome-small'] })
  .add('Default', () => <FooComponent />);
```

<!--END_DOCUSAURUS_CODE_TABS-->

In the example above, the FooComponent > Default story will only be rendered in
the target named `chrome-small` (defined in
[`.happo.js`](configuration.md#targets)).

### Waiting for content

In some cases, examples might not be ready by the time Happo takes the
screenshot. Adding a delay might help, but only if the asynchronous event is
consistently timed. In these cases the `waitForContent` parameter might help.
Let's assume that `PaymentForm` in the example below loads some third-party
iframe that you have no control over, loading a credit card form. In order to
wait for the iframe to finish, we can add a `waitForContent` parameter with some
unique string in the iframe.

<!--DOCUSAURUS_CODE_TABS-->
<!-- CSF -->

```js
const Basic = () => <PaymentForm />;
Basic.parameters = {
  happo: {
    waitForContent: 'Credit card',
  },
};
export { Basic };
```

<!-- storiesOf -->

```js
storiesOf('PaymentForm', module).add('default', () => <PaymentForm />, {
  happo: { waitForContent: 'Credit card' },
});
```

<!--END_DOCUSAURUS_CODE_TABS-->

### Waiting for a condition to be truthy

To make Happo wait with the screenshot until a condition has been met, use the
`waitFor` option. Specify a function that returns true (or anything truthy) when
the time is right to take the screenshot.

Here's an example that waits for a specific element (`.credit-card`) to appear:

<!--DOCUSAURUS_CODE_TABS-->
<!-- CSF -->

```js
const Basic = () => <PaymentForm />;
Basic.parameters = {
  happo: {
    waitFor: () => document.querySelector('.credit-card'),
  },
};
export { Basic };
```

<!-- storiesOf -->

```js
storiesOf('PaymentForm', module).add('default', () => <PaymentForm />, {
  happo: { waitFor: () => document.querySelector('.credit-card') },
});
```

<!--END_DOCUSAURUS_CODE_TABS-->

Here's another example that waits for a specific number of elements:

<!--DOCUSAURUS_CODE_TABS-->
<!-- CSF -->

```js
const Basic = () => <PaymentForm />;
Basic.parameters = {
  happo: {
    waitFor: () => document.querySelectorAll('.validation-output').length === 5,
  },
};
export { Basic };
```

<!-- storiesOf -->

```js
storiesOf('PaymentForm', module).add('default', () => <PaymentForm />, {
  happo: {
    waitFor: () => document.querySelectorAll('.validation-output').length === 5,
  },
});
```

<!--END_DOCUSAURUS_CODE_TABS-->

To test this function you can use the Happo panel. There will be an "Invoke"
button next to the `waitFor` parameter. Click it to run the function. To make
the "Invoke" button appear, you need to set
[`core.channelOptions.allowFunction` to `true`](https://storybook.js.org/docs/api/main-config/main-config-core#channeloptionsallowfunction)
in `.storybook/main.js`.

### Setting delay for a story

> Use delays only as a last resort. They slow down your test suite and rarely
> get to the bottom of the issue.

Happo will make its best to wait for your stories to render, but at times you
might need a little more control in the form of delays. Use the `happo.delay`
parameter to set an individual delay for a story:

<!--DOCUSAURUS_CODE_TABS-->
<!-- CSF -->

```js
export default {
  title: 'FooComponent',
  parameters: {
    happo: {
      delay: 200, // set a 200ms delay for all FooComponent stories
    },
  },
};

const WithBorder = () => <FooComponent bordered />;

WithBorder.parameters = {
  happo: {
    delay: 1000, // Set a 1000ms delay for the WithBorder story
  },
};

export { WithBorder };
```

<!-- storiesOf -->

```js
storiesOf('FooComponent', module).add('delayed', () => <FooComponent />, {
  happo: { delay: 200 },
});
```

<!--END_DOCUSAURUS_CODE_TABS-->

### Overriding the default render timeout

By default, Happo will wait up to 2 seconds for a story to complete. In some
cases, you might have to increase this timeout to allow certain things to finish
up properly. An example could be if you have a story with a `play` function
using `userEvent.type` with a delay.

```js
import { userEvent } from '@storybook/testing-library';

export const InteractiveStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), 'some longer text', {
      delay: 200,
    });
  },
};
```

This story would take over 3 seconds to finish. To make happo wait that long,
you can use `setRenderTimeoutMs` to increase the timeout.

```js
// .storybook/preview.js
import { setRenderTimeoutMs } from 'happo-plugin-storybook/register';

setRenderTimeoutMs(5000);
```

Setting a longer timeout won't affect rendering times for fast/regular stories.
It is only in effect if you use
[the `play` function](https://storybook.js.org/docs/react/writing-stories/play-function)
to do interactions, or if you use
[`waitFor`](#waiting-for-a-condition-to-be-truthy) or
[`waitForContent`](#waiting-for-content).

### The `beforeScreenshot` hook

If you need to interact with the DOM before a screenshot is taken you can use
the `beforeScreenshot` option. This parameter, expected to be a function, is
called right before Happo takes the screenshot. You can use this to e.g. click a
button, enter text in an input field, remove certain elements, etc.

Here's an example where a button is clicked to open a modal:

```js
const BasicModal = () => <ModalExample />;
BasicModal.parameters = {
  happo: {
    beforeScreenshot: () => {
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false,
      });
      document.querySelector('button.open-modal').dispatchEvent(clickEvent);
    },
  },
};
export { BasicModal };
```

You can use `async` here as well:

```js
const BasicModal = () => <ModalExample />;
BasicModal.parameters = {
  happo: {
    beforeScreenshot: async () => {
      await doSomethingAsync();
    },
  },
};
export { BasicModal };
```

To test this function you can use the Happo panel. There will be an "Invoke"
button next to the `beforeScreenshot` parameter. Click it to run the function.
To make the "Invoke" button appear, you need to set
[`core.channelOptions.allowFunction` to `true`](https://storybook.js.org/docs/api/main-config/main-config-core#channeloptionsallowfunction)
in `.storybook/main.js`.

### The `afterScreenshot` hook

Similar to `beforeScreenshot`, this hook can be used to clean up things from the
DOM after a story has been fully processed.

Here's an example where a lingering DOM element is removed.

```js
const Foo = () => <FooExample />;
Foo.parameters = {
  happo: {
    afterScreenshot: () => {
      document.querySelector('.some-selector').remove();
    },
  },
};
export { Foo };
```

Same as for `beforeScreenshot`, you can use `async` as well.

To test this function you can use the Happo panel. There will be an "Invoke"
button next to the `afterScreenshot` parameter. Click it to run the function. To
make the "Invoke" button appear, you need to set
[`core.channelOptions.allowFunction` to `true`](https://storybook.js.org/docs/api/main-config/main-config-core#channeloptionsallowfunction)
in `.storybook/main.js`.

### Using `forceHappoScreenshot`

If you are using the
[play function ](https://storybook.js.org/docs/react/writing-stories/play-function)
and the
[Interactions addon](https://storybook.js.org/docs/react/essentials/interactions)
you can force Happo to take screenshots of different steps along the way. Here's
an example of a Dropdown story that we open and close in two different steps:

```js
import { forceHappoScreenshot } from 'happo-plugin-storybook/register';

export const Dropdown = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('open', async () => {
      await userEvent.click(canvas.getByRole('button'));
      await expect(canvas.getByText('Edit item')).toBeInTheDocument();
      await forceHappoScreenshot('open');
    });

    await step('closed', async () => {
      await userEvent.click(canvas.getByRole('button'));
      await expect(canvas.getByText('Edit item')).not.toBeInTheDocument();
      await forceHappoScreenshot('closed');
    });
  },
};
```

The `forceHappoScreenshot` function takes a string argument which will be used
to identify the story in the Happo report. In the above example, you will see
these snapshots:

- Dropdown > Default-open
- Dropdown > Default-closed
- Dropdown > Default

Apart from taking all the "forced" screenshot, Happo also takes one screenshot
of the "finished" state of the play function. This means that you could
potentially omit the last step in the play execution, since it will be part of
the Happo report anyway.

Under the hood, `forceHappoScreenshot` throws an error that gets picked up by
Happo. This means that the play function will be invoked several times,
restarting execution from the beginning (until Happo finds a step that it hasn't
seen before). When the `play` function is executed outside of Happo (e.g. when
you're using the Storybook UI), the `forceHappoScreenshot` call will simply be
ignored.

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

If you want to debug your test suite similar to how Happo workers process jobs,
you can follow these steps:

1. In a browser, go to the storybook URL. E.g. http://localhost:3000
2. The URL will change to something like
   http://localhost:3000/?selectedKind=foo&selectedStory=default
3. Change the URL to point to `/iframe.html`, e.g.
   http://localhost:3000/iframe.html
4. Open the JavaScript console
5. Paste this JavaScript snippet and hit enter:
   `happo.nextExample().then((item) => console.log(item))`
6. Run that code again repeatedly to step through each example (use the arrow up
   key to reuse the last command)

To quickly run through all examples, follow steps 1-4, then paste this script
instead:

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

## Troubleshooting

- Getting a `Failed on worker` error? Make sure you are making a call to
  `import 'happo-plugin-storybook/register'` in your `.storybook/preview.js`
  file.
- Getting spurious diffs from fonts not loading? Happo workers will wait for
  fonts to load before taking the screenshot, but it assumes that fonts it has
  already seen are already available. Make sure the `@font-face` declaration is
  declared globally and not part of the stories themselves.
