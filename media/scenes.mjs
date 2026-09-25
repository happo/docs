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
    target: page => page.locator('[class*="leaveReviewSection"]'),
    padding: 16,
  };
}

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

  // docs/reporting-flake.md
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

  // docs/debugging.md
  //
  // "View source" is only in the overflow menu for logged-in users.
  // TODO: after recording, switch debugging.md from the old GIF to this video.
  {
    id: 'happo-view-source',
    output: 'static/video/happo-view-source.webm',
    url: showcaseReport(showcasePRs.needsReview),
    auth: 'happo',
    viewport: { width: 1280, height: 720 },
    prepare: waitForSnapshots,
    async record(page, { click, pause }) {
      await click(
        page.locator('button:has([class*="moreOptionsButton"])').first(),
      );
      await pause(800);
      await click(page.getByText('View source').first());
      await page.waitForLoadState('networkidle');
      await pause(1500);
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
      await page.getByText('View source').first().click();
      await page.waitForLoadState('networkidle');
    },
  },

  // docs/continuous-integration.md
  {
    id: 'happo-status-diffs',
    output: 'static/img/happo-status-diffs.png',
    url: async () => (await findShowcasePR(showcasePRs.needsReview)).html_url,
    auth: 'github',
    // TODO: check this selector against a logged-in session. The checks list
    // is only shown to logged-in users.
    target: page =>
      page
        .getByText(/checks? (were not successful|have failed)/i)
        .locator('xpath=ancestor::*[.//*[contains(text(), "Happo")]][1]'),
    padding: 8,
  },
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
    output: 'static/img/happo-status-accept.gif',
    manual:
      'Record accepting a report. Can be automated once the accept request is ' +
      'stubbed with page.route so nothing is saved.',
  },
  {
    id: 'happo-status-accepted',
    output: 'static/img/happo-status-accepted.png',
    manual:
      'Screenshot the GitHub checks list after a Happo report is accepted.',
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
];
