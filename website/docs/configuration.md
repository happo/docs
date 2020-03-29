---
id: configuration
title: Configuration
---

Happo will look for configuration in a `.happo.js` file in the current working
folder. You can override the path to this file through the `--config` CLI
option or a `HAPPO_CONFIG_FILE` environment variable. The config file isn't
subject to babel transpilation, so it's best to stay with good old CommonJS
syntax unless you're on the very latest Node version. The configuration file
can either export an object containing the configuration options or an (async)
function that resolves with the configuration options.

## `apiKey` and `apiSecret`

These tokens will authenticate you with happo.io. It is recommended to never
store these tokens in plain text. Use environment variables instead.

```js
module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
};
```

## `targets`

This is where you specify the browsers you want to be part of your happo run. E.g.

```js
module.exports = {
  targets: {
    // The first part ('firefox-desktop' in this case) is just a name we give
    // the specific browser target. You'll see this name in the reports generated
    // as part of a happo run.
    'firefox-desktop': new RemoteBrowserTarget('firefox', {
      viewport: '1024x768',
    }),
    'firefox-mobile': new RemoteBrowserTarget('firefox', {
      viewport: '320x640',
    }),
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '800x600',
    }),
    'internet explorer': new RemoteBrowserTarget('internet explorer', {
      viewport: '800x600',
    }),
  },
};
```

Viewports can range from `300x300` to `2000x2000` for Chrome and Firefox. Edge, Internet Explorer and Safari
need to be in the `400x400` to `1200x1200` range. The `ios-safari` target runs on iPhone 7 which means the
viewport config is always `375x667`.

This is a list of all supported browsers:

- `firefox`
- `chrome`
- `internet explorer` (version 11)
- `edge`
- `safari`
- `ios-safari` (runs on iPhone 7)

### Target `chunks`

Targets are executed in parallel by default. If you want to split up a specific
target into multiple chunks (running in parallel), the experimental `chunks`
option for `RemoteBrowserTarget` can help out:

```js
module.exports = {
  targets: {
    ie: new RemoteBrowserTarget('internet explorer', {
      viewport: '1024x768',
      chunks: 2,
    }),
  },
};
```

Happo.io will do its best to run chunks in parallel, but there's no guarantee.
The `chunks` option also has some overhead. If your test suite isn't large,
using more than one chunk might actually slow things down.

### Target `maxHeight`

You can also use `maxHeight` to override the default max height used by Happo
workers (5000 pixels). This is useful if you're taking screenshots of long
components/pages in your test suite. An example:

```js
module.exports = {
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
      maxHeight: 10000,
    }),
  },
};
```

### Target `scrollStitch`

This option is available in the `safari` and `internet explorer` targets (it
has no effect in other targets). By default, these browsers cut off their
screenshots at window height. If you need to include content "below the fold",
you can use the `scrollStitch` option. When enabled, the full screenshot will
be constructed by scrolling the page section by section, then stitching
together a full screenshot when all sections are available.

```js
module.exports = {
  targets: {
    safari: new RemoteBrowserTarget('safari', {
      viewport: '1024x768',
      scrollStitch: true,
    }),
    ie: new RemoteBrowserTarget('internet explorer', {
      viewport: '1024x768',
      scrollStitch: true,
    }),
  },
};
```

## `project`

If you have multiple projects configured for your happo.io account, you can
specify the name of the project you want to associate with. If you leave this
empty, the default project will be used.

## `include`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

Controls what files happo will grab examples from. The default is
`'**/@(*-happo|happo).@(js|jsx)'`. This option is useful if you want to apply a
different naming scheme, e.g. `**/*-examples.js`.

## `stylesheets`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

