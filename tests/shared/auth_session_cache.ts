export interface TestingAuthState {
  authenticated: boolean
  email?: string | null
  currentOrganizationId?: string | null
  sessionOrganizationId?: string | null
  systemRole?: string | null
}

export function resolveEffectiveOrganizationId(state: TestingAuthState): string | null {
  return state.sessionOrganizationId ?? state.currentOrganizationId ?? null
}

function hasConsistentOrganizationState(state: TestingAuthState): boolean {
  if (!state.sessionOrganizationId || !state.currentOrganizationId) {
    return true
  }

  return state.sessionOrganizationId === state.currentOrganizationId
}

export function shouldReuseTestingSession(
  state: TestingAuthState | null,
  requestedEmail: string,
  requestedOrganizationId?: string
): boolean {
  if (!state?.authenticated) {
    return false
  }

  const normalizedCurrentEmail = state.email?.trim().toLowerCase()
  const normalizedRequestedEmail = requestedEmail.trim().toLowerCase()

  if (!normalizedCurrentEmail || !normalizedRequestedEmail) {
    return false
  }

  if (normalizedCurrentEmail !== normalizedRequestedEmail) {
    return false
  }

  if (!hasConsistentOrganizationState(state)) {
    return false
  }

  if (!requestedOrganizationId) {
    return true
  }

  return resolveEffectiveOrganizationId(state) === requestedOrganizationId
}
