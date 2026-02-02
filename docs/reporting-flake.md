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

Diffs reported as flaky apply to all future and past Happo reports. You may
still need to [manually approve or reject](reviewing-diffs.md).

## Technical details

### What a diff is

A **diff** is a visual difference Happo found between the baseline and the new
run for a specific snapshot—for example, "Button / default / Chrome". Happo
compares the two rendered images using your project's
[compare threshold](compare-threshold.md) (and any other compare settings you've
configured). If the difference is above that threshold, it's shown as a diff.
Each diff corresponds to one component, variant, and target combination.

### How Happo identifies snapshots

Happo identifies each snapshot by what it is: component name, variant, target
(browser/viewport), and a hash of the image data. When you report a diff as
flake, Happo remembers **that specific before/after pair**. So the same flake is
ignored everywhere it appears--in past, current, and future comparisons--as long
as it's the same baseline and new snapshot. If your baseline or your rendered
output changes later, Happo may show a new diff for that same
component/variant/target, and that new diff won't be covered by the flake you
reported earlier.

### What happens when you report a diff as flake

When you click **Report Flake**:

- **On the comparison page**

  That diff is hidden from the comparison (and from any other comparison where
  the same snapshot pair appears). You may see fewer diffs, or none, on the
  page.

- **Build status**

  Your CI build status (e.g. the GitHub check) for that comparison is updated
  automatically if there are no longer any diffs remaining in the comparison.

- **Why flake can seem to come back**

  Because flake is tied to that exact before/after pair, a new run that produces
  a different snapshot (e.g. after a baseline update or a change in rendering)
  can show a new diff that isn't covered by the flake you reported. Fixing the
  underlying cause of the flake is the only way to prevent it from reappearing
  over time.
