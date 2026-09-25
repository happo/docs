// Each scene describes how to produce one screenshot or video used in the
// docs. See media/README.md for the full list of scene options.
//
// Scenes must never change real data. Don't click buttons that save anything
// (Accept, Reject, Create token, ...). When a scene needs a page in a
// particular state, find a page that is already in that state, such as one of
// the showcase PRs below.

// Happo reports come from demo PRs in happo/happo-showcase, a small app built
// for these screenshots. Each PR's report is kept in a known state (see that
// repo's README). Its Happo project is public, so the reports can be captured
// without logging in.
// PRs are looked up by branch, so a demo PR that has to be recreated doesn't
// need changes here.
const SHOWCASE_REPO = 'happo/happo-showcase';
const showcasePRs = {
  needsReview: 'demo/pricing-refresh',
  accepted: 'demo/notification-count',
  rejected: 'demo/modal-cleanup',
  accessibilityViolations: 'demo/compact-signup',
  animatedDiff: 'demo/toast-slide',
  flake: 'demo/statcard-data',
  // Changes nothing visible, so its report normally has no diffs. After Happo
  // updates its browsers, re-running it against its existing baseline gives
  // diffs caused only by the update. See browserUpdateReport below.
  browserUpdate: 'demo/browser-update',
  // The showcase has two Happo projects: Storybook components and Playwright
  // end-to-end tests. These PRs have visual changes in both. The first posts
  // one status per project, and the second combines them with orchestration.
  // Only their GitHub checks are used, so their reports aren't refreshed.
  multiProject: 'demo/multi-project',
  multiProjectOrchestrated: 'demo/multi-project-orchestrated',
};

async function githubApi(path) {
  const headers = { Accept: 'application/vnd.github+json' };
  // Optional. Unauthenticated requests are limited to 60 an hour.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(
    `https://api.github.com/repos/${SHOWCASE_REPO}/${path}`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`GitHub API ${path}: ${response.status}`);
  }
  return response.json();
}

// Remembers lookups for the rest of the run, but not failed ones, so a
// transient error doesn't fail every later scene too.
function memoize(fn) {
  const cache = new Map();
  return key => {
    if (!cache.has(key)) {
      cache.set(
        key,
        fn(key).catch(error => {
          cache.delete(key);
          throw error;
        }),
      );
    }
    return cache.get(key);
  };
}

// The open demo PR for a showcase branch.
const findShowcasePR = memoize(async branch => {
  const [pr] = await githubApi(
    `pulls?head=${SHOWCASE_REPO.split('/')[0]}:${branch}&state=open`,
  );
  if (!pr) {
    throw new Error(`No open PR for ${branch} in ${SHOWCASE_REPO}.`);
  }
  return pr;
});

// Whether a Happo report page has a comparison to show. The page returns 200
// either way, so this reads the data it renders from.
async function hasComparison(url) {
  const html = await (await fetch(url)).text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  );
  return Boolean(match && JSON.parse(match[1]).props.pageProps.comparison);
}

// Happo posts a commit status on the PR's head commit that links to the
// report. Reports can expire and be re-created, so the link is looked up each
// time instead of being hardcoded.
const findHappoReport = memoize(async branch => {
  const pr = await findShowcasePR(branch);
  const { statuses } = await githubApi(`commits/${pr.head.sha}/status`);
  const url = statuses.find(s => s.context.startsWith('Happo'))?.target_url;
  // While a run is in progress, or when it failed, the status links to a
  // Happo job instead of a report.
  if (!url?.includes('/compare/') || !(await hasComparison(url))) {
    throw new Error(
      `No Happo report for ${SHOWCASE_REPO}#${pr.number}. Run the ` +
        `"Refresh demo reports" workflow in that repo, then try again.`,
    );
  }
  return url;
});

// A scene `url` for the Happo report of a showcase PR, with optional query
// parameters (e.g. { t: 'ignoredDiffs' } to open a sidebar tab).
function showcaseReport(branch, params = {}) {
  return async () => {
    const url = new URL(await findHappoReport(branch));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.href;
  };
}

