import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import type {
  AdminAuditEventRecord,
  AdminAuditTargetReferenceSet,
} from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
import type {
  AdminAuditProjectionReader,
  AdminAuditSearchProjection,
} from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader'
import {
  listOrganizationAuditTargetLabels,
  searchOrganizationAuditTargetIds,
} from '#modules/organizations/infra/repositories/read/directory/organization_audit_target_queries'
import {
  listProjectAuditTargetIdsByOrganization,
  listProjectAuditTargetLabels,
  searchProjectAuditTargetIds,
} from '#modules/projects/infra/repositories/project-context/read/project_audit_target_queries'
import {
  listTaskAuditTargetIdsByOrganization,
  listTaskAuditTargetLabels,
  searchTaskAuditTargetIds,
} from '#modules/tasks/infra/repositories/task-reading/read/task_audit_target_queries'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const targetKey = (type: string, id: string): string => `${type}:${id}`

const toReferenceSets = (
  entries: Array<readonly [type: string, ids: string[]]>
): AdminAuditTargetReferenceSet[] => {
  return entries
    .filter(([, ids]) => ids.length > 0)
    .map(([type, ids]) => ({ type, ids: [...new Set(ids)] }))
}

const collectEventTargetIds = (events: AdminAuditEventRecord[]): Map<string, Set<string>> => {
  const idsByType = new Map<string, Set<string>>()

  for (const event of events) {
    const type = event.target_type ?? event.entity_type
    const id = event.target_id ?? event.entity_id
    if (!id || !UUID_PATTERN.test(id)) continue

    const ids = idsByType.get(type) ?? new Set<string>()
    ids.add(id)
    idsByType.set(type, ids)
  }

  return idsByType
}

export class AdminAuditProjectionReaderAdapter implements AdminAuditProjectionReader {
  async buildSearchProjection(input: {
    surface: 'system' | 'organization' | 'user'
    organizationId?: string
    search?: string
  }): Promise<AdminAuditSearchProjection> {
    const search = input.search?.trim()
    const matchedActorUserIds =
      search && input.surface !== 'user' ? await userPublicApi.findIdsBySearch(search) : []

    if (input.surface !== 'organization' || !input.organizationId) {
      return {
        matchedActorUserIds,
        organizationScopedTargets: [],
        matchedTargets: [],
      }
    }

    const organizationId = input.organizationId
    const [
      scopedProjectIds,
      scopedTaskIds,
      matchedOrganizationIds,
      matchedProjectIds,
      matchedTaskIds,
    ] = await Promise.all([
      listProjectAuditTargetIdsByOrganization(organizationId),
      listTaskAuditTargetIdsByOrganization(organizationId),
      search ? searchOrganizationAuditTargetIds(organizationId, search) : Promise.resolve([]),
      search ? searchProjectAuditTargetIds(organizationId, search) : Promise.resolve([]),
      search ? searchTaskAuditTargetIds(organizationId, search) : Promise.resolve([]),
    ])

    return {
      matchedActorUserIds,
      organizationScopedTargets: toReferenceSets([
        ['project', scopedProjectIds],
        ['task', scopedTaskIds],
      ]),
      matchedTargets: toReferenceSets([
        ['organization', matchedOrganizationIds],
        ['project', matchedProjectIds],
        ['task', matchedTaskIds],
      ]),
    }
  }

  async findActorsByIds(ids: string[]) {
    if (ids.length === 0) return []
    return userPublicApi.findByIds(ids, ['id', 'username'])
  }

  async resolveTargetLabels(input: {
    events: AdminAuditEventRecord[]
    surface: 'system' | 'organization' | 'user'
    organizationId?: string
  }): Promise<Map<string, string>> {
    if (input.surface === 'user') return new Map()

    const idsByType = collectEventTargetIds(input.events)
    const userIds = [...(idsByType.get('user') ?? [])]
    let organizationIds = [...(idsByType.get('organization') ?? [])]
    const projectIds = [...(idsByType.get('project') ?? [])]
    const taskIds = [...(idsByType.get('task') ?? [])]

    if (input.surface === 'organization') {
      if (!input.organizationId) return new Map()
      organizationIds = organizationIds.filter((id) => id === input.organizationId)
    }

    const [users, organizations, projects, tasks] = await Promise.all([
      userIds.length > 0
        ? userPublicApi.findByIds(userIds, ['id', 'username'])
        : Promise.resolve([]),
      listOrganizationAuditTargetLabels(organizationIds),
      listProjectAuditTargetLabels(projectIds, input.organizationId),
      listTaskAuditTargetLabels(taskIds, input.organizationId),
    ])
    const labels = new Map<string, string>()

    for (const user of users) {
      if (user.username.trim()) labels.set(targetKey('user', user.id), user.username.trim())
    }
    for (const organization of organizations) {
      if (organization.name.trim()) {
        labels.set(targetKey('organization', organization.id), organization.name.trim())
      }
    }
    for (const project of projects) {
      if (project.name.trim()) labels.set(targetKey('project', project.id), project.name.trim())
    }
    for (const task of tasks) {
      if (task.title.trim()) labels.set(targetKey('task', task.id), task.title.trim())
    }

    return labels
  }
}
