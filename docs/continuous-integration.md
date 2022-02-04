---
id: continuous-integration
title: Continuous Integration
---

Adding Happo to your Continuous Integration setup is a great way to catch visual
regressions early. Happo will compare your PRs with the base branch and let you
know exactly what has changed in your UI.

<img
  src="/img/happo-in-ci.png"
  alt="Happo status on a GitHub pull request"
  width="1290"
  height="494"
/> _Example of a Happo status posted to a GitHub pull request._

## Setup

> The instructions on this page apply to all integrations except the Cypress
> integration. Refer to
> [the Cypress integration page](cypress.md#continuous-integration) for
> instructions on how to integrate with CI there.

Since a lot of projects these days follow a pull-request/merge-request model,
Happo provides ready-made scripts that you can run in CI:

- [`happo-ci-travis`](#happo-ci-travis) - a script designed to be run in a
  Travis environment.
- [`happo-ci-circleci`](#happo-ci-circleci) - a script designed to be run in a
  CircleCI environment.
- [`happo-ci-github-actions`](#happo-ci-github-actions) - a script designed to
  be used with GitHub Actions.
- [`happo-ci`](#happo-ci) - a generic script designed to work in any CI
  environment. This script is used by all the other CI scripts under the hood.

These scripts will all:

1. Run happo on the commit which the PR is based on (if needed)
2. Run happo on the current HEAD commit
3. Compare the two reports
4. If allowed to, post back a status to the PR (the HEAD commit)

These scripts will detect your npm client (yarn or npm) and run
`npm install`/`yarn install` before running happo on the commits. If you have
other dependencies/preprocessing steps that need to happen, you can override
this with the `INSTALL_CMD` environment variable. E.g.

```bash
INSTALL_CMD="lerna bootstrap" npm run happo-ci-travis
```

In this example, the `lerna bootstrap` command will be invoked before running
`happo run` on each commit, instead of `yarn install`/`npm install`.

By default, all `happo-ci` commands will wait for screenshots to be done before
finishing. If you have
[authorized your Happo account to post statuses back to PRs/commits](#posting-statuses-back-to-prscommits),
you can set a `HAPPO_IS_ASYNC=true` environment variable to instruct Happo to
finish the CI task as soon as possible and then instead wait for the status to
come back via happo.io.

```bash
HAPPO_IS_ASYNC=true npm run happo-ci-circleci
```

### `happo-ci-travis`

This script knows about the Travis build environment, assuming a PR based model.
To run it, first add this to your `package.json`:

```json
{
  "scripts": {
    "happo": "happo",
    "happo-ci-travis": "happo-ci-travis"
  }
}
```

Then, configure `.travis.yml` to run this script:

```yaml
language: node_js
script:
  - npm run happo-ci-travis
```

The `happo-ci-travis` script assumes that your PRs are based off of the master
branch. If you're using a different default branch, you can set the
`BASE_BRANCH` environment variable.

```json
{
  "scripts": {
    "happo": "happo",
    "happo-ci-travis": "BASE_BRANCH=\"dev\" happo-ci-travis"
  }
}
```

### `happo-ci-circleci`

_Before you start using this script, have a look at the
[Happo CircleCI Orb](https://circleci.com/orbs/registry/orb/happo/happo). It
simplifies some of the setup required if you use the `happo-ci-circleci`
script._

This script knows about the CircleCI build environment, assuming a PR based
model. To run it, first add this to your `package.json`:

```json
{
  "scripts": {
    "happo": "happo",
    "happo-ci-circleci": "happo-ci-circleci"
  }
}
```

Then, configure `.circleci/config.yml` to run this script. Something like this:

```yaml
jobs:
  build:
    docker:
      - image: circleci/node:8
    steps:
      - checkout
      - run:
          name: happo
          command: npm run happo-ci-circleci
```

The `happo-ci-circleci` script assumes your PRs are based off of the master
branch. If you're using a different default branch, you can set the
`BASE_BRANCH` environment variable.

```json
{
  "scripts": {
    "happo": "happo",
    "happo-ci-circleci": "BASE_BRANCH=\"origin/dev\" happo-ci-circleci"
  }
}
```

### `happo-ci-github-actions`

This script knows about the
[GitHub Actions](https://github.com/features/actions) build environment,
assuming a PR based model. To run it, first add this to your `package.json`:

```json
{
  "scripts": {
    "happo": "happo",
    "happo-ci-github-actions": "happo-ci-github-actions"
  }
}
```

Then, configure your workflow file to run this script. Here's an example:

```yaml
name: Happo CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
jobs:
  happo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 100
      - uses: actions/setup-node@v1
      - run: npm ci
      - run: npm run happo-ci-github-actions
        env:
          HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
          HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}
```

Make sure that the workflow is configured to run on pushes to your default
branch. This will ensure that baselines exist for PR builds to compare against.

### `happo-ci`

This is a generic script that can run in most CI environments. Before using it,
you need to set a few environment variables:

- `PREVIOUS_SHA` - the sha of the baseline commit
- `CURRENT_SHA` - the sha of the current HEAD
- `CHANGE_URL` - a link back to the change
  ([further instructions](#setting-the-right---linkchange_url))

```json
{
  "scripts": {
    "happo": "happo",
    "happo-ci": "happo-ci"
  }
}
```

## Posting build statuses

Your Happo account can be configured to post build statuses to your PRs/commits.
Happo currently integrates with [GitHub](https://github.com) and
[Bitbucket](https://bitbucket.org). See specific instructions for the different
providers below.

### GitHub

> The instructions in this section only work if you are using github.com or the
> on-premise version of happo.io. If you're using a local GitHub Enterprise
> setup, there is an alternative solution described in the
> [next section](#posting-statuses-without-installing-the-happo-github-app)

#### Step 1: Install Happo GitHub app

First you need to install the [Happo GitHub App](https://github.com/apps/happo)
in the repository/repositories you want to run Happo in.

![Installing the Happo GitHub App](/img/happo-github-app.gif) _Installing the
Happo app at https://github.com/apps/happo_

#### Step 2: Connect with repository

Once you have the Happo GitHub app installed, you need to connect/activate the
right repository with your Happo.io account on the
[GitHub integration page on happo.io](https://happo.io/github-integration). Once
you're done with that, you're all set to have Happo automatically post statuses
on your PRs/commits.

![Connecting repository with the Happo account](/img/happo-github-integration.gif)
_Activating the GitHub repository at https://happo.io/github-integration_

#### Happo build statuses

Here's what it looks like when Happo posts a status on a pull request:

![Happo status posted on a commit on github](/img/happo-status-diffs.png)

If there is a diff, the status will be set to failure. To manually flip this to
a success status, just go to the Happo comparison page (linked to by the
"Details" link next to the Happo status) and click the Accept button at the top.

![Accepting diffs](/img/happo-status-accept.gif)

The status over on github.com will then change to success (green) for the
PR/commit.

![Happo status manually accepted cross-posted to github](/img/happo-status-accepted.png)

If there are no diffs, the status is automatically set to success.

#### Posting statuses without installing the Happo GitHub App

If you for some reason can't install the Happo GitHub App (e.g. when using
GitHub Enterprise) you can still get the Happo status posted to your PR -- as a
comment on the pull request. To get this working, you have to provide the Happo
CI script with user credentials containing a username and a personal access
token, through `HAPPO_GITHUB_USER_CREDENTIALS`. E.g.

```bash
HAPPO_GITHUB_USER_CREDENTIALS="trotzig:21A4XgnSkt7f36ehlK5"
```

[Here's a guide from github.com](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line)
on how to generate the personal token.

The environment variable must contain both the username of the profile and the
personal access token, separated by a colon.

If you're using GitHub Enterprise, apart from defining the environment variable
you also need to add
[`githubApiUrl` to `.happo.js`](configuration.md#githubapiurl).

### Bitbucket

#### Step 1: Generate an app password

To authorize Happo to post statuses to your PRs/commits, you need to generate an
[app password](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/).

![Generating a Bitbucket app password](/img/happo-bitbucket-app-password.gif)
_Generating an app password through the Bitbucket UI_

#### Step 2: Fill in form at Happo.io

Once you have the app password, you can go to the
[Bitbucket integration page on happo.io](https://happo.io/bitbucket-integration)
and fill out the form. Once you're done with that, you're all set to have Happo
automatically post statuses on your PRs/commits.

#### Happo build statuses

Here's what it looks like when Happo posts a status on a pull request:

![Happo status posted on a commit on github](/img/happo-status-bitbucket.png)

If there is a diff, the status will be set to failure. To manually flip this to
a success status, just go to the Happo comparison page (linked to from the
status) and accept the diffs.

![Accepting diffs](/img/happo-status-accept.gif)

The status over on bitbucket.org will then change to success (green) for the
PR/commit. If there are no diffs, the status is automatically set to success.

## Email notifications

You can set up the CI integration to send email notifications when comparison
reports are ready. Set a`HAPPO_NOTIFY` environment variable to one or more
(comma-separated) email addresses and emails will be sent from Happo when
results are available.

```bash
export HAPPO_NOTIFY=user@example.com
```

In many cases, you want to send the email to the person responsible for the
change/PR that triggered the Happo tests. You can do that via a `git show`
one-liner. This example is for Circle CI:

```yaml
steps:
  - checkout
  - run: npm ci
  - run:
      echo 'export HAPPO_NOTIFY=$(git show -s --format=%ae HEAD)' >> $BASH_ENV
  - happo/run_happo
```

Here's an example for GitHub Actions:

```yaml
- name: Set Happo notification email address
  run: echo "HAPPO_NOTIFY=$(git show -s --format=%ae HEAD)" >> $GITHUB_ENV
```

### Multiple recipients

Use a comma-separated list of email addresses to send the notification to
several recipients:

```bash
export HAPPO_NOTIFY=user@example.com,service-account@mycompany.com
```
