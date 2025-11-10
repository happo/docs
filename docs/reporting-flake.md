---
id: reporting-flake
title: Reporting Flake
---

A powerful feature in the Happo review process is the ability to report a diff
as flaky. To use this feature, press the "Report Flake" button next to any diff.

Reporting a diff as flaky will instruct Happo to ignore that specific diff now
and in the future. It should be used with a little bit of caution as it might
hide issues that should be caught.

Examples of where it _is okay_ to report a diff as flaky:

- ✅ When there's a diff that you can't attribute to the changes made.
- ✅ When there are flaky rendering-related issues not caused by your code.

Examples of where you _should avoid_ reporting a diff as flaky:

- ❌ You've made a UI update causing diffs (simply
  [accept the report](reviewing-diffs.md#acceptingrejecting-a-report) instead).
- ❌ You believe the diffs are caused by a bug in Happo
  ([reach out to us](mailto:support@happo.io) instead).

If the underlying cause of the flake is not addressed, similar flaky diffs will
eventually return once the baseline changes. After reporting flake, it is good
practice to follow up with a deeper fix.

## Global effect

Diffs reported as flaky apply to all future and past Happo reports. This can
lead to some confusion when your Happo build status (in e.g. GitHub) shows a
number of diffs, but the Happo report page shows fewer diffs (or even none).
Build statuses aren't updated when you report a diff as flaky, you still need to
[manually approve or reject](reviewing-diffs.md).
