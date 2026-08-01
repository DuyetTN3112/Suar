import GetTaskProjectsQuery from './get_task_projects_query.js'

import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { listCanonicalProficiencyLevelOptions } from '#modules/skills/public_contracts/proficiency_framework'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/mapper/task_permission_filter_mapper'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskReadRepository } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskLabel, TaskPriority } from '#modules/tasks/public_contracts/task_constants'

/**
 * Query để lấy metadata cho task forms
 *
 * v3: status/label/priority are inline VARCHAR columns (no FK lookups)
 * Features:
 * - Redis caching (10 minutes)
 * - Filter users theo organization
 * - Only root tasks for parent selection
 */
export default class GetTaskMetadataQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly taskReadRepository: Pick<TaskReadRepository, 'findRootTaskOptions'>,
    private readonly taskStatusRepository: Pick<TaskStatusQueryRepositoryPort, 'findByOrganization'>
  ) {}

  /**
   * Execute query
   */
  async execute(organizationId?: string, selectedProjectId?: string | null): Promise<{
    statuses: {
      id: string
      value: string
      label: string
      slug: string
      category: string
      color?: string
      is_system: boolean
    }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: string; username: string; email: string; avatar_url?: string | null }[]
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    availableSkills: {
      id: string
      name: string
      categoryCode: string | null
      rubricVersionId: string | null
    }[]
    projects: { id: string; name: string }[]
    proficiencyLevels: { value: string; label: string }[]
  }> {
    // Get organization_id
    const orgId = (organizationId ?? this.execCtx.organizationId) as string | undefined

    if (!orgId) {
      throw new BusinessLogicException('Organization ID là bắt buộc')
    }

    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Metadata contains organization member identities, parent-task titles, and
    // projects. Authorization must therefore be recomputed before every shared
    // organization cache lookup; a warm key is never proof of current access.
    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      orgId,
      'none',
      undefined,
      this.taskExternalDependencies.permission
    )
    if (buildTaskPermissionFilter(accessContext).type === 'none') {
      throw new ForbiddenException()
    }

    const logicalCacheKey = selectedProjectId
      ? `task:metadata:v3:org:${orgId}:project:${selectedProjectId}`
      : `task:metadata:v3:org:${orgId}`
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata,
        orgId
      ),
      logicalCacheKey
    )
    const loadFromSource = async () => {
      const statuses = await this.loadStatuses(orgId)
      const labels = this.loadLabels()
      const priorities = this.loadPriorities()
      const [users, parentTasks, availableSkills, projects] = await Promise.all([
        this.loadUsers(orgId),
        this.loadParentTasks(orgId),
        this.loadAvailableSkills(selectedProjectId ?? null),
        new GetTaskProjectsQuery(this.taskExternalDependencies.project).execute(orgId),
      ])
      const proficiencyLevels = listCanonicalProficiencyLevelOptions().map((level) => ({
        value: level.value,
        label: level.label,
      }))

      return {
        statuses,
        labels,
        priorities,
        users,
        parentTasks,
        availableSkills,
        projects,
        proficiencyLevels,
      }
    }

    return cacheKey
      ? cacheStore.remember(cacheKey, 600, loadFromSource, { waitTimeoutMs: 1_500 })
      : loadFromSource()
  }

  /**
   * Load all task statuses — v3: static enum values
   */
  private async loadStatuses(organizationId: string): Promise<
    {
      id: string
      value: string
      label: string
      slug: string
      category: string
      color?: string
      is_system: boolean
    }[]
  > {
    const statuses = await this.taskStatusRepository.findByOrganization(organizationId)
    return statuses.map((status) => ({
      id: status.id,
      value: status.id,
      label: status.name,
      slug: status.slug,
      category: status.category,
      color: status.color,
      is_system: status.is_system,
    }))
  }

  /**
   * Load all task labels — v3: static enum values
   */
  private loadLabels(): { value: string; label: string }[] {
    return Object.values(TaskLabel).map((v) => ({ value: v, label: v }))
  }

  /**
   * Load all task priorities — v3: static enum values
   */
  private loadPriorities(): { value: string; label: string }[] {
    return Object.values(TaskPriority).map((v) => ({ value: v, label: v }))
  }

  /**
   * Load users in organization
   */
  private async loadUsers(
    organizationId: string
  ): Promise<{ id: string; username: string; email: string; avatar_url?: string | null }[]> {
    const users = await this.taskExternalDependencies.user.listUsersByOrganization(organizationId)
    return users.map((user) =>
      omitUndefined({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
      })
    )
  }

  /**
   * Load potential parent tasks (root tasks only, not deleted)
   */
  private async loadParentTasks(
    organizationId: string
  ): Promise<{ id: string; title: string; task_status_id: string | null }[]> {
    const tasks = await this.taskReadRepository.findRootTaskOptions(organizationId)

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      task_status_id: task.task_status_id,
    }))
  }

  /**
   * Load active skills used for task required-skills selection.
   */
  private async loadAvailableSkills(selectedProjectId: string | null): Promise<
    {
      id: string
      name: string
      categoryCode: string | null
      rubricVersionId: string | null
    }[]
  > {
    if (selectedProjectId) {
      const projectSkills =
        await this.taskExternalDependencies.skill.listProjectTaskSkills(selectedProjectId)
      return projectSkills
        .filter((projectSkill) => projectSkill.isActive && projectSkill.isSelectableForTasks)
        .map((projectSkill) => ({
          id: projectSkill.id,
          name: projectSkill.name,
          categoryCode: projectSkill.categoryCode,
          rubricVersionId: projectSkill.rubricVersionId,
        }))
    }

    const skills = await this.taskExternalDependencies.skill.listActiveSkills()

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      categoryCode: skill.category_code ?? null,
      rubricVersionId: null,
    }))
  }
}
