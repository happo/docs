# Accessibility Testing

## Introduction

Happo provides powerful accessibility testing capabilities that work similarly
to our visual regression testing. You can use Happo to automatically detect
accessibility violations and generate ARIA snapshots of your components. This is
useful as it helps ensure your application remains accessible as it evolves.
Just like with screenshot testing, Happo will track changes over time and help
you maintain accessibility standards across your codebase.

## Setup

To run accessibility tests with Happo, you need to set up one of our existing
integrations. Once you have a working integration, it's a matter of a small
configuration tweak where you add an `accessibility` target to your Happo
configuration file.

1. Integrate Happo with one of our supported testing frameworks:
   - [Storybook Integration](/docs/storybook)
   - [Playwright Integration](/docs/playwright)
   - [Cypress Integration](/docs/cypress)

2. Add an `accessibility` target to your Happo configuration file:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    // ... Your existing screenshot targets

    accessibility: {
      type: 'accessibility',
      viewport: '1200x768',
    },
  },
});
```

You can run accessibility tests alongside your screenshot tests, or use them
independently. Once you have at least one accessibility target in your
configuration, you'll start seeing accessibility checks in your Happo reports.

## Violation Tracking

In the Happo dashboard there's an accessibility graph that helps you track
progress over time. The graph shows the number of violations across your
components and pages, making it easy to identify trends and measure
improvements.

![Accessibility Graph](/img/accessibility-graph.png)

## Checks

Happo uses [axe-core®](https://www.deque.com/axe/) to perform comprehensive
accessibility checks. Some examples of the checks we perform include:

- [Form label associations](https://dequeuniversity.com/rules/axe/4.10/label)
- [Color contrast ratios](https://dequeuniversity.com/rules/axe/4.10/color-contrast)
- [Link text visibility](https://dequeuniversity.com/rules/axe/4.10/link-name)
- [Alt texts for images](https://dequeuniversity.com/rules/axe/4.10/image-alt)

We support multiple WCAG conformance levels:

- [WCAG 2.0 Level A](https://www.w3.org/TR/WCAG20/)
- [WCAG 2.0 Level AA](https://www.w3.org/WAI/WCAG2AA-Conformance)
- [WCAG 2.1 Level A](https://www.w3.org/TR/WCAG21/)
- [WCAG 2.1 Level AA](https://www.w3.org/TR/WCAG21/)

### Configuring axe options

Happo workers read an optional `window.happoAxeOptions` object before running
accessibility checks. When present, the options you specify are merged in on
top of the Happo defaults, which lets you tweak the axe-core run without
replacing the defaults wholesale. See the
[axe-core API reference](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#options-parameter)
for the full list of supported options.

A typical configuration might disable a rule that produces noise for your app,
or narrow the run to a specific set of WCAG tags:

```js
window.happoAxeOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa'],
  },
  rules: {
    'color-contrast': { enabled: false },
  },
};
```

Where you define `window.happoAxeOptions` depends on your testing framework.

#### Storybook

Set the options in `.storybook/preview.js` so they are defined before any
story is rendered:

```js title=".storybook/preview.js"
import 'happo/storybook/register';

window.happoAxeOptions = {
  rules: {
    'color-contrast': { enabled: false },
  },
};
```

#### Playwright

Use `page.addInitScript` to make sure the options are defined on every page
before Happo captures accessibility snapshots:

```js title="tests/test.spec.js"
import { test } from 'happo/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.happoAxeOptions = {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    };
  });
});

test('start page', async ({ page, happoScreenshot }) => {
  await page.goto('http://localhost:7676');
  await happoScreenshot(page.locator('.hero-image'), {
    component: 'Hero Image',
  });
});
```

#### Cypress

Register a `window:before:load` listener in `cypress/support/e2e.js` so the
options are set on every page load, before any app code runs:

```js title="cypress/support/e2e.js"
import 'happo/cypress';

Cypress.on('window:before:load', (win) => {
  win.happoAxeOptions = {
    rules: {
      'color-contrast': { enabled: false },
    },
  };
});
```

Below is an example of how violations appear in a Happo report. When you make
changes to remove violations, the comparison report page will show you the
before and after violation count. Click the violation types to filter the report
to only show the accessibility snapshots containing that particular violation.
Each violation has a section that explains why the violation was found and gives
you pointers on how to fix it.

![Removed Accessibility Violations](/img/accessibility-violations.png)

## ARIA Snapshots

ARIA snapshots are another feature of Happo's accessibility testing. They
provide a text-based representation of how screen readers would interpret your
interface, making it easier to understand the accessibility structure of your
components and pages.

![ARIA Snapshot](/img/aria-snapshot.png)

These snapshots help verify that the semantic structure is correct and that
screen readers will present the interface in an understandable way.

## Why Happo?

Happo's approach to accessibility testing offers several advantages over
traditional methods:

### Compared to Linting

While linting tools are valuable for catching issues during development, they
often run in isolation and don't capture the full context of how components
interact. Happo's integration with your testing framework ensures accessibility
is checked in a runtime/in-browser environment.

### Compared to Snapshot Testing

Traditional snapshot testing requires committing test results to source control,
which can lead to large diffs and merge conflicts. Happo's asynchronous approval
workflow allows teams to review and approve changes in a dedicated UI, making it
easier to manage accessibility updates. You'll also have better reporting
capabilities and track how your application improves over time.

### Compared to Manual Tools

Manual accessibility testing is time-consuming and prone to human error. Happo
automates the process while still maintaining the human review element through
our approval workflow. This combination of automation and human oversight has
proven very useful for screenshot testing, and the same model works equally well
for accessibility testing.

Happo's model of asynchronous approval is particularly well-suited for
accessibility testing because:

- It allows teams to review and approve accessibility changes separately from
  code changes
- It provides a clear audit trail of accessibility improvements
- It enables gradual improvements without blocking development
- It integrates accessibility testing into the existing development workflow
- It makes accessibility testing a natural part of the development process

---

axe-core® is a trademark of Deque Systems, Inc. in the US and other countries.