// Logged-in sessions that some scenes need. Create one with
// `pnpm media login <name>`. Use the account named here so that screenshots
// don't leak real customer data.
export const authProfiles = {
  github: {
    name: 'GitHub',
    account: 'happo docs demo',
    loginUrl: 'https://github.com/login',
  },
  happo: {
    name: 'Happo',
    account: 'happo docs demo',
    loginUrl: 'https://happo.io/login',
  },
};

// CSS added to every page on a given host, to hide things that shouldn't be in
// screenshots.
export const siteStyles = {
  'happo.io': `
    [class*="GetHelpButton-module"] { display: none !important; }
    /* The logged-in user's avatar menu. Scenes run with a real account. */
    nav [class*="Dropdown-module"]:has([class*="Avatar-module"]) {
      visibility: hidden !important;
    }
  `,
};

// Waits for the before/after images in a Happo report to finish loading.
async function waitForSnapshots(page) {
  const images = page.locator('img[class*="SideBySide-module"]');
  await images.first().waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('img[class*="SideBySide-module"]')].every(
      img => img.complete && img.naturalWidth > 0,
    ),
  );
}

// Public reports show the email address of whoever reported a flake. Swap in a
// placeholder so real addresses don't end up in the docs.
async function hideEmails(page) {
  await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      node.textContent = node.textContent.replace(
        /[\w.+-]+@[\w-]+(\.[\w-]+)+/g,
        'you@example.com',
      );
    }
  });
}

// The first before/after snapshot pair in a Happo report.
function firstSnapshot(page) {
  return page.locator('[class*="SnapItem-module"][class*="target"]').first();
}

// The first accessibility snapshot in a Happo report, which has Violations and
// Snapshot tabs instead of the image diff views.
function firstAccessibilitySnapshot(page) {
  return page
    .locator('[class*="SnapItem-module"][class*="target"]')
    .filter({
      has: page.getByRole('button', { name: 'Violations', exact: true }),
    })
    .first();
}

// Lets a scene change the report data a Happo report page loads, e.g. to show
// numbers that match the docs. Only changes what this browser sees.
async function editReportData(page, edit) {
  await page.route('**/api/**/compare-results*', async route => {
    const response = await route.fetch();
    const body = await response.text();
    if (!body) {
      await route.fulfill({ response });
      return;
    }
    const json = JSON.parse(body);
    edit(json);
    await route.fulfill({ response, json });
  });
}

// The Reject/Accept control in the report sidebar of a showcase PR.
function reviewPanel(id, branch) {
  return {
    id,
    output: `static/img/${id}.png`,
    url: showcaseReport(branch),
    // The PR author's avatar sits just above the panel.
    css: `
      [class*="leaveReviewSection"] { border-top: none !important; }
      img[src*="avatars.githubusercontent.com"] { visibility: hidden; }
    `,
    // The buttons, and the "Reviewed by" note under them once there is one.
    // The section itself has padding and room for the note even when it's
    // empty, which leaves wide empty margins.
    target: page => [
      page.locator(
        '[class*="ReviewVerdictControl-module"][class*="__container"]',
      ),
      page.locator(
        '[class*="leaveReviewSection"] [class*="Comparison-module"][class*="__note"]',
      ),
    ],
    padding: 16,
  };
}

// Thrown by a scene when something it needs doesn't exist yet. `pnpm media
// capture` reports the scene as skipped, with this message, instead of failed.
export class SceneSkipped extends Error {}

// Settings pages for the showcase's Happo account. Unlike reports, these need a
// login with admin access to that account.
const SHOWCASE_ACCOUNT = 'https://happo.io/a/1342';
const SHOWCASE_PROJECT = `${SHOWCASE_ACCOUNT}/p/2884`;

// Settings scenes fill in forms and move sliders, but never save. Refusing
// every request that could change something makes sure a stray click can't
// save either.
async function blockWrites(page) {
  await page.route('**/*', route =>
    ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
      ? // Leave reads to any other route a scene sets up.
        route.fallback()
      : route.abort(),
  );
}

