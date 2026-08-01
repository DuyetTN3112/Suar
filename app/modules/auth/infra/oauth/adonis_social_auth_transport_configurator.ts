import config from '@adonisjs/core/services/config'

import type {
  SocialAuthCallbackConfigurableDriver,
  SocialAuthCallbackConfiguration,
} from '#modules/auth/controllers/ports/social_auth_transport_configurator'
import { SocialAuthTransportConfigurator } from '#modules/auth/controllers/ports/social_auth_transport_configurator'
import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social_auth_provider'
import env from '#start/env'

function localHost(host: string): boolean {
  return host.includes('localhost') || host.includes('127.0.0.1')
}

export class AdonisSocialAuthTransportConfigurator extends SocialAuthTransportConfigurator {
  canonicalLocalRedirect(
    provider: SupportedSocialAuthProvider,
    requestHost: string
  ): string | null {
    const appUrl = new URL(env.get('APP_URL'))
    const appHost = appUrl.host
    const requestPort = requestHost.split(':')[1] ?? '80'
    const appPort = appHost.split(':')[1] ?? '80'

    return localHost(requestHost) &&
      localHost(appHost) &&
      requestHost !== appHost &&
      requestPort === appPort
      ? `${appUrl.protocol}//${appHost}/auth/${provider}/redirect`
      : null
  }

  configureCallback(
    provider: SupportedSocialAuthProvider,
    requestHost: string,
    driver: SocialAuthCallbackConfigurableDriver
  ): SocialAuthCallbackConfiguration {
    const protocol = localHost(requestHost) ? 'http' : 'https'
    const callbackUrl = `${protocol}://${requestHost}/auth/${provider}/callback`
    config.set(`ally.${provider}.callbackUrl`, callbackUrl)
    if (driver.config) {
      driver.config.callbackUrl = callbackUrl
    }
    if (driver.options) {
      driver.options.callbackUrl = callbackUrl
    }

    return {
      callbackUrl,
      hasClientId: Boolean(env.get(`${provider.toUpperCase()}_CLIENT_ID`)),
      hasClientSecret: Boolean(env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)),
    }
  }
}
