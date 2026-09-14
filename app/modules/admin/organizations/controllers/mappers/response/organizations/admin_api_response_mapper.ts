import { toCanonicalApiPagination } from '#modules/pagination/public_contracts/pagination_public_api'

export {
  mapAdminAuditLogResponse,
  type AdminAuditLogMapperInput,
  type AdminAuditLogStructuredEventSummary,
  type AuditLogValueMap,
} from './admin_audit_log_response_mapper.js'

export interface AdminPaginationLike {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  mode?: 'offset' | 'cursor'
  cursor?: {
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function mapAdminPagination(meta: AdminPaginationLike) {
  return toCanonicalApiPagination(meta)
}

export function wrapAdminCollectionResponse<TData, TExtra extends Record<string, unknown>>(
  data: TData,
  meta: AdminPaginationLike,
  extra: TExtra
) {
  return {
    data,
    pagination: mapAdminPagination(meta),
    ...extra,
  }
}

export function mapAdminDashboardStatsResponse(stats: {
  users: { total: number; active: number; suspended: number; new_this_month: number }
  organizations: { total: number; new_this_month: number }
  projects: { total: number; active: number; completed: number }
  tasks: { total: number; in_progress: number; completed: number }
  subscriptions: {
    total: number
    active: number
    expiring_soon: number
    pro: number
    promax: number
  }
  moderation: { pending_flagged_reviews: number }
}) {
  return {
    users: {
      total: stats.users.total,
      active: stats.users.active,
      suspended: stats.users.suspended,
      newThisMonth: stats.users.new_this_month,
    },
    organizations: {
      total: stats.organizations.total,
      newThisMonth: stats.organizations.new_this_month,
    },
    projects: stats.projects,
    tasks: {
      total: stats.tasks.total,
      inProgress: stats.tasks.in_progress,
      completed: stats.tasks.completed,
    },
    subscriptions: {
      total: stats.subscriptions.total,
      active: stats.subscriptions.active,
      expiringSoon: stats.subscriptions.expiring_soon,
      pro: stats.subscriptions.pro,
      promax: stats.subscriptions.promax,
    },
    moderation: {
      pendingFlaggedReviews: stats.moderation.pending_flagged_reviews,
    },
  }
}

export function mapAdminUserResponse(user: {
  id: string
  username: string
  email: string | null
  system_role: string
  status: string
  current_organization_id: string | null
  is_external_contributor: boolean
  created_at: string
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    systemRole: user.system_role,
    status: user.status,
    currentOrganizationId: user.current_organization_id,
    isExternalContributor: user.is_external_contributor,
    createdAt: user.created_at,
  }
}

export function mapAdminOrganizationResponse(organization: {
  id: string
  name: string
  slug: string
  description: string | null
  owner_id: string
  owner: {
    id: string
    username: string
    email: string
  }
  partner_type: string | null
  partner_is_active: boolean
  created_at: string
  updated_at: string
  _count: {
    members: number
    projects: number
  }
}) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    ownerId: organization.owner_id,
    owner: organization.owner,
    partnerType: organization.partner_type,
    partnerIsActive: organization.partner_is_active,
    createdAt: organization.created_at,
    updatedAt: organization.updated_at,
    counts: organization._count,
  }
}
