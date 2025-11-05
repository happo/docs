---
id: cli
title: Command-Line-Interface (CLI)
sidebar_label: CLI reference
---

While you are most likely getting most value from the ready-made CI integration
scripts, there are times when you want better control. In these cases, you can
use any combination of the following CLI commands to produce the results you
desire.

## Installation

The commands listed come from the `happo` npm library.

```sh
npm install --save-dev happo
```

You'll also need to add a script to `package.json`:

```json
{
  "scripts": {
    "happo": "happo"
  }
}
```

## Commands

- `npm run happo` - generate screenshots and upload them to the remote happo.io
  service.
- `npm run happo --` - use as a wrapping command when using Cypress or
  Playwright
- `npm run happo finalize` - finalize a Cypress or Playwright report. Used in
  combination with `HAPPO_NONCE`.

For a full list of commands you can run, try running

```sh
npm run happo --help
```
