---
id: cli
title: Command-Line-Interface (CLI)
sidebar_label: CLI
---

While you are most likely getting most value from the ready-made CI integration
scripts, there are times when you want better control. In these cases, you can
use any combination of the following CLI commands to produce the results you
desire.

## Installation

The commands listed come from the `happo.io` npm library.

```sh
npm install --save-dev happo.io
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

- `npm run happo run [sha]` - generate screenshots and upload them to the remote
  happo.io service. Supports the `--link <url>` and `--message <message>`
  flags.
- `npm run happo has-report <sha>` - check if there is a report already uploaded for
  the sha. Will exit with a zero exit code if the report exists, 1 otherwise.
- `npm run happo compare <sha1> <sha2>` - compare reports for two different shas. If
  a `--link <url>` is provided, Happo will try to post a status back to the
  commit (see [Posting statuses back to
  PRs/commits](continuous-integration.md#posting-statuses-back-to-prscommits) for more details)
  being installed). If an `--author <email>` is provided, any comment made on a diff
  will notify the author. Also supports `--message <message>`, which is used
  together with `--link <url>` to further contextualize the comparison. If
  you're using [`compareThreshold`](configuration.md#comparethreshold), you can use the
  `--dry-run` flag here to help figure out what threshold to use.

For a full list of commands you can run, try running

```sh
npm run happo --help
```
