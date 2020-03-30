---
id: ignoring-diffs
title: Ignoring diffs
---

A powerful feature in the Happo review process is the ability to permanently
ignore a diff.

![Permanently ignoring a diff](/img/happo-ignoring-diffs.gif)
_Ignoring a diff in a Happo report._

Ignoring a diff will instruct Happo to ignore that specific diff now and in the
future. It should be used with caution as it might hide issues that should be
caught.

Examples of where it _is okay_ to permanently ignore:

- ✅ When there's a subtle diff that you can't attribute to the changes made.
- ✅ When there are flaky rendering-related issues not caused by your code

Examples of where you _should avoid_ using the permanently ignore feature:

- ❌ You've made a UI update causing diffs (simply [accept the
  report](reviewing-diffs.md#acceptingrejecting-a-report) instead).
- ❌ You're having spurious diffs where some images/fonts won't load (reach out
  to us instead — this might be a bug)
