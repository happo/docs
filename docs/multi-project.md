---
id: multi-project
title: Multi-project setup
---

If you want to use Happo in multiple projects in your organization, you can do
so with the [`project` config option](configuration.md#project). You can have
separate projects per repository, or even have separate projects within the same
repository.

By default, Happo will post one build status per project:

![Two Happo projects with statuses for a PR](/img/happo-github-status-splitup.png)
_Two Happo projects posting separate PR build statuses._

If you want to combine all statuses into a single status check, keep reading!
We'll walk you through how to achieve this:

![Two Happo projects with a combined status for a PR](/img/happo-github-status-orchestrated.png)
_Two Happo projects posting a combined PR build status using the orchestration
feature._

## Orchestration

If you know beforehand what projects you are going to run Happo for in CI, you
can call the
[Orchestration API endpoint](https://happo.io/docs/api#Create%20an%20orchestration%20job)
to tell Happo what projects you intend to process. Happo then combines them into
one job, and posts one status for all of them.

Call the endpoint before any of the projects start running, with the same
"before" and "after" commits that the `happo` command uses. For a pull request,
that's the merge base of the PR's base branch and its head commit, and the head
commit itself.

Here's an example GitHub Actions workflow with two projects: `components`, a
Storybook configured in `happo.config.ts`, and `e2e`, a Playwright test suite
configured in `happo.e2e.config.ts`. Pushes to `main` only create the reports
that PRs are compared against, so there's nothing to orchestrate there.

```yaml title=".github/workflows/happo.yml"
name: Happo

on:
  push:
    branches: [main]
  pull_request:

jobs:
  orchestrate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - run: |
          before_sha=$(git merge-base "$BASE_SHA" "$HEAD_SHA")
          jq -n --arg link "$PR_URL" --arg message "$PR_TITLE" '{
            projects: ["components", "e2e"],
            link: $link,
            message: $message
          }' | curl --fail-with-body --silent --show-error --json @- \
            -u "$HAPPO_API_KEY:$HAPPO_API_SECRET" \
            "https://happo.io/api/jobs/$before_sha/$HEAD_SHA/orchestrate"
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
          PR_URL: ${{ github.event.pull_request.html_url }}
          PR_TITLE: ${{ github.event.pull_request.title }}
          HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
          HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}

  components:
    needs: orchestrate
    # Also run on pushes to main, where orchestrate is skipped.
    if: ${{ !failure() && !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha || github.sha }}
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx happo
        env:
          HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
          HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}

  e2e:
    needs: orchestrate
    if: ${{ !failure() && !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha || github.sha }}
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx happo --config happo.e2e.config.ts -- playwright test
        env:
          HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
          HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}
```

The project names in the orchestration call have to match the
[`project`](configuration.md#project) option in each config file.
