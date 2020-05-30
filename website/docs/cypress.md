---
id: cypress
title: Cypress
---

The `happo-cypress` module adds [Happo.io](https://happo.io) cross-browser
screenshots to your [Cypress.io](https://cypress.io) test suite.

Check out the
[`happo-cypress-example-todomvc`](https://github.com/happo/happo-cypress-example-todomvc)
for a demo of how this module is used.

## Pre-requisites

Before you start following the instructions here, you'll need [a working
Cypress test
suite](https://docs.cypress.io/guides/getting-started/installing-cypress.html)
and a [Happo account](https://happo.io/signup).

## Installation

In your project, install the `happo-cypress` and the `happo.io` npm modules.

```sh
npm install --save-dev happo-cypress happo.io
```

## Setup

Import the `happo-cypress` module in your `cypress/support/commands.js` file:

```js
// At the top of cypress/support/commands.js
import 'happo-cypress';
```

Then, add the provided `happoTask` in your `cypress/plugins/index.js` file:

```js
// In cypress/plugins/index.js
const happoTask = require('happo-cypress/task');

module.exports = (on, config) => {
  on('task', happoTask);
};
```

Add a `.happo.js` file with some minimal/required configuration:

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

Lastly, you'll need to wrap your calls to `cypress run` with a call to
`happo-cypress`. Here's an example:

```sh
npx happo-cypress -- npx cypress run
```

Your tests won't fail if you forget this call, but the behavior will be slightly
different. Without the `happo-cypress` prefix, each test file will yield a Happo
report (a set of screenshots). With the prefix, the whole test suite will yield
one Happo report.

## Usage

To record Happo screenshots in your test suite, use `happoScreenshot`:

```js
describe('Home page', function () {
  it('loads properly', function () {
    cy.visit('/');
    cy.get('.header').happoScreenshot();
  });
});
```

Happo focuses more on component screenshots as opposed to full-page
screenshots. Because of that, you always need to select a child before you
call `happoScreenshot`. If you still need a full-page screenshot you can use
the `<body>` element:

```js
cy.get('body').happoScreenshot();
```

Happo identifies screenshots by `component` and `variant`. By default, the
component name and variant are inferred from the current test case. If you want
more control, you can provide these in an options argument:

```js
// Full control, pass in both component and variant:
cy.get('.header').happoScreenshot({ component: 'Header', variant: 'large' });

// Control the component name, but let variant be auto-assigned
cy.get('.footer').happoScreenshot({ component: 'Footer' });

// Control variant, but let component name be inferred
cy.get('.footer').happoScreenshot({ variant: 'dark' });

// No control, infer component and variant from current test
cy.get('.footer').happoScreenshot();
```

## Limiting targets

If you want to avoid rendering an example in all targets, you can use the
`targets` option. The example will then be rendered in the specified targets
exclusively.

```js
cy.get('.footer').happoScreenshot({
  component: 'Footer',
  targets: ['chrome-small'],
});
```

## Continuous Integration

If you run the test suite in a CI environment, the `happo-cypress` module will
do its best to auto-detect your environment and adapt its behavior accordingly:

- On PR builds, compare the screenshots against the master branch
- On master builds, simply create the Happo report

To get the results of the Happo jobs back to your PRs/commits, you need to
install and configure the Happo GitHub app. Instructions are available [in the
Continuous Integration docs](continuous-integration.md#posting-statuses-back-to-prscommits).

Happo auto-detects the following CI environments:

- Circle CI
- Travis CI

If you are using a different CI service, you'll have to set a few environment
variables before invoking the test suite:

- `HAPPO_PREVIOUS_SHA` the commit sha that the branch/PR is based on (usually a
  commit on master). Only set this for PR builds.
- `HAPPO_CURRENT_SHA` the sha of the commit currently under test. Always set this.
- `HAPPO_BASE_BRANCH` the default/base branch you use, e.g. `origin/dev`.
  Defaults to `origin/master`, so you only need to set this if you are using a
  different base branch.
- `HAPPO_CHANGE_URL` a url to the PR/commit. Optional.

### Parallel builds

If you're running your [Cypress test suite across multiple
machines](https://docs.cypress.io/guides/guides/parallelization.html), you'll
need to do two things:

- Set a `HAPPO_NONCE` environment variable, to tie individual runs together. Any
  string unique to the build will do.
- After the whole test suite is done, call `npx happo-cypress finalize`. Make
  sure that the same `HAPPO_NONCE` environment variable is set as for the
  individual builds.

In some CI tools, you can use a built-in environment variable as `HAPPO_NONCE`.
In CircleCI for instance, you can use [
`HAPPO_NONCE=${CIRCLE_WORKFLOW_ID}`](https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables).
You can also use a timestamp or a randomly generated string. The important thing
is that it's unique to the current CI run.

## Troubleshooting

### I need support!

We're here to help — send an email to support@happo.io and we'll assist you.

### Happo isn't producing any screenshots

The `happo-cypress` module will disable itself if it can't detect any api
tokens (`apiKey` and `apiSecret` in config). Check to make sure your
`.happo.js` config is properly set up. There might also be more information in
the console logs from Cypress. Look for lines starting with `[HAPPO]`.

### Where are my screenshots?

During test suite execution, Happo will only record information. All
screenshots are taken asynchronously outside of the test run. This means that
your test suite will finish sooner than the Happo job is done. To follow along
the progress, look for a url logged by Happo:

```bash
[HAPPO] https://happo.io/a/284/async-reports/34
```

### Styles are missing from my screenshots

Styles and assets are collected automatically during your test suite. If you
notice styles/images/fonts etc are missing, one of a few things might have happened:

- CSS selectors depend on context that is missing to Happo. If you e.g. have
  something like `#start-page .header { color: red }` and screenshoot
  `.header`, the red color will be missing. This is because Happo only sees the
  `.header` element, never the surrounding page.
- There could be a bug in how `happo-cypress` collects styles and assets. Reach
  out to support@happo.io and we'll triage.
