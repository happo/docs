---
id: hiding-content
title: Hiding Content
---

If you want to hide certain content/elements from your Happo screenshots, you
can use the `data-happo-hide` attribute. Here's an example where a counter
element is hidden:

```html
<div>
    You are visitor number
    <div data-happo-hide="">
        1,289
    </div>
</div>
```

By adding the `data-happo-hide` attribute, the resulting screenshot will not
show the element. Under the hood, `data-happo-hide` simply sets the following
CSS:

```css
[data-happo-hide] {
    visibility: hidden;
}
```

## Ignoring instead of hiding

If you don't want the element to be hidden in the screenshot, you can use the
`hideBehavior` configuration option. Set it to `"ignore"` to make the element
show up in the screenshot, but be ignored when Happo compares the screenshot
with another one.

```js
// .happo.js
module.exports = {
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
      hideBehavior: 'ignore',
    }),
  },
};
```