// Lets a scene change the data a happo.io page is server-rendered with (its
// __NEXT_DATA__), e.g. to fill a chart that's empty on the demo account. Only
// changes what this browser sees.
async function editPageProps(page, url, edit) {
  await page.route(url, async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      /(<script id="__NEXT_DATA__" type="application\/json">)(.*?)(<\/script>)/s,
      (_, open, json, close) => {
        const data = JSON.parse(json);
        edit(data.props.pageProps);
        return open + JSON.stringify(data) + close;
      },
    );
    await route.fulfill({ response, body: html });
  });
}

// Daily accessibility violation counts that trend down as fixes land. The
// showcase has no violations on its main branch, so its graph is empty.
function illustrativeViolationCounts(days) {
  // Each series steps down on the given days.
  const series = {
    criticalCount: [
      [0, 18],
      [8, 12],
      [15, 5],
      [22, 0],
    ],
    seriousCount: [
      [0, 34],
      [6, 30],
      [12, 21],
      [19, 14],
      [25, 9],
    ],
    moderateCount: [
      [0, 12],
      [10, 10],
      [18, 6],
      [27, 4],
    ],
    minorCount: [
      [0, 7],
      [14, 5],
      [24, 3],
    ],
  };
  return days.map((day, i) => {
    const counts = {};
    for (const [key, steps] of Object.entries(series)) {
      counts[key] = steps.filter(([from]) => from <= i).at(-1)[1];
    }
    return { ...day, ...counts };
  });
}

// Moves a range slider to a fraction of the way along it. Playwright can't
// fill() a range input, so this sets the value the way React expects and fires
// the events it listens for.
async function setSlider(locator, fraction) {
  await locator.evaluate((input, fraction) => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const step = Number(input.step) || 1;
    const value = min + Math.round(((max - min) * fraction) / step) * step;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, fraction);
}

// The comparison data behind a Happo report page, from the report's public
// API.
const comparisonApi = reportUrl =>
  reportUrl
    .replace('happo.io/a/', 'happo.io/api/a/')
    .replace('/compare/', '/comparisons/');

// Makes Accept/Reject on a report look like it worked, without saving
// anything. The review request (PATCH /api/a/:account/comparisons/:id) is
// answered here with the comparison as it would be afterwards, credited to the
// reviewer of the accepted demo PR. Every other write is refused.
async function fakeReviews(page, reportUrl) {
  const current = await (
    await page.request.get(comparisonApi(reportUrl))
  ).json();
  const accepted = await (
    await page.request.get(
      comparisonApi(await findHappoReport(showcasePRs.accepted)),
    )
  ).json();
  await page.route('**/*', route => {
    const request = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      return route.continue();
    }
    if (
      request.method() === 'PATCH' &&
      /\/api\/a\/\d+\/comparisons\/\d+$/.test(request.url())
    ) {
      return route.fulfill({
        json: {
          ...current,
          ...request.postDataJSON(),
          resolvedBy: accepted.resolvedBy,
        },
      });
    }
    return route.abort();
  });
}

// The newest report for the browser-update demo PR that has diffs from a
// Happo browser update. GitHub keeps every status posted on a commit, so older
// runs are searched too, as long as their reports still exist. Until Happo
// updates its browsers after that PR's baseline was made, there is none, and
// the scene is skipped.
async function browserUpdateReport() {
  let pr;
  try {
    pr = await findShowcasePR(showcasePRs.browserUpdate);
  } catch {
    throw new SceneSkipped(
      `Needs an open ${SHOWCASE_REPO} PR from the ${showcasePRs.browserUpdate} ` +
        'branch that changes nothing visible, labeled docs-demo.',
    );
  }
  const statuses = await githubApi(
    `commits/${pr.head.sha}/statuses?per_page=100`,
  );
  const reports = statuses
    .filter(
      s => s.context.startsWith('Happo') && s.target_url?.includes('/compare/'),
    )
    .map(s => s.target_url);
  for (const url of new Set(reports)) {
    const response = await fetch(comparisonApi(url));
    if (!response.ok) continue;
    const comparison = await response.json();
    if (comparison.diffs > 0 && comparison.systemMessages?.length) return url;
  }
  throw new SceneSkipped(
    `No report for ${SHOWCASE_REPO}#${pr.number} has diffs from a Happo ` +
      'browser update yet. After Happo announces one, run its Happo workflow ' +
      'again (without refreshing the baseline), then capture this scene.',
  );
}

