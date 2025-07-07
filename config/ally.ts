import { defineConfig, services } from '@adonisjs/ally'

import env from '#start/env'

/**
 * Ally (OAuth) Configuration
 *
 * OAuth providers dùng env vars optional — nếu không set thì dùng
 * placeholder rỗng (provider sẽ fail gracefully khi user cố đăng nhập)
 */
const allyConfig = defineConfig({
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID', ''),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET', ''),
    callbackUrl: `${env.get('APP_URL')}/auth/google/callback`,
  }),
  github: services.github({
    clientId: env.get('GITHUB_CLIENT_ID', ''),
    clientSecret: env.get('GITHUB_CLIENT_SECRET', ''),
    callbackUrl: `${env.get('APP_URL')}/auth/github/callback`,
  }),
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
