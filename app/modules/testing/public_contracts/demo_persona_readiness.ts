import type { UserKey } from '../../../seed/demo_data/types.js'
import { SEED_USERS_SPECS, type UserSpec } from '../../../seed/demo_data/user_seeds_specs.js'

const PLACEHOLDER_PROVIDER_ID_PREFIXES = ['seed-google-', 'seed-github-'] as const

export interface DemoPersonaReadinessRow {
  key: UserKey
  email: string
  provider: UserSpec['auth_method']
  providerId: string
  reachable: boolean
  reason: string | null
  sharedProvider: boolean
  switchingCost: string | null
}

export interface DemoPersonaReadinessInput {
  users?: Record<UserKey, UserSpec>
  providerIds?: Partial<Record<UserKey, string>>
}

export function isPlaceholderPersonaProviderId(providerId: string): boolean {
  return PLACEHOLDER_PROVIDER_ID_PREFIXES.some((prefix) => providerId.startsWith(prefix))
}

export function buildDemoPersonaReadinessReport(
  input: DemoPersonaReadinessInput = {}
): DemoPersonaReadinessRow[] {
  const users = input.users ?? SEED_USERS_SPECS
  const rows = (Object.entries(users) as [UserKey, UserSpec][]).map(([key, spec]) => {
    const providerId = input.providerIds?.[key] ?? `seed-${spec.auth_method}-${key}`
    return {
      key,
      email: spec.email,
      provider: spec.auth_method,
      providerId,
      reachable: !isPlaceholderPersonaProviderId(providerId),
      reason: isPlaceholderPersonaProviderId(providerId)
        ? `placeholder provider id ${providerId}`
        : null,
      sharedProvider: false,
      switchingCost: null,
    }
  })

  const providerCounts = new Map<UserSpec['auth_method'], number>()
  for (const row of rows) {
    providerCounts.set(row.provider, (providerCounts.get(row.provider) ?? 0) + 1)
  }

  return rows.map((row) => {
    const sharedProvider = (providerCounts.get(row.provider) ?? 0) > 1
    return {
      ...row,
      sharedProvider,
      switchingCost: sharedProvider
        ? 'switching requires signing out of the provider itself'
        : null,
    }
  })
}