// One section of a project's compare settings page, e.g. "Compare threshold".
function thresholdSection(id, target, prepare) {
  return {
    id,
    output: `static/img/${id}.png`,
    url: `${SHOWCASE_PROJECT}/thresholds`,
    auth: 'happo',
    setup: blockWrites,
    async prepare(page) {
      await page.getByText('Compare settings for project').waitFor();
      await prepare?.(page);
    },
    target,
    padding: 16,
  };
}

const thresholdsSection = (page, heading) =>
  page
    .locator('[class*="thresholds-module"][class*="__section"]')
    .filter({ has: page.getByRole('heading', { name: heading }) });

// The checks list in the merge box of a showcase PR on GitHub, which is only
// shown to logged-in users. `wholeMergeBox` includes the merge button too.
function githubChecks(id, branch, { heading, wholeMergeBox = false }) {
  const mergeBox = '[data-testid="mergebox-border-container"]';
  return {
    id,
    output: `static/img/${id}.png`,
    url: async () => (await findShowcasePR(branch)).html_url,
    auth: 'github',
    // GitHub keeps connections open, so its pages never go network-idle.
    waitUntil: 'load',
    target: page =>
      page.locator(
        wholeMergeBox ? mergeBox : `${mergeBox} section[aria-label="Checks"]`,
      ),
    async prepare(page) {
      await page.getByText(heading).waitFor();
      // GitHub collapses the list when every check passed. Expanding it only
      // changes the view.
      const checks = page.locator(`${mergeBox} section[aria-label="Checks"]`);
      if (!(await checks.getByText('Happo', { exact: false }).count())) {
        await checks.getByRole('button', { name: 'Expand checks' }).click();
        await checks
          .getByText(/^Happo/)
          .first()
          .waitFor();
      }
    },
    padding: 8,
  };
}

// The "View source for after image…" item in a snapshot's open "…" menu. Each
// snapshot has its own (hidden) menu, so only look at the visible one.
// A real Happo worker-update alert, on the report for happo/docs#278, made
// right after Happo updated its browsers. Only a real alert is used, so its
// text matches what Happo actually says.
const BROWSER_UPDATE_ALERT_REPORT =
  'https://happo.io/a/1520/p/2452/compare/d23e6756d814888b92b45de97f66cc725d313913/806f86eac8a414e6a196cf836de37c2833e57452';

const viewSourceMenuItem = page =>
  page.getByText(/View source for after image/).filter({ visible: true });

