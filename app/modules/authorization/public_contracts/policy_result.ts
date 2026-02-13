export type PolicyResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: PolicyDenyCode }

export type PolicyDenyCode = 'FORBIDDEN' | 'BUSINESS_RULE' | 'INVALID_STATE'

export const PolicyResult = {
  allow(): PolicyResult {
    return { allowed: true }
  },

  deny(reason: string, code: PolicyDenyCode = 'FORBIDDEN'): PolicyResult {
    return { allowed: false, reason, code }
  },
} as const
