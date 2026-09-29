import { themes as prismThemes } from 'prism-react-renderer';

import remarkUnreleased, {
  showUnreleasedDocs,
  unreleasedFrontMatter,
} from './src/remark/unreleased.js';

// Docs marked unreleased are shown by the dev server and by builds with
// DOCS_SHOW_UNRELEASED=true, and left out of every other build, which is what
// docs.happo.io serves. See src/remark/unreleased.js.
const showUnreleased = showUnreleasedDocs();

export default {
  title: 'Happo docs',
  tagline: 'Cross-browser screenshot testing',
  url: 'https://docs.happo.io',
  baseUrl: '/',
  organizationName: 'happo',
  projectName: 'happo',

  favicon: 'img/favicon.ico',
  customFields: { showUnreleased },
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  markdown: {
    parseFrontMatter: unreleasedFrontMatter({ show: showUnreleased }),
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  future: {
    v4: true,
    faster: true,
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: './docs',
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
          sidebarPath: require.resolve('./sidebars.json'),
          lastVersion: 'current',
          includeCurrentVersion: true,
          beforeDefaultRemarkPlugins: [
            [remarkUnreleased, { show: showUnreleased }],
          ],
          versions: {
            current: {
              label: 'Current',
            },
            legacy: {
              label: 'Legacy',
            },
          },
        },

        blog: false, // Disable the blog plugin

        theme: {
          customCss: [
            require.resolve('./src/css/customTheme.css'),
            require.resolve('./static/css/custom.css'),
          ],
        },
      },
    ],
  ],

  clientModules: [require.resolve('./src/clientModules/plausible.js')],
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/docs/ignoring-diffs',
            to: '/docs/reporting-flake',
          },
        ],
      },
    ],
    // package.json has `"type": "module"`, and Docusaurus assumes CommonJS in
    // two places:
    // - The files it generates into `.docusaurus/` call `require.resolveWeak`,
    //   which the bundler withholds from a `.js` file it parses as strict ESM.
    //   Let it detect their module type instead.
    // - The server build's chunks are CommonJS that SSG loads with
    //   `require()`, which Node refuses for a `.js` file under this
    //   package.json. Name them `.cjs`.
    () => ({
      name: 'commonjs-under-type-module',
      configureWebpack: (config, isServer) => ({
        ...(isServer && {
          output: {
            chunkFilename: config.output.chunkFilename.replace(/\.js$/, '.cjs'),
          },
        }),
        module: {
          rules: [
            {
              test: /\.js$/,
              include: /[\\/]\.docusaurus[\\/]/,
              type: 'javascript/auto',
            },
          ],
        },
      }),
    }),
  ],

  themeConfig: {
    navbar: {
      title: 'Happo docs',

      logo: {
        src: 'img/happo-logo.svg',
      },

      items: [
        {
          type: 'docsVersionDropdown',
          versions: {
            current: { label: 'Current' },
            legacy: { label: 'Legacy' },
          },
        },
        {
          href: 'https://happo.io/',
          label: 'To happo.io »',
          position: 'right',
        },
      ],
    },

    algolia: {
      appId: 'W891E7QWKL',
      apiKey: '6241805057afc76a5ec28a460d924638',
      indexName: 'happo',

      // https://docusaurus.io/docs/search#contextual-search
      contextualSearch: true,
    },

    image: 'img/happo-logo.svg',

    // https://docusaurus.io/docs/markdown-features/code-blocks#theming
    prism: {
      theme: {
        ...prismThemes.nightOwl,
        styles: [
          ...prismThemes.nightOwl.styles,
          {
            types: ['comment'],
            style: {
              color: 'oklch(60% 0 0)',
              fontStyle: 'italic',
            },
          },
        ],
      },
    },

    footer: {
      style: 'dark',

      logo: {
        alt: 'Happo logo',
        src: 'img/happo-logo-inverted.svg',
        width: 50,
        height: 50,
      },

      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: 'docs/getting-started',
            },
            {
              label: 'Continuous Integration',
              to: 'docs/continuous-integration',
            },
            {
              label: 'API Reference',
              to: 'docs/api',
            },
          ],
        },

        {
          title: 'Support',
          items: [
            {
              label: 'support@happo.io',
              href: 'mailto:support@happo.io',
            },
          ],
        },

        {
          title: 'More',
          items: [
            {
              label: 'Happo.io website',
              href: 'https://happo.io',
            },
            {
              label: 'Happo on GitHub',
              href: 'https://github.com/happo',
            },
          ],
        },
      ],

      copyright: `Copyright © ${new Date().getFullYear()} Happo LLC`,
    },
  },
};
