export interface FilterAlertPolicyInput {
  readonly hasSubscriptionPermission: boolean
  readonly contextAlertsEnabled: boolean
  readonly savedViewMigrationState: 'current' | 'pending' | 'requires_repair' | 'blocked'
  readonly providerState: 'healthy' | 'degraded' | 'unavailable'
  readonly totalRelation: 'eq' | 'gte' | 'unknown'
  readonly intervalMinutes: number
  readonly queryCost: number
  readonly maxQueryCost: number
  readonly timezone: string
}

export interface FilterAlertPolicyDecision {
  readonly allowed: boolean
  readonly reason?: string
}

export class FilterAlertPolicyError extends Error {
  readonly code = 'FILTER_ALERT_POLICY_DENIED'

  constructor(public readonly reason: string) {
    super('This saved view cannot be subscribed to as an alert.')
    this.name = 'FilterAlertPolicyError'
  }
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function evaluateFilterAlertPolicy(input: FilterAlertPolicyInput): FilterAlertPolicyDecision {
  if (!input.hasSubscriptionPermission) return { allowed: false, reason: 'permission_denied' }
  if (!input.contextAlertsEnabled) return { allowed: false, reason: 'alerts_unavailable' }
  if (input.savedViewMigrationState !== 'current') return { allowed: false, reason: 'saved_view_requires_repair' }
  if (input.providerState !== 'healthy') return { allowed: false, reason: 'provider_unavailable' }
  if (input.totalRelation !== 'eq') return { allowed: false, reason: 'total_not_exact' }
  if (!Number.isSafeInteger(input.intervalMinutes) || input.intervalMinutes < 15) {
    return { allowed: false, reason: 'interval_too_short' }
  }
  if (!Number.isFinite(input.queryCost) || input.queryCost > input.maxQueryCost) {
    return { allowed: false, reason: 'query_cost_too_high' }
  }
  if (!validTimezone(input.timezone)) return { allowed: false, reason: 'invalid_timezone' }
  return { allowed: true }
}
