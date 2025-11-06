---
id: cli
title: Command-Line-Interface (CLI)
sidebar_label: CLI reference
---

The `happo` command provides all the functionality you need for running Happo
tests, including CI integration. The following documentation covers all
available commands and options to help you configure Happo for your specific
needs.

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

### Default command

Run happo tests to generate screenshots and upload them to the remote happo.io
service.

```sh
npm run happo
```

### Wrapping command

Use `happo` as a wrapping command when using Cypress or Playwright. This allows
Happo to coordinate test execution and collect results from parallel test runs.

```sh
npm run happo -- playwright test
```

### Finalize command

Finalize a Happo report for Cypress or Playwright tests running in parallel.
This command is used after parallel test execution completes to aggregate
results and finalize the report. It's used in combination with the `HAPPO_NONCE`
environment variable.

```sh
npm run happo finalize
```

## Options

### `--config`

Specify a custom path to the Happo configuration file. By default, Happo looks
for configuration files in the following order:

- `happo.config.ts`
- `happo.config.js`
- `happo.config.mjs`
- `happo.config.cjs`

```sh
npm run happo --config path/to/happo.config.ts
```

### `--version`

Display the version number of the Happo CLI.

```sh
npm run happo --version
```

### `--help`

Display help text with available commands and options.

```sh
npm run happo --help
```
