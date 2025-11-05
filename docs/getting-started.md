---
id: getting-started
title: Getting started
sidebar_label: Getting started
---

Happo is a [cross-browser](browsers.md) screenshot testing service. It helps you
test the visual appearance of your application by automatically comparing the UI
with a previous version. [Set it up to run in CI](continuous-integration.md) and
get build statuses posted directly to your pull requests.

## Choose an integration

The first thing you want to do is to set up a test suite for Happo. A test suite
consists of a set of components and variants of those components. There are many
ways to do this, and it all depends on your existing tech stack, your
application, experience with other test frameworks, and more.

- A [Storybook](storybook.md) application can serve as the test suite driver for
  Happo.
- By using the [Static bundle integration](static.md), you can bring your own
  javascript bundle and have full control over the build phase and execution.
- By integrating Happo with [Cypress](cypress.md) or
  [Playwright](playwright.md), you can turn your end-to-end tests into a Happo
  test suite.
- If you want to test an existing (public) website, you can use
  [the `pages` option](full-page.md).
- If you want to create a custom test suite for React or other js framework
  apps, you can use [the Static bundle integration](static.md).
- For native apps and others not running in a browser, use [the API](native.md)
  directly.

## Basic setup

Independently of how you end up integrating Happo in your project, there are
some steps you always need to take care of. The first thing is to install the
`happo` npm module:

```sh
npm install --save-dev happo
```

You also need a [configuration](configuration.md) file. Save `happo.config.ts`
(or `.js`) in the root directory of your project (right next to where the
`package.json` file is located). This example is showing the minimum required
configuration:

```js
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  targets: {
    'chrome-desktop': {
      browserType: 'chrome',
      viewport: '1024x768',
    },
  },
});
```

> While you can specify `apiKey` and `apiSecret` directly as strings, this isn't
> something we recommend. Use
> [environment variables](configuration.md#apikey-and-apisecret) instead.

The API tokens (`apiKey`, `apiSecret`) come from your account at
[happo.io](https://happo.io/account). If you don't have an account already, you
can sign up for a free trial at [happo.io/signup](https://happo.io/signup)

> **Note:** If you're migrating from legacy Happo packages, see the
> [migration guide](migrating-from-legacy-packages.md) for detailed
> instructions.

You can add more than one `target` if you want to run tests across multiple
browsers and/or screen sizes. See [Supported browsers](browsers.md) for a full
list of browsers we support.

## Creating your first report

All integrations have their own way of executing the test suite. Refer to the
docs for the integration of your choice for an example of how to proceed.
