import type { MeResponse } from '../../../contracts/api/v1/me.js'
import type { NotificationResponse } from '../../../contracts/api/v1/notifications.js'
import type { ApiV1Pagination } from '../../../contracts/api/v1/pagination.js'
import type { SettingsResponse } from '../../../contracts/api/v1/settings.js'
import type { TaskStatusResponse } from '../../../contracts/api/v1/task_statuses.js'

import {
  fromLegacySnakePagination,
  toCanonicalApiPagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { UserSettingData } from '#modules/settings/public_contracts/user_setting'

type SerializedDateTime = string | null

interface TaskStatusLike {
  id: string
  organization_id: string
  name: string
  slug: string
  category: string
  color: string
  icon: string | null
  description: string | null
  sort_order: number
  is_default: boolean
  is_system: boolean
  created_at?: SerializedDateTime
  updated_at?: SerializedDateTime
}

interface TaskWorkflowTransitionLike {
  id: string
  organization_id: string
  from_status_id: string
  to_status_id: string
  conditions: Record<string, unknown>
  created_at?: SerializedDateTime
  fromStatus?: TaskStatusLike | Record<string, unknown>
  toStatus?: TaskStatusLike | Record<string, unknown>
}

interface PaginationLike {
  total: number
  total_exact?: boolean
  total_relation?: 'exact' | 'lower_bound'
  per_page: number
  current_page: number
  last_page: number
  cursor?: {
    next_cursor: string | null
    previous_cursor: string | null
    has_next_page: boolean
    has_previous_page: boolean
  }
}

interface MeRecordLike {
  id: string
  email: string | null
  username: string
  avatar_url: string | null
  system_role: string
  current_organization_id: string | null
  current_organization_role: string | null
  organizations: {
    id: string
    name: string
    logo: string | null
    org_role: string | null
    status: string | null
  }[]
}

interface SerializedNotificationLike {
  id: string
  event_id: string | null
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata?: Record<string, unknown> | null
  schema_version: number
  category: string
  priority: string
  action: NotificationResponse['action']
  revision: number
  occurred_at: string
  created_at: string
  updated_at: string
  read_at: string | null
}

export function mapApiV1Pagination(meta: PaginationLike): ApiV1Pagination {
  return {
    ...toCanonicalApiPagination(fromLegacySnakePagination(meta)),
    ...(meta.total_exact === undefined ? {} : { totalExact: meta.total_exact }),
    ...(meta.total_relation === undefined ? {} : { totalRelation: meta.total_relation }),
  }
}

export function wrapApiV1Data<T>(data: T) {
  return { data }
}

export function mapApiV1TaskStatusResponse(record: TaskStatusLike): TaskStatusResponse {
  return {
    id: record.id,
    organizationId: record.organization_id,
    name: record.name,
    slug: record.slug,
    group: record.category,
    color: record.color,
    icon: record.icon,
    description: record.description,
    sortOrder: record.sort_order,
    isDefault: record.is_default,
    isSystem: record.is_system,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null,
  }
}

export function mapApiV1WorkflowTransitionResponse(record: TaskWorkflowTransitionLike) {
  return {
    id: record.id,
    organizationId: record.organization_id,
    fromStatusId: record.from_status_id,
    toStatusId: record.to_status_id,
    conditions: record.conditions,
    createdAt: record.created_at ?? null,
    fromStatus:
      record.fromStatus && 'organization_id' in record.fromStatus
        ? mapApiV1TaskStatusResponse(record.fromStatus as TaskStatusLike)
        : null,
    toStatus:
      record.toStatus && 'organization_id' in record.toStatus
        ? mapApiV1TaskStatusResponse(record.toStatus as TaskStatusLike)
        : null,
  }
}

export function mapApiV1SettingsResponse(record: UserSettingData): SettingsResponse {
  return {
    theme: record.theme,
    notificationsEnabled: record.notifications_enabled,
    displayMode: record.display_mode,
    font: record.font,
    layout: record.layout,
    density: record.density,
    animationsEnabled: record.animations_enabled,
    customScrollbars: record.custom_scrollbars,
  }
}

export function mapApiV1NotificationResponse(
  record: SerializedNotificationLike
): NotificationResponse {
  return {
    id: record.id,
    eventId: record.event_id,
    userId: record.user_id,
    title: record.title,
    message: record.message,
    isRead: record.is_read,
    type: record.type,
    relatedEntityType: record.related_entity_type,
    relatedEntityId: record.related_entity_id,
    metadata: record.metadata ?? null,
    schemaVersion: record.schema_version,
    category: record.category,
    priority: record.priority,
    action: record.action,
    revision: record.revision,
    occurredAt: record.occurred_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    readAt: record.read_at,
  }
}

export function mapApiV1MeResponse(record: MeRecordLike): MeResponse {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    avatarUrl: record.avatar_url,
    systemRole: record.system_role,
    currentOrganizationId: record.current_organization_id,
    currentOrganizationRole: record.current_organization_role,
    organizations: record.organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      logo: organization.logo,
      orgRole: organization.org_role,
      status: organization.status,
    })),
  }
}

export function mapApiV1OrganizationMemberResponse(record: {
  id: string
  org_role: string
  role_name: string
  joined_at: string
  user: {
    id: string
    username: string
    email: string | null
  }
}) {
  return {
    id: record.id,
    orgRole: record.org_role,
    roleName: record.role_name,
    joinedAt: record.joined_at,
    user: record.user,
  }
}
