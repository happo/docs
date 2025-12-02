---
id: cli
title: Command-Line-Interface (CLI)
sidebar_label: CLI reference
---

The `happo` command provides all the functionality you need for running Happo
tests, including CI integration. The following documentation covers all
available commands and options to help you configure Happo for your specific
needs.

## Authentication

The `happo` CLI requires authentication to communicate with the happo.io service.
You can authenticate in two ways:

1. **API Key and Secret** (recommended for CI and production): Provide `apiKey`
   and `apiSecret` in your configuration file or as environment variables. See
   [Configuration](configuration.md#apikey-and-apisecret) for details.

2. **Interactive Browser Authentication**: If no `apiKey` or `apiSecret` is
   detected, the CLI will prompt you to authenticate in your browser. This
   creates short-lived authentication tokens.

   > **Important:** Interactive authentication will not work in CI environments
   > or non-interactive terminals. You must provide explicit `apiKey` and
   > `apiSecret` values for these scenarios. See
   > [Continuous Integration](continuous-integration.md) for setup instructions.

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

Use the same `--nonce` when using with the `finalize` command:

```sh
npm run happo --nonce [NONCE] -- playwright test
```

### Finalize command

Finalize a Happo report for Cypress or Playwright tests running in parallel.
This command is used after parallel test execution completes to aggregate
results and finalize the report. It's used in combination with the `--nonce`
argument.

```sh
npm run happo finalize
```

```sh
npm run happo finalize --nonce [NONCE]
```

## Options

### `--config` / `-c`

Specify a custom path to the Happo configuration file. By default, Happo looks
for configuration files in the following order:

- `happo.config.js`,
- `happo.config.mjs`,
- `happo.config.cjs`,
- `happo.config.ts`,
- `happo.config.mts`,
- `happo.config.cts`,

```sh
npm run happo --config path/to/happo.config.ts
```

### `--version` / `-v`

Display the version number of the Happo CLI.

```sh
npm run happo --version
```

### `--help` / `-h`

Display help text with available commands and options.

```sh
npm run happo --help
```

### `--baseBranch <branch>`

Base branch to use for comparison. Default: `origin/main`.

```sh
npm run happo --baseBranch origin/long-lived-branch
```

### `--link <url>`

URL to contextualize the comparison. Default: auto-detected from CI environment.

```sh
npm run happo --link https://github.com/happo/happo/pull/123
```

### `--message <message>`

Message to associate with the comparison. Default: auto-detected from CI
environment.

```sh
npm run happo --message "Add new feature"
```

### `--authorEmail <email>`

Email address of the author of the comparison. Default: auto-detected from CI
environment.

```sh
npm run happo --authorEmail author@example.com
```

### `--afterSha <sha>`

"After" SHA to use for comparison. Default: auto-detected from CI environment,
or HEAD SHA if not set.

```sh
npm run happo --afterSha abc123def456
```

### `--beforeSha <sha>`

"Before" SHA to use for comparison. Default: auto-detected from CI environment.

```sh
npm run happo --beforeSha xyz789ghi012
```

### `--fallbackShas <shas>`

Space-, newline- or comma-separated list of fallback shas for compare calls.
Default: auto-detected from CI environment.

```sh
npm run happo --fallbackShas "sha1,sha2,sha3"
```

### `--fallbackShasCount <count>`

Number of fallback shas to use for compare calls. Default: `50`.

```sh
npm run happo --fallbackShasCount 100
```

### `--notify <emails>`

One or more (comma-separated) email addresses to notify with results.

```sh
npm run happo --notify me@example.com,you@example.com
```

### `--nonce <nonce>`

Nonce to use for Cypress/Playwright comparison. Use the same nonce when using
with the `finalize` command.

```sh
npm run happo --nonce my-unique-nonce -- playwright test
npm run happo finalize --nonce my-unique-nonce
```

### `--githubToken <token>`

GitHub token to use for posting Happo statuses as comments. Use in combination
with the `githubApiUrl` configuration option. Default: auto-detected from
environment.

```sh
npm run happo --githubToken $GITHUB_TOKEN
```
