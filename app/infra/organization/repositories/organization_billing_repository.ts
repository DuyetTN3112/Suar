import Organization from '#models/organization'
import type { DatabaseId } from '#types/database'

/**
 * OrganizationBillingRepository (Infrastructure Layer)
 *
 * Handles all database queries for organization billing and subscription.
 */

export interface SubscriptionData {
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'cancelled' | 'past_due'
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export interface PlanData {
  id: string
  name: string
  price: number
  features: string[]
  popular?: boolean
}

export default class OrganizationBillingRepository {
  /**
   * Get subscription information for an organization
   */
  async getSubscription(organizationId: DatabaseId): Promise<SubscriptionData> {
    const org = await Organization.findOrFail(organizationId)

    // Default to free plan if not set
    const plan = (org.plan || 'free') as SubscriptionData['plan']

    return {
      plan,
      status: 'active',
      current_period_end: null,
      cancel_at_period_end: false,
    }
  }

  /**
   * Get available subscription plans
   */
  getAvailablePlans(): PlanData[] {
    return [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
          'Up to 5 team members',
          'Basic project management',
          'Community support',
          '1GB storage',
        ],
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        features: [
          'Up to 25 team members',
          'Advanced project management',
          'Priority support',
          '50GB storage',
          'Custom workflows',
          'Analytics dashboard',
        ],
        popular: true,
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 99,
        features: [
          'Unlimited team members',
          'Enterprise features',
          '24/7 premium support',
          'Unlimited storage',
          'Custom integrations',
          'Advanced analytics',
          'SLA guarantee',
          'Dedicated account manager',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 249,
        features: [
          'Unlimited team members',
          'Enterprise governance',
          'Dedicated support',
          'Unlimited storage',
          'Advanced security controls',
          'Custom integrations',
          'SLA guarantee',
          'Dedicated account manager',
        ],
      },
    ]
  }

  /**
   * Upgrade organization plan
   */
  async upgradePlan(organizationId: DatabaseId, plan: string): Promise<void> {
    const org = await Organization.findOrFail(organizationId)
    org.plan = plan
    await org.save()
  }
}
