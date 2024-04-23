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

Before you start following the instructions here, you'll need
[a working Cypress test suite](https://docs.cypress.io/guides/getting-started/installing-cypress.html)
and a [Happo account](https://happo.io/signup).

## Installation

In your project, install the `happo-cypress`, `happo-e2e`, and the `happo.io`
npm modules.

```sh
npm install --save-dev happo-cypress happo-e2e happo.io
```

## Setup

Import the `happo-cypress` module in your `cypress/support/commands.js` file:

```js
// At the top of cypress/support/commands.js
import 'happo-cypress';
```

Then, register the provided `happoTask` in your `cypress.config.js` file (or
`cypress/plugins/index.js` if you are on Cypress v9 or earlier):

<!--DOCUSAURUS_CODE_TABS-->
<!-- Cypress v10 -->

```js
const { defineConfig } = require('cypress');
const happoTask = require('happo-cypress/task');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      happoTask.register(on);
      return config;
    },
  },
});
```

<!-- Cypress v9 -->

```js
// In cypress/plugins/index.js
const happoTask = require('happo-cypress/task');

module.exports = on => {
  happoTask.register(on);
};
```

<!--END_DOCUSAURUS_CODE_TABS-->

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

### Usage with `cypress run`

To enable Happo in your test suites triggered via `cypress run`, you'll need to
use the `happo-e2e` wrapper. Here's an example:

```sh
npx happo-e2e -- npx cypress run
```

If you're using [`yarn`](https://yarnpkg.com/), you might have to specify the
double dashes twice (the first one is consumed by `yarn` itself):

```sh
yarn happo-e2e -- -- yarn cypress run
```

If you're not using the `happo-e2e` wrapper with `cypress run`, Happo will be
disabled for the whole test suite.

### Usage with `cypress open`

When running Cypress tests locally using the `cypress open` command, Happo is
disabled by default. The `happo-e2e` wrapper won't work with `cypress open`
since it depends on the Cypress command to finish after a test run (which won't
happen with `cypress open`). To enable Happo in these scenarios, set
`HAPPO_ENABLED=true` as an environment variable and set the
`experimentalInteractiveRunEvents` config flag. Here's an example with the
environment variable inlined with the command:

```sh
HAPPO_ENABLED=true npx cypress open --config experimentalInteractiveRunEvents=true
```

When Happo is enabled with `cypress open`, Happo reports are created every time
you trigger a test run. Check your console logs for a link to the reports.

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

Happo focuses more on component screenshots as opposed to full-page screenshots.
Because of that, you always need to select a child before you call
`happoScreenshot`. If you still need a full-page screenshot you can use the
`<body>` element:

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

## Allowing failures

By default, no Happo reports are produced when the Cypress run fails. In some
cases, you might want to allow Happo to succeed even if the overall test run
fails. The `--allow-failures` flag for the `happo-e2e` command can then be used:

```sh
npx happo-e2e --allow-failures -- npx cypress run
```

## Selecting targets

If you want to avoid rendering an example in all browser targets (found in
.happo.js), you can use the `targets` option. The example will then be rendered
in the specified targets exclusively.

```js
cy.get('.footer').happoScreenshot({
  component: 'Footer',
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
cy.get('.footer').happoScreenshot({
  component: 'Footer',
  targets: [{ name: 'firefox-small', browser: 'firefox', viewport: '400x800' }],
});
```

Here, "Footer" will only be rendered in a 400x800px Firefox window.

You can mix and match dynamic targets and target names as well:

```js
cy.get('.footer').happoScreenshot({
  component: 'Footer',
  targets: [
    'chrome-small',
    { name: 'firefox-small', browser: 'firefox', viewport: '400x800' },
  ],
});
```

"Footer" is now rendered in Chrome (target specified in `.happo.js`) and Firefox
(dynamic target).

## Hiding dynamic content

If you have dynamic content that changes often, you can ask Happo to hide it
from the screenshot. This can help prevent unwanted diffs caused by e.g.
timestamps, dates, randomized content.

```js
cy.happoHideDynamicElements();
```

Confusingly enough, elements keep being visible while you run the Cypress test
suite. Instead, a `data-happo-hide` attribute is added. This will inform Happo's
workers to hide the elements before taking the screenshot. To cover up/replace
elements instead of hiding them, use the `replace` option:

```js
cy.happoHideDynamicElements({ replace: true });
```

Elements will then be replaced (actually covered) by black rectangles. Please
note that in some cases this can affect layout. Simply hiding elements (the
default) is slightly safer, since all we have to do is set `visibility: hidden`.

You can use `data-happo-hide` manually in your source code as well if you prefer
to hide certain elements without using `happoHideDynamicElements`.

### Selectors

By default `happoHideDynamicElements` will attempt to find `<time>` elements to
hide. You can add your own selectors using the `selectors` option.

```js
cy.happoHideDynamicElements({
  selectors: ['.date'],
});
```

Using `selectors` will not affect the default. To remove the default selectors,
you can set `defaultSelectors` to an empty array:

```js
cy.happoHideDynamicElements({
  defaultSelectors: [],
  selectors: ['.date'],
});
```

### Matchers

The default implementation of `happoHideDynamicElements` will attempt to find
things like `"2 days ago"`, `"2:45 PM"`, etc. You can supply your own content
matchers (regular expressions) if the default implementation isn't working for
you.

```js
cy.happoHideDynamicElements({
  matchers: [/liked by [0-9]+ people/],
});
```

To minimize false negatives, only leaf nodes are hidden by matchers.

Using `matchers` will not affect the default. To remove the default matchers,
you can set `defaultMatchers` to an empty array:

```js
cy.happoHideDynamicElements({
  defaultMatchers: [],
  matchers: [/liked by [0-9]+ people/],
});
```

## Continuous Integration

If you run the test suite in a CI environment, the `happo-cypress` and
`happo-e2e` modules will do their best to auto-detect your environment and adapt
its behavior accordingly:

- On PR builds, compare the screenshots against the master branch
- On master builds, simply create the Happo report

To get the results of the Happo jobs back to your PRs/commits, you need to
install and configure the Happo GitHub app. Instructions are available
[in the Continuous Integration docs](continuous-integration.md#posting-statuses-back-to-prscommits).

Happo auto-detects the following CI environments:

- GitHub Actions
- Circle CI
- Travis CI
- Azure DevOps

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

### GitHub Actions example

Here's an example of how you can use Happo with Cypress in a GitHub Actions
workflow. It makes use of the
[Cypress GitHub action](https://github.com/cypress-io/github-action).

```yaml
name: Cypress with Happo workflow

on:
  # Configure this workflow to trigger on pull requests and pushes to master
  push:
    branches:
      - master
  pull_request:
    branches:
      - master

jobs:
  cypress:
    name: Cypress with Happo
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run cypress
        uses: cypress-io/github-action@v2
        with:
          command-prefix: npx happo-e2e -- npx
        env:
          # Inject secrets to the build
          HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
          HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}
```

### Circle CI example

This example triggers a Cypress with Happo run in a Circle CI environment. It
uses the
[Cypress Circle CI Orb](https://circleci.com/developer/orbs/orb/cypress-io/cypress).
Separately, you'll need to configure the Circle CI project to inject the Happo
API key and secret through environment variables.

```yaml
version: 2.1
orbs:
  node: circleci/node@4.1.0
  cypress: cypress-io/cypress@1.27.0

workflows:
  cypress:
    jobs:
      - cypress/run:
          name: Run Cypress with Happo
          command-prefix: 'npx happo-e2e -- npx'
```

### Travis CI example

This is a simplified example of using Cypress with Happo in Travis CI. For a
more in-depth explanation of how to set up Cypress with Travis, see
https://docs.cypress.io/guides/guides/continuous-integration.html#Travis

```yaml
language: node_js
node_js:
  - 12
install:
  - npm ci
script:
  - $(npm bin)/happo-e2e -- $(npm bin)/cypress run
```

### Azure DevOps

Here's an example of how you can run Cypress with Happo in an Azure DevOps
environment. This example assumes you have a
[Pull request trigger](https://docs.microsoft.com/en-us/azure/devops/pipelines/release/triggers?view=azure-devops#pull-request-triggers)
set up in your repository.

```yaml
trigger:
  - master

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '16.x'
    displayName: 'Install Node.js'
  - script: |
      npm ci
      npx happo-e2e -- npx cypress run
    displayName: 'Install and Run Happo'
    env:
      HAPPO_API_KEY: $(happoApiKey)
      HAPPO_API_SECRET: $(happoApiSecret)
      HAPPO_COMMAND: happo
```

### Parallel builds

If you're running your
[Cypress test suite across multiple machines](https://docs.cypress.io/guides/guides/parallelization.html),
you'll need to do two things:

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

Here's an example configuration for a parallel build running in Circle CI
(adapted from the config used for the
[happo-cypress test suite](https://github.com/happo/happo-cypress/blob/8bed49c6a3768ca56d4cd8720c3948ae2cc59c9f/.circleci/config.yml)):

```yaml
version: 2.1
orbs:
  node: circleci/node@4.1.0
  cypress: cypress-io/cypress@1.27.0
workflows:
  cypress:
    jobs:
      - cypress/install

      - cypress/run:
          name: cypress-parallel
          requires:
            - cypress/install
          start: npm run start-dev-server
          parallel: true
          parallelism: 4
          command-prefix:
            'HAPPO_NONCE=${CIRCLE_WORKFLOW_ID} npx happo-e2e -- npx'
          post-steps:
            - run: 'HAPPO_NONCE=${CIRCLE_WORKFLOW_ID} npx happo-e2e finalize'
```

Notice how the same `HAPPO_NONCE` is used in both the Cypress run itself and the
finalize call.

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

### Passing along options

Any options you pass to `happoScreenshot` or `happoHideDynamicElements` that we
don't recognize we will pass along to the underlying Cypress tasks. This means
you can for instance suppress logs by using`log: false`:

```js
cy.get('.header').happoScreenshot({
  component: 'Header',
  variant: 'large',
  log: false,
});
```

### Transforming the DOM

If you need to transform the DOM in some way before a snapshot is taken, you can
use the `transformDOM` option. Here's an example where `<iframe>`s are replaced
with a div placeholder.

```js
cy.get('.main').happoScreenshot({
  component: 'Main',
  transformDOM: {
    selector: 'iframe',
    transform: (element, doc) => {
      // element here is an iframe
      const div = doc.createElement('div');
      div.innerHTML = '[iframe placeholder]';
      return div; // return the element you want to replace the iframe with
    },
  },
});
```

The options passed to `transformDOM` are:

- `selector`: an argument passed to `querySelectorAll` that describes what
  elements to transform.
- `transform`: a function that is called for each element matching the selector
  (there can be more than one). Make sure you return a replacement element.

### Download all assets

By default, happo-e2e will download assets found locally and include in an
assets package sent to happo.io. Any external URL will be left as-is, which
means they are expected to be publicly accessible by Happo workers. To include
external assets in the assets package as well, set a `HAPPO_DOWNLOAD_ALL`
environment variable.

```bash
HAPPO_DOWNLOAD_ALL=true npx happo-e2e -- npx cypress run
```

With this environment variable set, all assets are assumed to be private (i.e.
not publicly accessible).

### Locally produced images

The way happo-cypress takes screenshots is to take a DOM snapshot of the current
page/element and send that snapshot to Happo's workers for screenshots (in
different browsers). In some cases, DOM snapshotting doesn't always work. One
such case is if you are using web components/custom elements. The snapshots will
then not contain all the state needed to "reproduce" the elements on Happo's
workers. In this situation, and similar ones, you can use
`localSnapshots: true`. When this option is enabled, screenshots are produced
directly on the machine running the Cypress test run.

Here's how to enable local snapshots:

In `cypress/support/commands.js`, enable the `localSnapshots` option:

```js
import { configure } from 'happo-cypress';

configure({
  localSnapshots: true,
});
```

With this configuration, the `happoScreenshot()` method will take a local
screenshot (using `cy.screenshot()`) and upload images to Happo. The rest of the
flow is the same as a normal happo-cypress run, meaning you get a link to a
report to review, etc.

The downside of this approach is that you can only get screenshots in the
browser that Cypress currently runs. If you want cross-browser, you'll have to
make sure to run Cypress in the browsers you are interested in.

There might also be consistency issues with the screenshots. Happo's browser
workers do a lot of work to ensure that screenshots are consistently produced,
and leaving that work over to Cypress could potentially lead to more spurious
diffs.

When you use `localSnapshots: true`, we ignore the target configuration in
`.happo.js`. Instead, a dynamically resolved target is used based on the browser
and the viewport size used during the test.

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
base: https://github.com/happo/happo-e2e/issues/21#issuecomment-1825776491

## Troubleshooting

### I need support!

We're here to help — send an email to support@happo.io and we'll assist you.

### Happo isn't producing any screenshots

The `happo-cypress` module will disable itself if it can't detect any api tokens
(`apiKey` and `apiSecret` in config). Check to make sure your `.happo.js` config
is properly set up. There might also be more information in the console logs
from Cypress. Look for lines starting with `[HAPPO]`.

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
