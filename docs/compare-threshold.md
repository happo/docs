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
performance. Comparing bitmaps is expensive, so we want to avoid that as much as
possible. Happo processes hundreds, even thousands of diffs every minute. Having
to dig into the actual pixels would mean comparisons would run a lot slower. So
instead we diff based on technique called
["bitmap hashing"](native.md#bitmap-hashing). Each screenshot is assigned a hash
based on its contents (the pixels). We compare hashes, not screenshots.

## Deep comparisons

In cases where the default bitmap hashing comparison is too limiting, you can
tell Happo to deep-compare screenshots. A shallow diff (bitmap hash comparisons)
is then first applied, and any diffs remaining after that will be deep-compared.
The behavior of the deep comparison is configured per project. Here's how to
find the settings:

1. Go to the projects admin page, at https://happo.io/projects
2. In the overflow menu (three dots next to the project name), select "Configure
   diff thresholds"
3. Choose settings that fit your test suite

If you can't find the settings, it could be that you aren't an administrator of
the account. Only admins can update these settings.

There are three settings that control deep comparisons, outlined below.

### Compare threshold

<img
  src="/img/compare_threshold.png"
  alt="The compare threshold option"
  width="239"
  height="242"
/>

This option controls how different two pixels are allowed to be. Use the slider
to change the threshold value. The right side gray box will change color to
visualize what the threshold value means for pixel comparisons. It will update
its color to the largest possible difference for the current threshold value.

### Ignore threshold

<img
  src="/img/ignore_threshold.png"
  alt="The ignore threshold option"
  width="238"
  height="239"
/>

In certain cases, a small amount of pixels can cause a diff despite the majority
of pixels being the same. By using the ignore threshold option, you can tell
Happo to ignore a small amount of pixels. This is useful if you for instance
have images with noise in them, causing a few pixels to have a large color
difference.

### Apply blur

<img
  src="/img/apply_blur.png"
  alt="The apply blur option"
  width="243"
  height="228"
/>

If your screenshots are high in contrast, you can blur the images slightly
before comparing them. This can help smooth out some rough edges that can
otherwise cause diffs. Note that blurring images when comparing them does
nothing to the original screenshots -- it's simply a preprocessing step for the
deep comparison.

## Recommended settings

If you can get away with not enabling these settings at all, that is always
best. If not, start with a low compare threshold to begin with: `0.002`. Leave
other options turned off.

Ignore threshold is mostly used if you have graphical content (images, canvases,
maps, etc) in your screenshots and it's hard to control noise. If you notice
spots with few or single-pixel diffs, set the ignore threshold to something like
`"Allow 5 pixels to be above compare threshold in a 1000×500 pixel image"`. The
underlying value is a float, so large images will allow more pixels to be
ignored and small images will allow fewer.

Apply blur should most often be turned off as it does affect performance a
little. Only turn it on if you have high contrast screenshots where element
edges contain diffs.
