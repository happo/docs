// Lazy-load the tracker library only on the client and fire a "Docs Visited"
// custom event for every page view under docs.happo.io. Pageviews are also
// captured automatically by the tracker, but the custom event lets us use
// "Docs Visited" as a top-of-funnel goal in Plausible.

let trackerPromise;

function getTracker() {
  if (!trackerPromise) {
    trackerPromise = import('@plausible-analytics/tracker').then(mod => {
      if (!window.__happoPlausibleInitialized) {
        mod.init({
          domain: 'docs.happo.io',
          captureOnLocalhost: false,
        });
        window.__happoPlausibleInitialized = true;
      }
      return mod;
    });
  }
  return trackerPromise;
}

function trackDocsVisited() {
  getTracker()
    .then(({ track }) => {
      try {
        track('Docs Visited', {
          props: { path: window.location.pathname },
        });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('Failed to track Docs Visited', err);
        }
      }
    })
    .catch(() => {
      // Tracker failed to load (e.g. blocked); ignore.
    });
}

if (typeof window !== 'undefined') {
  // Kick off the tracker init eagerly so the first pageview is captured even
  // if the route lifecycle below doesn't fire (older Docusaurus versions).
  getTracker();
}

export function onRouteDidUpdate({ location, previousLocation }) {
  if (typeof window === 'undefined') {
    return;
  }
  // Only fire when the pathname actually changes (or on first load when
  // previousLocation is null). Avoids double-firing on query/hash-only
  // updates.
  if (
    previousLocation &&
    previousLocation.pathname === location.pathname
  ) {
    return;
  }
  trackDocsVisited();
}
