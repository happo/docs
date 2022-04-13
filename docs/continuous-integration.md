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

> The instructions on this page apply to all integrations except the Cypress and
> Playwright integrations. Refer to
> [the Cypress integration page](cypress.md#continuous-integration) and
> [the Playwright integration page](playwright.md#continuous-integration) for
> instructions on how to integrate with CI there.

Since a lot of projects these days follow a pull-request/merge-request model,
Happo provides ready-made scripts that you can run in CI:

- [`happo-ci-travis`](#happo-ci-travis) - a script designed to be run in a
  Travis environment.
- [`happo-ci-circleci`](#happo-ci-circleci) - for CircleCI environments.
- [`happo-ci-github-actions`](#happo-ci-github-actions) - used with GitHub
  Actions.
- [`happo-ci-azure-pipelines`](#happo-ci-azure-pipelines) - used with Azure
  DevOps Pipelines.
- [`happo-ci`](#happo-ci) - a generic script designed to work in any CI
  environment. This script is used by all the other CI scripts under the hood.

All these scrips will:

1. Figure out the right baseline report to compare with
2. Run Happo on the current HEAD commit
3. Compare the baseline with the new report
4. If allowed to, post back a status to the commit/PR

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

### `happo-ci-azure-pipelines`

This script is targeted at
[Azure Pipelines](https://azure.microsoft.com/en-us/services/devops/pipelines/).
It can be used with pull requests and regular pushes. Start by adding the
`happo-ci-azure-pipelines` script to your `package.json` file:

```json
{
  "scripts": {
    "happo-ci-azure-pipelines": "happo-ci-azure-pipelines"
  }
}
```

Then, configure `azure-pipelines.yml` to run the `happo-ci-azure-pipelines`
script. In the example below the `HAPPO_API_KEY` and `HAPPO_API_SECRET`
environment variables are populated from two
[user-defined secret variables](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/variables?view=azure-devops&tabs=yaml%2Cbatch#user-defined-variables).

```yaml
trigger:
  - main
pool:
  vmImage: ubuntu-latest
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '16.x'
    displayName: 'Install Node.js'
  - script: |
      npm ci
      npm run happo-ci-azure-pipelines
    displayName: 'Install dependencies and run Happo'
    env:
      HAPPO_API_KEY: $(happoApiKey)
      HAPPO_API_SECRET: $(happoApiSecret)
```

The trigger is set to run for pushes to the `main` branch. You'll have to
replace this if you are using a different main branch. To trigger builds for
pull request, you can use
[a branch policy for the main branch](https://docs.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser).

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
Happo currently integrates with [GitHub](https://github.com),
[Bitbucket](https://bitbucket.org), and [Azure DevOps](https://dev.azure.com/).
See specific instructions for the different providers below.

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

![Happo status posted on a bitbucket commit](/img/happo-status-bitbucket.png)

If there is a diff, the status will be set to failure. To manually flip this to
a success status, just go to the Happo comparison page (linked to from the
status) and accept the diffs.

![Accepting diffs](/img/happo-status-accept.gif)

The status over on bitbucket.org will then change to success (green) for the
PR/commit. If there are no diffs, the status is automatically set to success.

### Azure

#### Step 1: Generate a Personal Access Token (PAT)

To authorize Happo to post statuses to your PRs/commits, you need to generate an
[Personal Access Token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate).

![Generating an Azure Personal Access Token](/img/happo-azure-pat.gif)
_Generating a Personal Access Token through the Azure UI_

Set the "Code" scope to `Read` and `Status`. We need the read scope to figure
out the right baseline reports to use. The status scope is used when posting
build statuses to PRs.

#### Step 2: Fill in form at Happo.io

Once you have the PAT, you can go to the
[Azure integration page on happo.io](https://happo.io/azure-integration) and
fill out the form. Once you're done with that, you're all set to have Happo
automatically post statuses on your PRs/commits.

#### Happo build statuses

Here's what it looks like when Happo posts a status on a pull request:

![Happo status posted on an azure PR](/img/happo-status-azure.png)

If there is a diff, the status will be set to failure. To manually flip this to
a success status, just go to the Happo comparison page (linked to from the
status) and accept the diffs.

![Accepting diffs](/img/happo-status-accept.gif)

The status over on Azure DevOps will then change to success (green) for the
PR/commit. If there are no diffs, the status is automatically set to success.

## Sync mode (optional)

By default, `happo-ci` will generate screenshots asynchronously, meaning your CI
run will finish before screenshots are ready. You can disable this behavior by
setting a `HAPPO_IS_ASYNC=false` environment variable. If set, Happo will do two
things differently:

- The CI run will wait for reports to be ready before finishing
- The baseline report is generated on the fly, by checking out the previous
  commit on the main branch and running happo once more.

In sync mode, your npm client is automatically detected (yarn or npm), and Happo
will run `npm install`/`yarn install` before generating screenshots. If you have
other dependencies/preprocessing steps that need to happen, you can override
this with the `INSTALL_CMD` environment variable. E.g.

```bash
INSTALL_CMD="lerna bootstrap" npm run happo-ci-travis
```

In this example, the `lerna bootstrap` command will be invoked before running
`happo run` on each commit, instead of `yarn install`/`npm install`.

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
