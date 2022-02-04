---
id: reviewing-diffs
title: Reviewing diffs
---

When Happo finds diffs, it's up to you to either accept or reject that diff. The
diffs are presented in a Happo report, and the UI looks something like this:

![Happo compare page](/img/happo-report.png)

## Accepting/Rejecting a report

Diffs are presented on the right, and on the left you have a sidebar with some
filters and a "review" panel that looks like this:

![Happo review panel](/img/happo-review-panel.png)

This is Happo asking you to manually review the diffs on the page and either
accept or reject them. By accepting, you signal to others that the diffs are
expected, or at least okay from a design standpoint. The component will then
switch to this:

![Happo review panel](/img/happo-review-panel-accepted.png)

By rejecting, you signal to others that the diffs aren't okay, and that the
change shouldn't be merged.

![Happo review panel](/img/happo-review-panel-rejected.png)

If you have the right [CI setup](continuous-integration.md), the accept/reject
status will also be posted back to the PR/commit on github.com.

## Alerts

In rare cases you will see an alert message at the top of the compare page
informing you about updates made. This is Happo informing you about changes made
to internal infrastructure that might affect the screenshots and cause diffs.
These could be e.g. browser updates, internal bug fixes, etc. You'll only be
alerted about changes that were made in the timespan between when the "before"
report and the "after" report were created.