export const scenes = [
  // docs/reviewing-diffs.md
  {
    id: 'happo-report',
    output: 'static/img/happo-report.png',
    url: showcaseReport(showcasePRs.needsReview),
    viewport: { width: 1400, height: 900 },
    prepare: waitForSnapshots,
  },
  reviewPanel('happo-review-panel', showcasePRs.needsReview),
  reviewPanel('happo-review-panel-accepted', showcasePRs.accepted),
  reviewPanel('happo-review-panel-rejected', showcasePRs.rejected),

  // docs/reviewing-diffs.md and docs/browser-updates.md
  {
    id: 'happo-worker-update-alert',
    output: 'static/img/happo-worker-update-alert.png',
    async url() {
      if (!(await hasComparison(BROWSER_UPDATE_ALERT_REPORT))) {
        throw new SceneSkipped(
          `The report at ${BROWSER_UPDATE_ALERT_REPORT} no longer exists. ` +
            'Find another report made after a Happo browser update (its ' +
            'comparison data has systemMessages) and use that.',
        );
      }
      return BROWSER_UPDATE_ALERT_REPORT;
    },
    target: page => page.locator('[class*="Alert-module"][class*="__root"]'),
    padding: 8,
  },

  // docs/reporting-flake.md
  //
  // Report flake is only shown to logged-in users who can review. The video
  // points at it (as the icon button, then in the "…" menu) but never clicks
  // it, and every other write is refused too.
  {
    id: 'happo-report-flake',
    output: 'static/video/happo-report-flake.webm',
    url: showcaseReport(showcasePRs.needsReview),
    auth: 'happo',
    viewport: { width: 1280, height: 720 },
    setup: blockWrites,
    prepare: waitForSnapshots,
    async record(page, { click, hover }) {
      await hover(
        page.getByRole('button', { name: 'Report flake' }).first(),
        2000,
      );
      await click(
        page.locator('button:has([class*="moreOptionsButton"])').first(),
        { before: 900, after: 900 },
      );
      // Each snapshot also has a "Report flake" tooltip, so look inside the
      // open menu (the only place "View history…" is visible).
      const menu = page
        .getByText('View history…')
        .filter({ visible: true })
        .locator(
          'xpath=ancestor::*[.//*[normalize-space(text())="Report flake"]][1]',
        );
      // Point at the whole menu row, so the pointer can rest past the label.
      await hover(
        menu.getByText('Report flake', { exact: true }).locator('..'),
        2500,
      );
    },
  },
  {
    id: 'happo-ignored-diffs',
    output: 'static/img/happo-ignored-diffs.png',
    url: showcaseReport(showcasePRs.flake, { t: 'ignoredDiffs' }),
    viewport: { width: 1200, height: 760 },
    async prepare(page) {
      await waitForSnapshots(page);
      await hideEmails(page);
    },
  },

  // docs/accessibility.md
  {
    id: 'accessibility-violation-filter',
    output: 'static/img/accessibility-violation-filter.png',
    url: showcaseReport(showcasePRs.accessibilityViolations, {
      t: 'diffs',
      axeFilter: 'color-contrast',
    }),
    viewport: { width: 1200, height: 800 },
    async prepare(page) {
      await page.getByText('Active filter:').waitFor();
    },
  },
  {
    id: 'accessibility-violations',
    output: 'static/img/accessibility-violations.png',
    url: showcaseReport(showcasePRs.accessibilityViolations),
    viewport: { width: 1200, height: 800 },
    async prepare(page) {
      await firstAccessibilitySnapshot(page)
        .getByRole('button', { name: 'Show details' })
        .first()
        .click();
    },
    target: firstAccessibilitySnapshot,
    padding: 4,
  },
  {
    id: 'aria-snapshot',
    output: 'static/img/aria-snapshot.png',
    url: showcaseReport(showcasePRs.accessibilityViolations),
    viewport: { width: 1200, height: 800 },
    async prepare(page) {
      const snapshot = firstAccessibilitySnapshot(page);
      await snapshot
        .getByRole('button', { name: 'Snapshot', exact: true })
        .click();
      await snapshot.getByText('- document:').first().waitFor();
    },
    target: firstAccessibilitySnapshot,
    padding: 2,
  },

  // docs/animated-snapshots.md
  {
    id: 'happo-animated-diff',
    output: 'static/img/happo-animated-diff.png',
    url: showcaseReport(showcasePRs.animatedDiff),
    viewport: { width: 1200, height: 800 },
    async prepare(page) {
      const snapshot = firstSnapshot(page);
      // The toast fades in, so the first frame is blank. Show one mid-slide.
      await snapshot.getByRole('button', { name: /^Frame 4,/ }).click();
      await snapshot.getByText(/^Frame 4\//).waitFor();
      // The frames are drawn on a canvas once both APNGs have loaded.
      await snapshot.locator('canvas').evaluate(
        canvas =>
          new Promise(resolve => {
            const check = () => {
              const { data } = canvas
                .getContext('2d')
                .getImageData(0, 0, canvas.width, canvas.height);
              if (data.some((value, i) => i % 4 === 3 && value > 0)) {
                resolve();
              } else {
                requestAnimationFrame(check);
              }
            };
            check();
          }),
      );
      // Let the frame that was just drawn reach the screen.
      await page.evaluate(
        () =>
          new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    },
    target: firstSnapshot,
    padding: 4,
  },

  // docs/storybook.mdx
  //
  // The showcase reports aren't partial runs, so the numbers are swapped for
  // the ones in the docs. With fewer quota used than snapshots, "quota used"
  // becomes a link, like it does after a partial run.
  {
    id: 'happo-partial-run-stats',
    output: 'static/img/happo-partial-run-stats.png',
    url: showcaseReport(showcasePRs.needsReview),
    async setup(page) {
      await editReportData(page, data => {
        data.stats = {
          ...data.stats,
          snapshotsCount: 6809,
          snapshotsUsage: 2233,
          componentsCount: 113,
        };
      });
    },
    async prepare(page) {
      await page.getByRole('link', { name: '2,233 quota used' }).waitFor();
    },
    target: page => page.locator('[class*="statsDescription"]'),
    padding: 8,
  },

  // docs/performance.md
  //
  // Timings are in the "…" menu of each snapshot. The showcase components
  // render in under a millisecond, which reads like a bug, so the numbers are
  // swapped for the ones in the docs.
  {
    id: 'happo-snapshot-timings',
    output: 'static/img/happo-snapshot-timings.png',
    url: showcaseReport(showcasePRs.needsReview),
    viewport: { width: 1600, height: 800 },
    async setup(page) {
      await editReportData(page, data => {
        for (const snapshot of data.diffs[0]) {
          Object.assign(snapshot, {
            renderTime: 44,
            waitTime: 53,
            screenshotTime: 106,
          });
        }
      });
    },
    async prepare(page) {
      await firstSnapshot(page)
        .locator('button:has([class*="moreOptionsButton"])')
        .click();
      await page.getByText(/^Render\s44ms/).waitFor();
    },
    target: page => page.locator('ul[class*="Dropdown-module"]'),
    padding: 6,
  },

  // docs/debugging.md
  //
  // The "View logs" link at the bottom of the report sidebar.
  {
    id: 'happo-view-logs-link',
    output: 'static/img/happo-view-logs-link.png',
    url: showcaseReport(showcasePRs.needsReview),
    target: page =>
      page
        .locator(
          '[class*="ComparisonPanel-module"][class*="filterItemTextOnly"]',
        )
        .filter({ has: page.getByRole('link', { name: 'View logs' }) }),
    padding: 12,
  },
  //
  // "View source" is only in the overflow menu for logged-in users.
  {
    id: 'happo-view-source',
    output: 'static/video/happo-view-source.webm',
    url: showcaseReport(showcasePRs.needsReview),
    auth: 'happo',
    viewport: { width: 1280, height: 720 },
    prepare: waitForSnapshots,
    // Ends pointing at the menu item. Clicking it would go to the Source
    // page, which the screenshot below the video shows.
    async record(page, { click, hover }) {
      await click(
        page.locator('button:has([class*="moreOptionsButton"])').first(),
        { before: 1200, after: 900 },
      );
      await hover(viewSourceMenuItem(page), 2500);
    },
  },
  {
    id: 'happo-source-page',
    output: 'static/img/happo-source-page.png',
    url: showcaseReport(showcasePRs.needsReview),
    auth: 'happo',
    async prepare(page) {
      await page
        .locator('button:has([class*="moreOptionsButton"])')
        .first()
        .click();
      await viewSourceMenuItem(page).click();
      await page.waitForLoadState('networkidle');
    },
    // The page's content column. The page itself is much wider than the
    // content, which leaves wide empty margins.
    target: page => page.locator('[class*="snapshotSourcePage"]'),
    // The navbar is right above the content, so keep the top padding small.
    padding: { top: 8, right: 24, bottom: 24, left: 24 },
  },

  // docs/compare-threshold.md
  thresholdSection(
    'compare_threshold',
    page => thresholdsSection(page, 'Compare threshold'),
    // Far enough along that the two gray boxes are visibly different.
    page => setSlider(page.locator('input[name="compareThreshold"]'), 0.15),
  ),
  thresholdSection(
    'ignore_threshold',
    page => thresholdsSection(page, 'Ignore threshold'),
    // Enough that the table shows some pixels allowed at each size.
    page =>
      setSlider(
        page.locator('input[type="range"][name="ignoreThreshold"]'),
        0.2,
      ),
  ),
  thresholdSection(
    'apply_blur',
    page =>
      page
        .locator('[class*="thresholds-module"][class*="__toggle"]')
        .filter({ hasText: 'Blur images' }),
    // Turned on (but not saved) to show what it looks like enabled.
    page => page.getByText('Blur images', { exact: true }).click(),
  ),

  // docs/accessibility.md
  {
    id: 'accessibility-graph',
    output: 'static/img/accessibility-graph.png',
    url: `${SHOWCASE_ACCOUNT}/accessibility`,
    auth: 'happo',
    async setup(page) {
      await blockWrites(page);
      await editPageProps(page, `${SHOWCASE_ACCOUNT}/accessibility`, props => {
        props.axeSummaries = illustrativeViolationCounts(props.axeSummaries);
      });
    },
    async prepare(page) {
      // Hover part way along so the chart shows its tooltip for that day.
      const chart = page.locator('svg[class*="AxeSummaries-module"]');
      const box = await chart.boundingBox();
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
      await page.waitForTimeout(500);
    },
    target: page =>
      page.locator('svg[class*="AxeSummaries-module"]').locator('..'),
    // The "Reports" heading is right below the chart.
    padding: { top: 16, right: 16, bottom: 4, left: 16 },
  },

  // docs/browser-updates.md
  //
  // Not captured yet: this runs once a real browser update has produced diffs
  // (see browserUpdateReport).
  {
    id: 'happo-browser-update-diff',
    output: 'static/img/happo-browser-update-diff.png',
    url: browserUpdateReport,
    async prepare(page) {
      await waitForSnapshots(page);
      await firstSnapshot(page)
        .getByRole('button', { name: 'Diff', exact: true })
        .click();
      await page.waitForTimeout(500);
    },
    target: firstSnapshot,
    // The headings above and below the snapshot are close to it.
    padding: { top: 0, right: 16, bottom: 0, left: 16 },
  },

  // docs/user-roles.md
  //
  // Who can view and review reports, and the users with access. Emails are
  // replaced with a placeholder.
  {
    id: 'happo-user-access',
    output: 'static/img/happo-user-access.png',
    url: `${SHOWCASE_ACCOUNT}/user-access`,
    auth: 'happo',
    setup: blockWrites,
    prepare: hideEmails,
    target: page => [
      page.getByRole('heading', { name: 'Permissions' }),
      page.getByRole('heading', { name: 'Users' }).locator('..'),
    ],
    padding: 16,
  },

  // docs/webhooks.md
  {
    id: 'webhooks-new',
    output: 'static/img/webhooks-new.png',
    url: `${SHOWCASE_ACCOUNT}/webhooks/new/edit`,
    auth: 'happo',
    setup: blockWrites,
    async prepare(page) {
      // Example values. The form is never saved.
      await page
        .locator('input[name="url"]')
        .fill('https://my-server.com/endpoint');
      await page.locator('input[name="secret"]').fill('az78ARErhgFJ');
      await page.locator('input[name="secret"]').blur();
    },
    target: page =>
      page.getByRole('heading', { name: 'New webhook' }).locator('..'),
    padding: 16,
  },
  {
    id: 'webhooks-recent-deliveries',
    output: 'static/img/webhooks-recent-deliveries.png',
    url: `${SHOWCASE_ACCOUNT}/webhooks`,
    auth: 'happo',
    setup: blockWrites,
    async prepare(page) {
      const link = page.getByRole('link', { name: 'Recent deliveries' });
      if (!(await link.count())) {
        // Creating a webhook is a real change, so it's left to a person.
        throw new SceneSkipped(
          `Needs a webhook on ${SHOWCASE_ACCOUNT}/webhooks that has sent ` +
            'deliveries. Add one for https://httpbin.org/status/200, run the ' +
            '"Happo" workflow in happo/happo-showcase on main, then capture ' +
            'again. Delete the webhook afterwards.',
        );
      }
      await page.goto(
        new URL(await link.first().getAttribute('href'), page.url()).href,
        {
          waitUntil: 'networkidle',
        },
      );
      // Show the same example URL as the New webhook screenshot.
      await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        while (walker.nextNode()) {
          walker.currentNode.textContent =
            walker.currentNode.textContent.replace(
              /https?:\/\/httpbin\.org\/\S*/,
              'https://my-server.com/endpoint',
            );
        }
      });
    },
    // Headings stretch to the width of their container, which is much wider
    // than the table. Fitting them to their text keeps the crop tight.
    css: 'h2 { width: fit-content; }',
    // From the heading down to the end of the table.
    target: page => [
      page.getByRole('heading', { name: 'Recent deliveries' }),
      page.locator('table'),
    ],
    padding: 16,
  },

  // docs/continuous-integration.md
  githubChecks('happo-in-ci', showcasePRs.accepted, {
    heading: 'All checks have passed',
    wholeMergeBox: true,
  }),
  githubChecks('happo-status-diffs', showcasePRs.needsReview, {
    heading: 'Some checks were not successful',
  }),
  githubChecks('happo-status-accepted', showcasePRs.accepted, {
    heading: 'All checks have passed',
  }),
  {
    id: 'happo-github-app',
    output: 'static/img/happo-github-app.gif',
    manual:
      'Record installing the app from https://github.com/apps/happo. ' +
      "Automating this would install the app for real, so it's done by hand.",
  },
  {
    id: 'happo-github-integration',
    output: 'static/img/happo-github-integration.gif',
    manual: 'Record activating a repo at https://happo.io/github-integration.',
  },
  {
    id: 'happo-status-accept',
    output: 'static/video/happo-status-accept.webm',
    url: showcaseReport(showcasePRs.needsReview),
    // Clicking Accept only works for logged-in users. The click is real, but
    // the request it sends is answered by fakeReviews and never reaches Happo.
    auth: 'happo',
    viewport: { width: 1100, height: 620 },
    async setup(page) {
      await fakeReviews(page, await findHappoReport(showcasePRs.needsReview));
    },
    prepare: waitForSnapshots,
    async record(page, { click }) {
      await click(
        page
          .locator('[class*="leaveReviewSection"]')
          .getByRole('button', { name: /^Accept/ }),
      );
      await page
        .locator('[class*="leaveReviewSection"]')
        .getByRole('button', { name: /^Accepted/ })
        .waitFor();
    },
    holdLastFrame: 2500,
  },
  {
    id: 'happo-bitbucket-api-token',
    output: 'static/img/happo-bitbucket-api-token.gif',
    manual: 'Record creating a Bitbucket API token (then revoke it).',
  },
  {
    id: 'happo-bitbucket-repo-access-token',
    output: 'static/img/happo-bitbucket-repo-access-token.gif',
    manual:
      'Record creating a Bitbucket repository access token (then revoke it).',
  },
  {
    id: 'happo-azure-pat',
    output: 'static/img/happo-azure-pat.gif',
    manual:
      'Record creating an Azure DevOps personal access token (then revoke it).',
  },

  // docs/multi-project.md
  githubChecks('happo-github-status-splitup', showcasePRs.multiProject, {
    heading: 'Some checks were not successful',
  }),
  githubChecks(
    'happo-github-status-orchestrated',
    showcasePRs.multiProjectOrchestrated,
    { heading: 'Some checks were not successful' },
  ),
];
