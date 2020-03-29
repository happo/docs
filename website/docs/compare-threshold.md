---
id: compare-threshold
title: Compare with a threshold
---

By default, Happo treats any two screenshots that have pixels that aren't the
same as a diff, even if the diff is only a single pixel. This is by design, and
can strike many as an odd limitation. Why not allow some small differences?
There are two reasons we've made Happo strict about differences. The first one
comes from our experience doing screenshot testing over the last decade — it's
just inherently hard to know when a subtle diff is okay. The second reason is
performance. Comparing bitmaps is expensive, so we want to avoid that as much
as possible. Happo processes hundreds, event thousands of diffs every minute.
Having to dig into the actual pixels would mean comparisons would run a lot
slower. So instead we diff based on technique called ["bitmap
hashing"](native.md#bitmap-hashing). Each screenshot is assigned a hash based
on its contents (the pixels). We compare hashes, not screenshots.

## The escape hatch

If you feel that bitmap hash diffing is too limiting, there's a way around it.
[The `compareThreshold` configuration
option](configuration.md#compareThreshold) is a number that specifies the maximum
allowed color distance between two pixels.

```js
module.exports = {
  compareThreshold: 0.005,
};
```

`compareThreshold` is used when you (or [the `happo-ci`
script](continuous-integration.md#happo-ci)) calls `happo compare`.

Refer to [the Configuration docs](configuration.md#compareThreshold) for a
lengthier description of how to use this option.



