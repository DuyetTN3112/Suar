import { AuthRoutes } from '#modules/http/public_contracts/route_constants'

interface SocialAuthPublicFailure {
  publicCode: string
  safeMessage: string
}

export function mapSocialAuthErrorRedirect(input: SocialAuthPublicFailure) {
  return {
    path: AuthRoutes.LOGIN,
    query: {
      error: input.safeMessage,
      error_code: input.publicCode,
    },
  }
}

export function mapSocialAuthFailureEventError(input: SocialAuthPublicFailure) {
  return {
    class: 'SocialAuthCallbackError',
    code: input.publicCode,
    message: input.safeMessage,
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
