const ALLOWED_INPUT_PLANS = new Set(['pro', 'promax', 'enterprise'])
const ALLOWED_STATUSES = new Set(['active', 'cancelled'])

export type SubscriptionAdministrationPolicyResult =
  | { valid: true }
  | { valid: false; field: 'plan' | 'status' }

export function validateSubscriptionAdministrationInput(input: {
  plan?: string
  status?: string
}): SubscriptionAdministrationPolicyResult {
  if (input.plan !== undefined && !ALLOWED_INPUT_PLANS.has(input.plan)) {
    return { valid: false, field: 'plan' }
  }
  if (input.status !== undefined && !ALLOWED_STATUSES.has(input.status)) {
    return { valid: false, field: 'status' }
  }
  return { valid: true }
}
