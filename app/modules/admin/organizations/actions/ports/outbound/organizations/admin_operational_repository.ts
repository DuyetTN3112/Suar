import type { PartnerType } from '#modules/organizations/public_contracts/access/organization_constants'

export interface AdminOrganizationFilters {
  search?: string
  partnerType?: PartnerType
  organizationIds?: string[]
}

export interface AdminOrganizationRecord {
  id: string
  name: string
  slug: string
  description: string | null
  ownerId: string
  owner: {
    id: string
    username: string
    email: string | null
  }
  partnerType: string | null
  partnerIsActive: boolean
  createdAt: string
  updatedAt: string
  usersCount: number
  projectsCount: number
}

export interface AdminOrganizationPage {
  organizations: AdminOrganizationRecord[]
  total: number
}

export interface AdminOrganizationStats {
  total: number
  newThisMonth: number
}

export abstract class AdminOrganizationRepository {
  abstract listOrganizations(
    filters: AdminOrganizationFilters,
    page: number,
    perPage: number
  ): Promise<AdminOrganizationPage>

  abstract getOrganizationStats(): Promise<AdminOrganizationStats>

  abstract findById(
    organizationId: string
  ): Promise<AdminOrganizationRecord | null>
}

export interface AdminProjectStats {
  total: number
  active: number
  completed: number
}

export abstract class AdminProjectStatsRepository {
  abstract getProjectStats(): Promise<AdminProjectStats>
}

export interface AdminTaskStats {
  total: number
  inProgress: number
  completed: number
}

export abstract class AdminTaskStatsRepository {
  abstract getTaskStats(): Promise<AdminTaskStats>
}

export interface AdminSubscriptionFilters {
  search?: string
  plan?: string
  status?: string
}

export interface AdminSubscriptionRecord {
  id: string
  user_id: string
  username: string
  email: string | null
  system_role: string
  plan: string
  status: string
  started_at: string | null
  expires_at: string | null
  auto_renew: boolean
  created_at: string | null
  updated_at: string | null
}

export interface AdminSubscriptionStats {
  total: number
  active: number
  expiringSoon: number
  cancelled: number
  byPlan: Record<string, number>
}

export abstract class AdminSubscriptionRepository {
  abstract getSubscriptionStats(): Promise<AdminSubscriptionStats>

  abstract listSubscriptions(
    filters: AdminSubscriptionFilters,
    page: number,
    perPage: number
  ): Promise<{ subscriptions: AdminSubscriptionRecord[]; total: number }>
}

export interface AdminSubscriptionUpdate {
  plan?: string
  status?: string
  auto_renew?: boolean
  expires_at?: string | null
}

export abstract class AdminSubscriptionWriter {
  abstract updateSubscription(
    subscriptionId: string,
    payload: AdminSubscriptionUpdate
  ): Promise<void>
}
