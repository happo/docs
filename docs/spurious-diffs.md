---
id: spurious-diffs
title: Spurious diffs
---

An important factor when constructing a good screenshot testing setup is to keep
the number of spurious diffs to a minimum. A spurious diff (or a false positive)
is when Happo finds a difference that isn't caused by a change in the code.
These involve (but are not limited to):

- image loading
- font loading
- asynchronous behavior (e.g. components fetching data)
- animations
- random data, counters, etc
- dates, timestamps, etc

Happo tries to take care of as many of these as possible, automatically. For
instance, the following tasks are performed before taking the screenshot:

- wait for images (including background images, srcset)
- wait for custom fonts
- wait for asynchronous data fetching (XHR, `window.fetch`)
- disable CSS animations/transitions
- stop SVG animations

In some cases however, Happo can't automatically detect things that cause
spuriousness. Here are some tips & tricks that you might find useful when
dealing with spurious diffs:

- If you have dates/timestamps, either injecting a fixed
  `new Date('2019-05-23T08:28:02.446Z')` into your component or freezing time
  via something like [mockdate](https://www.npmjs.com/package/mockdate) or
  [Sinon.js](https://sinonjs.org/) can help.
- If a component depends on external data (via some API), consider splitting out
  the data-fetching from the component and test the component without data
  fetching, injecting the data needed to render it.
- If you have animations controlled from JavaScript, find a way to disable them
  for the Happo test suite.
- If individual elements are known to cause spuriousness, consider adding the
  `data-happo-hide` attribute. This will render the element invisible in the
  screenshot. E.g. `<div data-happo-hide>{Math.random()}</div>`.
