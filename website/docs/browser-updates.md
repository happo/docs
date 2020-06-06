---
id: browser-updates
title: Browser updates
---

From time to time, Happo's infrastructure is updated to run newer versions of
browsers. When that happens, there's a chance you see a large number of diffs
even though you didn't introduce any changes in your application.

<img
  src="/img/happo-browser-update-diff.png"
  alt="Happo status on a GitHub pull request"
  width="1290"
  height="494"
/>
_Example of a diff caused by an updated Safari worker. The newer version of
Safari rendered the font slightly different from the previous version causing a
diff to appear on the component's label._

When this happens, you will most likely see an alert at the top of the report
outlining the changes made to Happo infrastructure that might have caused the
diffs. Annoying as this might be, it's usually safe to simply accept the report
and move on (once you're confident that the changes are solely caused by the
browser update).
