import { defineConfig } from 'happo';
import generateHappoPackage from './generateHappoPackage.mjs';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  integration: {
    type: 'static',
    generateStaticPackage: generateHappoPackage,
  },

  targets: {
    chrome: {
      browserType: 'chrome',
      viewport: '1600x900',
    },
    chromeSmall: {
      browserType: 'chrome',
      viewport: '375x667',
    },
  },
});
