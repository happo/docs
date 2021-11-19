---
id: multi-project
title: Multi-project setup
---

If you want to use Happo in multiple projects in your organization, you can do
so with the [`project` config option](configuration.md#project). You can have
separate projects per repository, or even have separate projects within the
same repository.

By default, Happo will post one build status per project:

![Two Happo projects with statuses for a PR](/img/happo-github-status-splitup.png)
_Two Happo projects posting separate PR build statuses._

If you want to combine all statuses into a single status check, keep reading! We'll walk you through how to achieve this:

![Two Happo projects with a combined status for a PR](/img/happo-github-status-orchestrated.png)
_Two Happo projects posting a combined PR build status using the orchestration feature._

## Orchestration

If you know beforehand what projects you are going to run Happo for in CI, you
can call the [Orchestration API
endpoint](https://happo.io/docs/api#Create%20an%20orchestration%20job) to tell
Happo what projects you intend to process.

Here's an example bash script where we orchestrate the `pages` project and the
`default` project. This script is run in a CircleCI environment, before we
invoke the [`happo-ci-circleci` script](continuous-integration.md#happo-ci-circleci).

```bash
#!/bin/bash

# Make the whole script fail on errors
set -euo pipefail

PREVIOUS_SHA=$(git merge-base origin/master "${CIRCLE_SHA1}")
CURRENT_SHA="${CIRCLE_SHA1}"
COMMIT_SUBJECT="$(git show -s --format=%s)"

curl --header "Content-Type: application/json" \
  --request POST \
  --data "{\"projects\": [\"default\", \"pages\"], \"link\": \"${CIRCLE_PULL_REQUEST:-}\", \"message\": \"${COMMIT_SUBJECT}\"}" \
  -u "${HAPPO_API_KEY}:${HAPPO_API_SECRET}" \
  "https://happo.io/api/jobs/${PREVIOUS_SHA}/${CURRENT_SHA}/orchestrate"
```