If you rely on external stylesheets, list their URLs or (absolute) file paths
in this config option, e.g. `['/path/to/file.css', 'http://cdn/style.css']`. If
you're using [conditionally applied
stylesheets](#conditionally-applied-stylesheets), you need to use objects
instead of paths:

```js
module.exports = {
  stylesheets: [
    { id: 'main', source: '/path/to/main.css' },
    { id: 'secondary', source: '/path/to/conditional.css', conditional: true },
  ],
};
```

By default, all stylesheets are applied at render time. If you specify
`conditional: true`, only those examples that conditionally apply the
stylesheet will get styles applied from that stylesheet.

## `type`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

Either `react` (default) or `plain`. Decides what strategy happo will use when
rendering examples. When the value is `react`, it is assumed that example
functions return a React component (e.g. `export default () => <Foo />`). When
the value is `plain`, it is assumed that example functions write things
straight to `document`, e.g.
`export default () => { document.body.appendChild(foo()) }`.

## `customizeWebpackConfig`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

A function you can use to override or modify the default webpack config used
internally by happo during a run. Make sure to always return the passed in
`config`. E.g.

```js
module.exports = {
  customizeWebpackConfig: config => {
    config.module.rules.push({
      test: /\.css$/,
      use: [{ loader: cssLoader }],
    });
    // it's important that we return the modified config
    return config;
  },
};
```

In many cases, directly depending on the `modules` object of an existing
webpack configuration is enough. For instance, this is what you would need to
get up and running with a project using
[create-react-app](https://github.com/facebook/create-react-app):

```js
const craWebpackConfig = require('react-scripts/config/webpack.config');

module.exports = {
  customizeWebpackConfig: config => {
    // Use the built-in webpack config provided by create-react-app
    config.module = craWebpackConfig('development').module;
    return config;
  },
};
```

If you need to perform asynchronous actions to generate a webpack
configuration, you can return a promise that resolves with the config once you
are done. Here's an example using async/await:

```js
module.exports = {
  customizeWebpackConfig: async config => {
    config.module = await doSomethingAsync();
    return config;
  },
};
```

## `plugins`

An array of happo plugins. Find available plugins in the [Plugins](#plugins)
section.

```js
const happoPluginStorybook = require('happo-plugin-storybook');

module.exports = {
  plugins: [happoPluginStorybook()],
};
```

## `publicFolders`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

An array of (absolute) paths specifying the places where public assets are
located. Useful if you have examples that depend on publicly available images
(e.g. `<img src="/foo.png" />`).

```js
const path = require('path');

module.exports = {
  publicFolders: [path.resolve(__dirname, 'src/public')],
};
```

## `prerender`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

Controls whether or not examples are pre-rendered in a JSDOM environment (or
Chrome if you are using
[happo-plugin-puppeteer](https://github.com/happo/happo-plugin-puppeteer)). The
default is `true`. Set to `false` to let your examples render remotely on the
happo.io browser workers instead. This can help resolve certain rendering
issues (e.g. when using a shadow DOM). The downside of rendering remotely is
that errors are harder to surface.

```js
module.exports = {
  prerender: false,
};
```

## `pages`

An array containing pages that you want to screenshot. E.g.

```js
module.exports = {
  pages: [
    { url: 'https://www.google.com/', title: 'Google' },
    { url: 'https://www.airbnb.com/', title: 'Airbnb' },
  ],
};
```

The `url` of a page needs to be publicly accessible, else the Happo browser
workers won't be able to find it.

The `title` of a page is used as the "component" identifier in the happo.io UI,
so make sure it is unique for each page.

_Note:_ when you're using the `pages` config, most other configuration options
are ignored.

## `setupScript`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

An absolute path to a file that will be executed before rendering your
components. This is useful if you for instance want to inject global css
styling (e.g. a css reset), custom fonts, polyfills etc. This script is
executed in a DOM environment, so it's safe to inject things into the `<head>`.

```js
const path = require('path');

module.exports = {
  setupScript: path.resolve(__dirname, 'happoSetup.js'),
};
```

## `renderWrapperModule`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

An absolute path to a file exporting a function where you can wrap rendering of
Happo examples. This can be useful if you for instance have a theme provider or
a store provider.

```js
// .happo.js
const path = require('path');

module.exports = {
  renderWrapperModule: path.resolve(__dirname, 'happoWrapper.js'),
};
```

```js
// happoWrapper.js
import React from 'react';
import ThemeProvider from '../ThemeProvider';

export default component => <ThemeProvider>{component}</ThemeProvider>;
```

## `rootElementSelector`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

A selector used to find a DOM element that Happo will use as the container. In
most cases, you should leave this empty and let Happo figure out the root
element itself. But in some cases its useful to override the default behavior
and provide a different root. An example would be if you have wrapper
components that you don't want to be part of the screenshot.

```js
module.exports = {
  rootElementSelector: '.react-live-preview',
};
```

(example from [mineral-ui](https://github.com/mineral-ui/mineral-ui/blob/e48a47d917477b58e496fe43edbfa4bb6ceb88e9/.happo.js#L35))

## `tmpdir`

Happo uses webpack internally. By default, bundles are created in the temp
folder provided by the operating system. You can override where bundles are
stored with the `tmpdir` configuration option.

```js
module.exports = {
  tmpdir: '/some/absolute/path/to/an/existing/folder',
};
```

## `jsdomOptions`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

Happo uses jsdom internally. By default, it provides sane defaults to the
`JSDOM` constructor. See
[processSnapsInBundle.js](src/processSnapsInBundle.js). You can override any
options here but your mileage may vary. See
https://github.com/jsdom/jsdom#simple-options. Here's an example where the
document's `referrer` is being set:

```js
module.exports = {
  jsdomOptions: {
    referrer: 'http://google.com',
  },
};
```

## `compareThreshold`

By default, a shallow comparison is made when `happo compare` is called. If two
images have one or more different pixels, it will be reported as a diff --
even if the diff is very small. If you set a `compareThreshold`, a deep
comparison will be performed instead, where individual pixels are inspected.

A color distance is computed for every diffing pixel. If all diffing pixels have
a color distance smaller than the `compareThreshold`, the diff is considered
okay and the two images will be considered visually equal.

The difference is calculated according to the paper ["Measuring perceived color
difference using YIQ NTSC transmission color space in mobile applications" by
Y. Kotsarenko and F.
Ramos](http://www.progmat.uaem.mx:8080/artVol2Num2/Articulo3Vol2Num2.pdf).

A **word of warning** here. If the threshold is too high, you risk hiding diffs
that you wouldn't want to be hidden. Be careful when you start using this
option.

```js
module.exports = {
  compareThreshold: 0.005,
};
```

To help find the right value to use, you can make dry-run comparisons. Find one
or a few comparisons (via https://happo.io/dashboard) and run `happo compare <sha1> <sha2> --dry-run` on the SHAs and look at what's being logged to figure
out what threshold value you want to use.

## `asyncTimeout`

> This option only applies when you're using [the Happo Examples
> integration](examples.md)

If an example renders nothing to the DOM, Happo will wait a short while for content to appear. Specified in milliseconds, the default is `200`.

```js
module.exports = {
  asyncTimeout: 500,
};
```

## `githubApiUrl`

Used when you have the CI script configured to [post Happo statuses as
comments](continuous-integration#posting-statuses-without-installing-the-happo-github-app).
The default if `https://api.github.com`. If you're using GitHub Enterprise,
enter the URL to the local GitHub API here, e.g.
`https://ghe.mycompany.zone/api/v3` (the default for GHE installation is for
the API to be located at `/api/v3`).