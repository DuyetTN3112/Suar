import type { MeResponse } from '../../../contracts/api/v1/me.js'
import type { NotificationResponse } from '../../../contracts/api/v1/notifications.js'
import type { ApiV1Pagination } from '../../../contracts/api/v1/pagination.js'
import type { SettingsResponse } from '../../../contracts/api/v1/settings.js'
import type { TaskStatusResponse } from '../../../contracts/api/v1/task_statuses.js'

import type { SerializedNotification } from '#modules/notifications/actions/serializers/notification_serializer'
import type { UserSettingData } from '#modules/settings/types/user_setting'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

interface PaginationLike {
  total: number
  per_page: number
  current_page: number
  last_page: number
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

export function mapApiV1Pagination(meta: PaginationLike): ApiV1Pagination {
  return {
    page: meta.current_page,
    perPage: meta.per_page,
    total: meta.total,
    hasNextPage: meta.current_page < meta.last_page,
  }
}

export function mapApiV1TaskStatusResponse(record: TaskStatusRecord): TaskStatusResponse {
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
  record: SerializedNotification
): NotificationResponse {
  return {
    id: record.id,
    userId: record.user_id,
    title: record.title,
    message: record.message,
    isRead: record.is_read,
    type: record.type,
    relatedEntityType: record.related_entity_type,
    relatedEntityId: record.related_entity_id,
    metadata: record.metadata,
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
