/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path');

// See https://docusaurus.io/docs/site-config for all the possible
// site configuration options.

const siteConfig = {
  title: 'Happo docs', // Title for your website.
  tagline: 'Cross-browser screenshot testing',
  url: 'https://docs.happo.io', // Your website URL
  baseUrl: '/', // Base URL for your project */

  customDocsPath: path.basename(__dirname) + '/docs',

  // Used for publishing and more
  projectName: 'happo',
  organizationName: 'happo',

  // For no header links in the top nav bar -> headerLinks: [],
  // headerLinks: [
  //   { doc: 'getting-started', label: 'Docs' },
  //   { doc: 'api', label: 'API' },
  // ],
  headerLinks: [{ href: 'https://happo.io/', label: 'To happo.io »' }],

  /* path to images for header/footer */
  headerIcon: 'img/happo-logo-inverted.svg',
  footerIcon: 'img/happo-logo-inverted.svg',
  favicon: 'img/favicon.ico',

  /* Colors for website */
  colors: {
    primaryColor: '#14ab8e',
    secondaryColor: '#c52774',
  },

  /* Custom fonts for website */
  /*
  fonts: {
    myFont: [
      "Times New Roman",
      "Serif"
    ],
    myOtherFont: [
      "-apple-system",
      "system-ui"
    ]
  },
  */

  // This copyright info is used in /core/Footer.js
  copyright: `Copyright © ${new Date().getFullYear()} Recur AB`,

  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks.
    theme: 'default',
  },

  // On page navigation for the current documentation page.
  onPageNav: 'separate',
  // No .html extensions for paths.
  cleanUrl: true,

  // Open Graph and Twitter card images.
  ogImage: 'img/happo-logo.svg',
  twitterImage: 'img/happo-logo.svg',

  // For sites with a sizable amount of content, set collapsible to true.
  // Expand/collapse the links and subcategories under categories.
  // docsSideNavCollapsible: true,

  // Show documentation's last contributor's name.
  // enableUpdateBy: true,

  // Show documentation's last update time.
  // enableUpdateTime: true,

  // You may provide arbitrary config keys to be used as needed by your
  // template. For example, if you need your repo's URL...
  //   repoUrl: 'https://github.com/facebook/test-site',
};

module.exports = siteConfig;
