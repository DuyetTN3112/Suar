import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Content Security Policy — bảo vệ chống XSS injection.
   *
   * 'unsafe-inline' cần thiết cho:
   * - Vite HMR inject scripts/styles trong dev mode
   * - Inertia.js inline page data
   * - Tailwind CSS inline styles
   *
   * Tương lai: Chuyển sang nonce-based CSP khi enable SSR.
   */
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://avatars.githubusercontent.com',
        'https://*.googleusercontent.com',
        'https://*.gravatar.com',
      ],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    reportOnly: false,
  },

  csrf: {
    enabled: process.env['NODE_ENV'] !== 'test',
    exceptRoutes: [
      '/logout',
      '/api/public/ai-disputes/callback',
      '/api/auth/refresh',
      '/api/testing/login',
      '/api/testing/token-login',
      '/api/testing/token-refresh',
      '/api/testing/session/bootstrap',
      '/api/testing/seed-e2e',
      '/api/testing/seed-task-submission-flow',
      '/api/testing/seed-project-member-flow',
      '/api/testing/seed-task-review-board-flow',
      '/api/testing/seed-sprint-review-governance-flow',
      '/api/testing/seed-sprint-reverse-review-board-flow',
      '/api/testing/seed-review-lifecycle-flow',
      '/api/testing/seed-review-dispute-exchange-flow',
      '/api/testing/seed-cleanup',
      '/api/testing/health',
      '/__transmit/subscribe',
      '/__transmit/unsubscribe',
    ],
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  hsts: {
    enabled: true,
    maxAge: '180 days',
  },

  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
