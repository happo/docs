import { defineConfig } from 'happo';
import buildHappoCustom from './buildHappoCustom.mjs';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  integration: {
    type: 'custom',
    build: buildHappoCustom,
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
