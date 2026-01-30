export function toStorageSubscriptionPlan(plan?: string): string | undefined {
  if (plan === 'promax') {
    return 'enterprise'
  }

  return plan
}

export function toDisplaySubscriptionPlan(plan: string): string {
  if (plan === 'enterprise') {
    return 'promax'
  }

  return plan
}
