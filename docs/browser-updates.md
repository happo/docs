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

### No-diff diffs

As a result of some browser updates, diffs can appear that aren't showing any
pixel differences at all. When this happens, the most probable cause is that the
underlying browser driver has changed how it creates screenshots, causing
different bytes in the captured PNG image than it used to do. This confuses
Happo's diff resolution, since it relies on computed hashes of the PNG images
(known as "bitmap hashing"). If the hashes are different, Happo assumes the
pixels are different.
