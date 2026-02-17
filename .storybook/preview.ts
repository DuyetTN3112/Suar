import type { Preview } from '@storybook/svelte-vite'

import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '../inertia/apps/user/shared/css/app.css'

type StorybookGlobals = {
  backgrounds?: {
    value?: string
  }
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#050505' },
      ],
    },
  },
  decorators: [
    (story, { globals }) => {
      if (typeof document !== 'undefined') {
        const bg = (globals as StorybookGlobals).backgrounds?.value
        // If background is #050505 or any non-white/non-light background, enable dark mode
        const isDark = bg === '#050505'
        document.documentElement.classList.toggle('dark', isDark)
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
      }
      return story()
    },
  ],
}

export default preview
