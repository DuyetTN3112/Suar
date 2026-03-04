import type { UserKey } from './types.js'

export interface UserSubscriptionSpec {
  user: UserKey
  plan: 'pro' | 'enterprise'
  status: 'active' | 'cancelled'
  startedDaysAgo: number
  expiresInDays: number
  autoRenew: boolean
}

export const SEED_USER_SUBSCRIPTIONS_SPECS: readonly UserSubscriptionSpec[] = [
  {
    user: 'owner',
    plan: 'pro',
    status: 'active',
    startedDaysAgo: 25,
    expiresInDays: 30,
    autoRenew: true,
  },
  {
    user: 'member',
    plan: 'pro',
    status: 'active',
    startedDaysAgo: 18,
    expiresInDays: 30,
    autoRenew: true,
  },
  {
    user: 'freelancerOne',
    plan: 'enterprise',
    status: 'active',
    startedDaysAgo: 7,
    expiresInDays: 358,
    autoRenew: false,
  },
  {
    user: 'freelancerTwo',
    plan: 'pro',
    status: 'cancelled',
    startedDaysAgo: 60,
    expiresInDays: 5,
    autoRenew: false,
  },
] as const
