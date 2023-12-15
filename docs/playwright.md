---
id: playwright
title: Playwright
---

The [`happo-playwright`](https://github.com/happo/happo-playwright) module makes
it easy to integrate a [Playwright](https://playwright.dev/) test suite with
[Happo.io](https://happo.io).

## Pre-requisites

Before you start following the instructions here, you'll need
[a working Playwright setup](https://playwright.dev/docs/intro) and a
[Happo account](https://happo.io/signup).

## Installation

In your project, install the `happo-playwright`, `happo-e2e`, and the `happo.io`
npm modules.

```sh
npm install --save-dev happo-playwright happo-e2e happo.io
```

## Setup

Below is an example Playwright spec file. It takes a screenshot of a Hero image
on an imaginary page. To make the whole flow work, it's important that you call
the `init` and `finish` methods. In this example, we're using a `beforeAll` hook
for initialization and an `afterAll` hook to finish the happo session.

```js
const happoPlaywright = require('happo-playwright');

test.beforeAll(async ({ context }) => {
  await happoPlaywright.init(context);
});

test.afterAll(async () => {
  await happoPlaywright.finish();
});

test('start page', async ({ page }) => {
  await page.goto('http://localhost:7676');

  const heroImage = page.locator('.hero-image');

  await happoPlaywright.screenshot(page, heroImage, {
    component: 'Hero Image',
    variant: 'default',
  });
});
```

You will also need a `.happo.js` file with some minimal/required configuration:

```js
// .happo.js
const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  apiKey: <your api key>,
  apiSecret: <your api secret>,
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
  },
};
```

See https://github.com/happo/happo.io#targets for more configuration options.

NOTE: For security reasons, you'll most likely want to pass in `apiKey` and
`apiSecret` via environment variables:

```js
// .happo.js
module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
  // ... more config
};
```

### Usage

To enable Happo in your test suite, wrap your test command with the `happo-e2e`
script. Here's an example:

```sh
npx happo-e2e -- npx playwright test
```

If you're using [`yarn`](https://yarnpkg.com/), you might have to specify the
double dashes twice (the first one is consumed by `yarn` itself):

```sh
yarn happo-e2e -- -- yarn playwright test
```

If you're not using the `happo-e2e` wrapper, Happo will be disabled for the
whole test suite.

## Allowing failures

By default, no Happo reports are produced when the Playwright run fails. In some
cases, you might want to allow Happo to succeed even if the overall test run
fails. The `--allow-failures` flag for the `happo-e2e` command can then be used:

```sh
npx happo-e2e --allow-failures -- npx playwright test
```

## Selecting targets

If you want to avoid rendering an example in all browser targets (found in
`.happo.js`), you can use the `targets` option. The example will then be
rendered in the specified targets exclusively.

```js
await happoPlaywright.screenshot(page, heroImage, {
  component: 'Footer',
  variant: 'Default',
  targets: ['chrome-small'],
});
```

In this example, the "Footer" snapshot will only be rendered in the target named
`'chrome-small'` found in `.happo.js`.

### Dynamic targets

If you want to create a snapshot in a target that isn't defined in the
`.happo.js` config, you can use an object with `name`, `browser` and `viewport`
properties. Here's an example where a snapshot is taken in a dynamically
generated target:

```js
await happoPlaywright.screenshot(page, heroImage, {
  component: 'Footer',
  variant: 'Default',
  targets: [{ name: 'firefox-small', browser: 'firefox', viewport: '400x800' }],
});
```

Here, "Footer" will only be rendered in a 400x800px Firefox window.

You can mix and match dynamic targets and target names as well:

```js
await happoPlaywright.screenshot(page, heroImage, {
  component: 'Footer',
  variant: 'Default',
  targets: [
    'chrome-small',
    { name: 'firefox-small', browser: 'firefox', viewport: '400x800' },
  ],
});
```

"Footer" is now rendered in Chrome (target specified in `.happo.js`) and Firefox
(dynamic target).


## Continuous Integration

If you run the test suite in a CI environment, the `happo-playwright` module
will do its best to auto-detect your environment and adapt its behavior
accordingly:

- On PR builds, compare the screenshots against the main branch
- On main branch builds, simply create the Happo report

To get the results of the Happo jobs back to your PRs/commits, you need to
install and configure the Happo GitHub app. Instructions are available
[in the Continuous Integration docs](continuous-integration.md#posting-statuses-back-to-prscommits).

Happo auto-detects the following CI environments:

- GitHub Actions
- Circle CI
- Travis CI

If you are using a different CI service, you'll have to set a few environment
variables before invoking the test suite:

- `HAPPO_PREVIOUS_SHA` the commit sha that the branch/PR is based on (usually a
  commit on master). Only set this for PR builds.
- `HAPPO_CURRENT_SHA` the sha of the commit currently under test. Always set
  this.
- `HAPPO_BASE_BRANCH` the default/base branch you use, e.g. `origin/dev`.
  Defaults to `origin/master`, so you only need to set this if you are using a
  different base branch.
- `HAPPO_CHANGE_URL` a url to the PR/commit. Optional.

### Parallel builds

If your Playwright test suite is spread across multiple machines and you want to
get a combined Happo report for all the test runs, you can do the following:

- Set a `HAPPO_NONCE` environment variable, to tie individual runs together. Any
  string unique to the build will do.
- After the whole test suite is done, call `npx happo-e2e finalize`. Make sure
  that the same `HAPPO_NONCE` environment variable is set as for the individual
  builds.

In some CI tools, you can use a built-in environment variable as `HAPPO_NONCE`.
In CircleCI for instance, you can use
[ `HAPPO_NONCE=${CIRCLE_WORKFLOW_ID}`](https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables).
You can also use a timestamp or a randomly generated string. The important thing
is that it's unique to the current CI run.

### Email notifications

If you set a `HAPPO_NOTIFY` environment variable as part of your Cypress run, an
email will be sent out when the Happo comparison report is ready.

Usage instructions for `HAPPO_NOTIFY` is available in
[the Continuous Integration docs](continuous-integration.md#email-notifications).

## Advanced usage

### Setting a port for `happo-e2e`

When you're running the `happo-e2e --` wrapper, a web server is used internally.
By default, this server is listening on port 5339. If you need to change that,
pass a `--port` argument, like so:

```bash
npx happo-e2e --port 5432 -- npx cypress run
```

### Download all assets

By default, happo-cypress will download assets found locally and include in an
assets package sent to happo.io. Any external URL will be left as-is, which
means they are expected to be publicly accessible by Happo workers. To include
external assets in the assets package as well, set a `HAPPO_DOWNLOAD_ALL`
environment variable.

```bash
HAPPO_DOWNLOAD_ALL=true npx happo-e2e -- npx cypress run
```

With this environment variable set, all assets are assumed to be private (i.e.
not publicly accessible).

### Skipping snapshots

If you run a subset of the tests in your test suite, Happo will show "Deleted
examples" in the report. To prevent this from happening, you can pass a
`--skippedExamples` option to the `happo-e2e finalize` call.

The `--skippedExamples` option needs to be an array coded as a JSON string. Each
item in the array needs a `component`, `variant`, and `target`, all strings.
Here's an example call:

```sh
happo-e2e finalize --skippedExamples '[{"component":"Button","variant":"default","target":"chrome-small"}]'
```

Remember to skip examples in all targets you have defined in .happo.js. If you
for instance have targets named "chrome-small" & "firefox-large" in .happo.js,
you should add two items per snapshot you are skipping. E.g.

```sh
happo-e2e finalize --skippedExamples '[{"component":"Button","variant":"default","target":"chrome-small"}, {"component":"Button","variant":"default","target":"firefox-large"}]'
```

Finding the skipped snapshots can be a little tricky, but a little bit of code
introspection could help. Here's an example of a script that can serve as a
base:
https://github.com/happo/happo-e2e/issues/21#issuecomment-1825776491

## Troubleshooting

### I need support!

We're here to help — send an email to support@happo.io and we'll assist you.

### Happo isn't producing any screenshots

The `happo-playwright` module will disable itself if it can't detect any api
tokens (`apiKey` and `apiSecret` in config). Check to make sure your `.happo.js`
config is properly set up. There might also be more information in the console
logs from Cypress. Look for lines starting with `[HAPPO]`.

### Where are my screenshots?

During test suite execution, Happo will only record information. All screenshots
are taken asynchronously outside of the test run. This means that your test
suite will finish sooner than the Happo job is done. To follow along the
progress, look for a url logged by Happo:

```bash
[HAPPO] https://happo.io/a/284/async-reports/34
```

### Styles are missing from my screenshots

Styles and assets are collected automatically during your test suite. If you
notice styles/images/fonts etc are missing, one of a few things might have
happened:

- CSS selectors depend on context that is missing to Happo. If you e.g. have
  something like `#start-page .header { color: red }` and screenshoot `.header`,
  the red color will be missing. This is because Happo only sees the `.header`
  element, never the surrounding page.
- There could be a bug in how `happo-cypress` collects styles and assets. Reach
  out to support@happo.io and we'll triage.
