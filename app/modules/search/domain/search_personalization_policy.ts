export type SearchPersonalizationConsent = 'granted' | 'denied' | 'reset' | 'unknown'
export type SearchPersonalizationProvider = 'available' | 'unavailable'
export type SearchPersonalizationSignalSource = 'user_preference' | 'organization_policy'
export type SearchPersonalizationExplanationReason =
  | 'personalized'
  | 'global_baseline'
  | 'consent_required'
  | 'opted_out'
  | 'reset'
  | 'provider_unavailable'
  | 'insufficient_support'
  | 'organization_scope_mismatch'
  | 'invalid_input'
  | 'invalid_signal'

export interface SearchPersonalizationSignal {
  readonly source: SearchPersonalizationSignalSource
  readonly feature: string
  readonly weight: number
  readonly evidence: 'provider'
  readonly organizationId?: string
}

export interface SearchPersonalizationPolicyInput {
  readonly consent: SearchPersonalizationConsent
  readonly provider: SearchPersonalizationProvider
  readonly support: number
  readonly minimumSupport: number
  readonly currentOrganizationId: string | null
  readonly signals: unknown
}

export interface SearchPersonalizationExplanation {
  readonly mode: 'global' | 'personalized'
  readonly reason: SearchPersonalizationExplanationReason
  readonly optOut: boolean
  readonly scope: 'global' | 'organization' | 'mixed'
  readonly sources: readonly SearchPersonalizationSignalSource[]
}

export interface SearchPersonalizationPolicyDecision {
  readonly mode: 'global' | 'personalized'
  readonly optOut: boolean
  readonly explanation: SearchPersonalizationExplanation
}

const MAX_SIGNALS = 16
const MAX_FEATURE_LENGTH = 128
const MAX_ABSOLUTE_WEIGHT = 1

export function resolveSearchPersonalizationPolicy(
  input: SearchPersonalizationPolicyInput
): SearchPersonalizationPolicyDecision {
  if (input.consent === 'denied') return fallback('opted_out', true)
  if (input.consent === 'reset') return fallback('reset', true)
  if (input.consent !== 'granted') return fallback('consent_required')
  if (input.provider !== 'available') return fallback('provider_unavailable')
  if (
    !Number.isFinite(input.support) ||
    !Number.isFinite(input.minimumSupport) ||
    input.support < 0 ||
    input.minimumSupport < 1 ||
    input.support < input.minimumSupport
  ) {
    return fallback('insufficient_support')
  }
  if (
    input.currentOrganizationId !== null &&
    !isBoundedIdentifier(input.currentOrganizationId)
  ) {
    return fallback('invalid_input')
  }
  if (!isSignalArray(input.signals) || input.signals.length > MAX_SIGNALS) {
    return fallback('invalid_signal')
  }
  if (input.signals.length === 0) return fallback('global_baseline')

  const sources = new Set<SearchPersonalizationSignalSource>()
  for (const signal of input.signals) {
    if (!isValidSignal(signal)) return fallback('invalid_signal')
    const source = signal.source

    if (source === 'organization_policy') {
      if (
        input.currentOrganizationId === null ||
        signal.organizationId !== input.currentOrganizationId
      ) {
        return fallback('organization_scope_mismatch')
      }
    } else if (Object.prototype.hasOwnProperty.call(signal, 'organizationId')) {
      return fallback('organization_scope_mismatch')
    }
    sources.add(source)
  }

  const orderedSources = [...sources]
  const scope = sources.has('organization_policy')
    ? sources.has('user_preference')
      ? 'mixed'
      : 'organization'
    : 'global'

  return {
    mode: 'personalized',
    optOut: false,
    explanation: {
      mode: 'personalized',
      reason: 'personalized',
      optOut: false,
      scope,
      sources: orderedSources,
    },
  }
}

function fallback(
  reason: Exclude<SearchPersonalizationExplanationReason, 'personalized'>,
  optOut = false
): SearchPersonalizationPolicyDecision {
  return {
    mode: 'global',
    optOut,
    explanation: {
      mode: 'global',
      reason,
      optOut,
      scope: 'global',
      sources: [],
    },
  }
}

function isSignalArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isValidSignal(signal: unknown): signal is SearchPersonalizationSignal {
  if (signal === null || typeof signal !== 'object') return false
  const candidate = signal as Partial<SearchPersonalizationSignal>

  return (
    (candidate.source === 'user_preference' || candidate.source === 'organization_policy') &&
    candidate.evidence === 'provider' &&
    isBoundedIdentifier(candidate.feature) &&
    Number.isFinite(candidate.weight) &&
    Math.abs(candidate.weight) <= MAX_ABSOLUTE_WEIGHT &&
    (candidate.source !== 'organization_policy' || isBoundedIdentifier(candidate.organizationId))
  )
}

function isBoundedIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_FEATURE_LENGTH &&
    value === value.trim() &&
    !value.includes('\u0000') &&
    !value.includes('\r') &&
    !value.includes('\n')
  )
}
