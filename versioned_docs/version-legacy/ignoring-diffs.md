---
id: ignoring-diffs
title: Ignoring diffs
---

A powerful feature in the Happo review process is the ability to always ignore a
diff. To use this feature, select "Always ignore this diff" from the dropdown
next to any diff.

<video
  src="/video/happo-ignoring-diffs.mp4"
  autoplay="true"
  loop
  muted
  playsInline
  width="100%"
/>

Ignoring a diff will instruct Happo to ignore that specific diff now and in the
future. It should be used with a little bit of caution as it might hide issues
that should be caught.

Examples of where it _is okay_ to mark a diff as always ignored:

- ✅ When there's a subtle diff that you can't attribute to the changes made.
- ✅ When there are flaky rendering-related issues not caused by your code.

Examples of where you _should avoid_ marking a diff as always ignored:

- ❌ You've made a UI update causing diffs (simply
  [accept the report](reviewing-diffs.md#acceptingrejecting-a-report) instead).
- ❌ You're having spurious diffs where some images/fonts won't load
  ([reach out to us](mailto:support@happo.io) instead — this might be a bug).

## Global effect

Ignored diffs apply to all future and past Happo reports. This can lead to some
confusion when your Happo build status (in e.g. GitHub) shows a number of diffs,
but the Happo report page shows fewer diffs (or even none). Build statuses
aren't updated when you ignore a diff, you still need to
[manually approve or reject](reviewing-diffs.md).
