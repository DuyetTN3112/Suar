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
      imgSrc: ["'self'", 'data:', 'blob:', 'https://avatars.githubusercontent.com', 'https://*.googleusercontent.com', 'https://*.gravatar.com'],
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
    enabled: true,
    exceptRoutes: ['/logout'],
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
