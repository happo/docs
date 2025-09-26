module.exports = {
  title: 'Happo docs',
  tagline: 'Cross-browser screenshot testing',
  url: 'https://docs.happo.io',
  baseUrl: '/',
  organizationName: 'happo',
  projectName: 'happo',

  scripts: [
    {
      'data-domain': 'docs.happo.io',
      src: 'https://plausible.io/js/script.js',
      defer: true,
    },
  ],

  favicon: 'img/favicon.ico',
  customFields: {},
  onBrokenLinks: 'log',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'log',
    },
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
        },

        blog: false, // Disable the blog plugin

        theme: {
          customCss: [require.resolve('./src/css/customTheme.css')],
        },
      },
    ],
  ],

  plugins: [],

  themeConfig: {
    navbar: {
      title: 'Happo docs',

      logo: {
        src: 'img/happo-logo.svg',
      },

      items: [
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
