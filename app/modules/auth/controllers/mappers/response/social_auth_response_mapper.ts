import { AuthRoutes } from '#modules/http/constants/route_constants'

export function mapSocialAuthErrorRedirect(errorMessage: string) {
  return {
    path: AuthRoutes.LOGIN,
    query: {
      error: errorMessage,
    },
  }
}

export function mapSocialAuthSuccessRedirect(redirectTo: string) {
  return {
    redirectTo,
  }
}

export function mapSocialAuthSessionState(currentOrganizationId: string | null | undefined) {
  if (!currentOrganizationId) {
    return null
  }

  return {
    currentOrganizationId,
  }
}
