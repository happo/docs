// Lazy-load the tracker library only on the client
if (typeof window !== 'undefined') {
  import('@plausible-analytics/tracker').then(({ init }) => {
    init({
      domain: 'docs.happo.io',
      captureOnLocalhost: false,
    });
  });
}
