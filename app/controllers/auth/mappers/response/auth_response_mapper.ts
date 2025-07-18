import { AuthRoutes } from '#constants/route_constants'

export function getLogoutRedirectPath() {
  return AuthRoutes.LOGIN
}

export function shouldUseInertiaLocation(isInertiaRequest: string | undefined) {
  return Boolean(isInertiaRequest)
}

export function mapLoggedOutAuthShare() {
  return {
    auth: {
      user: null,
    },
  }
}
