---
id: browsers
title: Supported browsers
---

Happo supports a number of different web browsers. If you think some browser is
missing, reach out to us at [support@happo.io](mailto:support@happo.io) and
we'll consider adding it to the mix.

|                                                                                      | Browser                           |
| ------------------------------------------------------------------------------------ | --------------------------------- |
| <img src="/img/browser-icons/chrome.svg" width="35px" height="35px" alt="" />        | Google Chrome                     |
| <img src="/img/browser-icons/firefox.svg" width="35px" height="35px" alt="" />       | Mozilla Firefox                   |
| <img src="/img/browser-icons/edge.svg" width="35px" height="35px" alt="" />          | Microsoft Edge                    |
| <img src="/img/browser-icons/safari.svg" width="35px" height="35px" alt="" />        | Safari                            |
| <img src="/img/browser-icons/ios-safari.svg" width="35px" height="35px" alt="" />    | iOS Safari (running on an iPhone) |
| <img src="/img/browser-icons/ios-safari.svg" width="35px" height="35px" alt="" />    | iOS Safari (running on an iPad)   |
| <img src="/img/browser-icons/accessibility.svg" width="35px" height="35px" alt="" /> | Accessibility                     |

We keep these browsers up-to-date on a regular basis, and we try to keep them at
the latest versions. In some cases though, we might have to stick with a
slightly older version. If we for instance can't get newer browser versions to
perform well, we'll hold off on making the update until we've figured out a way
to adjust for the performance hit.

## Accessibility Testing

Happo provides accessibility testing as a target that uses
[axe-core®](https://www.deque.com/axe/) and static analysis to automatically
detect accessibility violations in your pages and components. When you configure
an `accessibility` target, Happo runs axe-core's comprehensive accessibility
engine against your rendered components, performing static analysis of the DOM
structure, ARIA attributes, color contrast ratios, and other
accessibility-related properties. This allows you to catch accessibility issues
early in your development process, similar to how visual regression testing
helps catch visual bugs. Happo tracks violations over time and helps you ensure
your application maintains accessibility standards as it evolves. For more
details on setting up and using accessibility testing, see our
[accessibility documentation](accessibility.md).

---

axe-core® is a trademark of Deque Systems, Inc. in the US and other countries.
