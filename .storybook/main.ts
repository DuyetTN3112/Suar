import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  "stories": [
    "../inertia/apps/**/tests/storybook/**/*.stories.@(js|ts|svelte)"
  ],
  "addons": [
    {
      name: "@storybook/addon-svelte-csf",
      options: {
        legacyTemplate: true
      }
    },
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/svelte-vite"
};
export default config;
