import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { DatabaseId } from '#types/database'
import { TaskStatus, TERMINAL_TASK_STATUSES } from '#constants'
import { DateTime } from 'luxon'
import Task from '#models/task'

/**
 * Permission filter for task queries.
 * Determined by business logic in query files, applied by repository.
 */
export type TaskPermissionFilter =
  | { type: 'all' }
  | { type: 'none' }
  | { type: 'own_only'; userId: DatabaseId }
  | { type: 'own_or_assigned'; userId: DatabaseId }

/**
 * TaskRepository
 *
 * Data access for tasks (aggregate queries, bulk mutations).
 * Extracted from Task model static methods.
 */
export default class TaskRepository {
  static async countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    const result = await query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotIn('status', TERMINAL_TASK_STATUSES as unknown as string[])
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  static async reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    await query
      .where('project_id', projectId)
      .where('assigned_to', fromUserId)
      .whereNull('deleted_at')
      .update({
        assigned_to: String(toUserId),
        updated_at: new Date(),
      })
  }

  static async unassignByUserInProjects(
    projectIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (projectIds.length === 0) return
    const query = trx ? Task.query({ client: trx }) : Task.query()
    await query
      .whereIn('project_id', projectIds)
      .where('assigned_to', userId)
      .whereNull('deleted_at')
      .update({
        assigned_to: null,
        updated_at: new Date(),
      })
  }

  /**
   * Get task summary stats for a project.
   * Contains in-memory business logic for overdue calculation.
   */
  static async getTasksSummaryByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    const tasks = await query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .select('status', 'due_date')

    const now = new Date()
    let pending = 0
    let inProgress = 0
    let completed = 0
    let overdue = 0

    for (const task of tasks) {
      if (task.status === TaskStatus.TODO) pending++
      else if (task.status === TaskStatus.IN_PROGRESS) inProgress++
      else if (task.status === TaskStatus.DONE) completed++

      if (
        ![TaskStatus.DONE, TaskStatus.CANCELLED].includes(task.status as TaskStatus) &&
        task.due_date
      ) {
        const dueDate =
          task.due_date instanceof Date ? task.due_date : new Date(String(task.due_date))
        if (dueDate < now) overdue++
      }
    }

    return {
      total: tasks.length,
      pending,
      in_progress: inProgress,
      completed,
      overdue,
    }
  }

  static async countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    let q = query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotNull('assigned_to')
      .select('assigned_to')
      .count('* as total')
      .groupBy('assigned_to')

    if (userIds && userIds.length > 0) {
      q = q.whereIn('assigned_to', userIds)
    }

    const results = await q
    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.assigned_to), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }

  static async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const query = trx ? Task.query({ client: trx }) : Task.query()
    const results = await query
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .select('project_id')
      .count('* as total')
      .groupBy('project_id')

    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.project_id), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }

  // ── Permission filter helper ──

  private static applyPermissionFilter(
    query: ModelQueryBuilderContract<typeof Task>,
    filter: TaskPermissionFilter
  ): void {
    switch (filter.type) {
      case 'all':
        break
      case 'none':
        void query.where('id', -1)
        break
      case 'own_only':
        void query.where('creator_id', filter.userId)
        break
      case 'own_or_assigned':
        void query.where((q) => {
          void q.where('creator_id', filter.userId).orWhere('assigned_to', filter.userId)
        })
        break
    }
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? Task.query({ client: trx }) : Task.query()
  }

  // ── Query methods for task query files ──

  static async findByIdWithDetailRelations(
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<Task> {
    return this.baseQuery(trx)
      .where('id', taskId)
      .whereNull('deleted_at')
      .preload('assignee')
      .preload('creator')
      .preload('updater')
      .preload('organization')
      .preload('project')
      .preload('parentTask')
      .firstOrFail()
  }

  static async findRootTasksForKanban(
    organizationId: DatabaseId,
    permissionFilter: TaskPermissionFilter,
    trx?: TransactionClientContract
  ): Promise<Task[]> {
    const query = this.baseQuery(trx)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .whereNull('parent_task_id')
      .orderBy('sort_order', 'asc')
      .orderBy('updated_at', 'desc')

    this.applyPermissionFilter(query, permissionFilter)

    void query
      .preload('assignee', (q) => void q.select(['id', 'username', 'email']))
      .preload('creator', (q) => void q.select(['id', 'username']))
      .preload('childTasks', (q) => {
        void q.whereNull('deleted_at').select(['id', 'title', 'status', 'parent_task_id'])
      })

    return query
  }

  static async findTasksForTimeline(
    organizationId: DatabaseId,
    permissionFilter: TaskPermissionFilter,
    trx?: TransactionClientContract
  ): Promise<Task[]> {
    const query = this.baseQuery(trx)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .whereNull('parent_task_id')
      .whereNotNull('due_date')
      .orderBy('due_date', 'asc')

    this.applyPermissionFilter(query, permissionFilter)

    void query
      .preload('assignee', (q) => void q.select(['id', 'username', 'email']))
      .preload('creator', (q) => void q.select(['id', 'username']))

    return query
  }

  static async paginateByOrganization(
    organizationId: DatabaseId,
    filters: {
      status?: DatabaseId
      priority?: DatabaseId
      label?: DatabaseId
      assigned_to?: DatabaseId
      parent_task_id?: DatabaseId | null
      project_id?: DatabaseId | null
      search?: string
      sort_by: string
      sort_order: 'asc' | 'desc'
      page: number
      limit: number
    },
    permissionFilter: TaskPermissionFilter,
    trx?: TransactionClientContract
  ) {
    const query = this.baseQuery(trx)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')

    this.applyPermissionFilter(query, permissionFilter)

    // Apply filters
    if (filters.status) void query.where('status', filters.status)
    if (filters.priority) void query.where('priority', filters.priority)
    if (filters.label) void query.where('label', filters.label)
    if (filters.assigned_to) void query.where('assigned_to', filters.assigned_to)

    if (filters.parent_task_id === null) {
      void query.whereNull('parent_task_id')
    } else if (filters.parent_task_id) {
      void query.where('parent_task_id', filters.parent_task_id)
    }

    if (filters.project_id === null) {
      void query.whereNull('project_id')
    } else if (filters.project_id) {
      void query.where('project_id', filters.project_id)
    }

    if (filters.search) {
      const searchTerm = filters.search
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('title', `%${searchTerm}%`)
          .orWhereILike('description', `%${searchTerm}%`)
          .orWhere('id', searchTerm)
      })
    }

    void query.orderBy(filters.sort_by, filters.sort_order)

    void query
      .preload('assignee', (assigneeQuery) => {
        void assigneeQuery.select(['id', 'username', 'email'])
      })
      .preload('creator', (creatorQuery) => {
        void creatorQuery.select(['id', 'username'])
      })
      .preload('parentTask', (parentQuery) => {
        void parentQuery.select(['id', 'title', 'status'])
      })
      .preload('childTasks', (childQuery) => {
        void childQuery.whereNull('deleted_at')
        void childQuery.select(['id', 'title', 'status'])
      })

    return query.paginate(filters.page, filters.limit)
  }

  static async getListStatsByOrganization(
    organizationId: DatabaseId,
    permissionFilter: TaskPermissionFilter,
    trx?: TransactionClientContract
  ): Promise<{ total: number; by_status: Record<string, number> }> {
    const baseQuery = this.baseQuery(trx)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')

    this.applyPermissionFilter(baseQuery, permissionFilter)

    const total = await baseQuery.clone().count('* as total').first()
    const byStatusResults = await baseQuery
      .clone()
      .select('status')
      .count('* as count')
      .groupBy('status')

    const byStatus: Record<string, number> = {}
    byStatusResults.forEach((row) => {
      byStatus[String(row.status)] = row.$extras.count as number
    })

    return {
      total: Number(total?.$extras.total || 0),
      by_status: byStatus,
    }
  }

  static async getStatisticsByOrganization(
    organizationId: DatabaseId,
    permissionFilter: TaskPermissionFilter,
    trx?: TransactionClientContract
  ): Promise<{
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byLabel: Record<string, number>
    overdue: number
    completedThisWeek: number
    completedThisMonth: number
    avgCompletionDays: number | null
    timeTracking: {
      tasksWithEstimate: number
      tasksWithActual: number
      totalEstimated: number
      totalActual: number
      avgEstimated: number
      avgActual: number
      efficiency: number | null
    }
  }> {
    const base = this.baseQuery(trx)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
    this.applyPermissionFilter(base, permissionFilter)

    const [
      total,
      byStatus,
      byPriority,
      byLabel,
      overdue,
      completedThisWeek,
      completedThisMonth,
      avgCompletionDays,
      timeTracking,
    ] = await Promise.all([
      this.statTotal(base),
      this.statGroupBy(base, 'status'),
      this.statGroupBy(base, 'priority'),
      this.statGroupBy(base, 'label'),
      this.statOverdue(base),
      this.statCompletedSince(base, DateTime.now().startOf('week')),
      this.statCompletedSince(base, DateTime.now().startOf('month')),
      this.statAvgCompletionDays(base),
      this.statTimeTracking(base),
    ])

    return {
      total,
      byStatus,
      byPriority,
      byLabel,
      overdue,
      completedThisWeek,
      completedThisMonth,
      avgCompletionDays,
      timeTracking,
    }
  }

  private static async statTotal(base: ModelQueryBuilderContract<typeof Task>): Promise<number> {
    const result = await base.clone().count('* as total').first()
    return Number((result as any)?.$extras?.total ?? 0)
  }

  private static async statGroupBy(
    base: ModelQueryBuilderContract<typeof Task>,
    column: string
  ): Promise<Record<string, number>> {
    const q = base.clone().select(column).count('* as count')
    if (column !== 'status') void q.whereNotNull(column)
    const results = await q.groupBy(column)

    const stats: Record<string, number> = {}
    for (const row of results) {
      stats[String((row as any)[column])] = Number((row as any).$extras.count)
    }
    return stats
  }

  private static async statOverdue(base: ModelQueryBuilderContract<typeof Task>): Promise<number> {
    const result = await base
      .clone()
      .whereNotNull('due_date')
      .where('due_date', '<', DateTime.now().toFormat('yyyy-MM-dd'))
      .whereNotIn('status', [TaskStatus.DONE, TaskStatus.CANCELLED])
      .count('* as total')
      .first()
    return Number((result as any)?.$extras?.total ?? 0)
  }

  private static async statCompletedSince(
    base: ModelQueryBuilderContract<typeof Task>,
    since: DateTime
  ): Promise<number> {
    const result = await base
      .clone()
      .where('status', TaskStatus.DONE)
      .where('updated_at', '>=', since.toSQL()!)
      .count('* as total')
      .first()
    return Number((result as any)?.$extras?.total ?? 0)
  }

  private static async statAvgCompletionDays(
    base: ModelQueryBuilderContract<typeof Task>
  ): Promise<number | null> {
    const completedTasks = await base
      .clone()
      .where('status', TaskStatus.DONE)
      .select('created_at', 'updated_at')

    if (completedTasks.length === 0) return null

    const totalDays = completedTasks.reduce((sum: number, task: Task) => {
      const created = DateTime.fromJSDate(task.created_at.toJSDate())
      const completed = DateTime.fromJSDate(task.updated_at.toJSDate())
      return sum + completed.diff(created, 'days').days
    }, 0)

    return Math.round(totalDays / completedTasks.length)
  }

  private static async statTimeTracking(base: ModelQueryBuilderContract<typeof Task>): Promise<{
    tasksWithEstimate: number
    tasksWithActual: number
    totalEstimated: number
    totalActual: number
    avgEstimated: number
    avgActual: number
    efficiency: number | null
  }> {
    const tasks = await base.clone().select('estimated_time', 'actual_time')

    const tasksWithEstimate = tasks.filter((t) => t.estimated_time).length
    const tasksWithActual = tasks.filter((t) => t.actual_time).length
    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0)
    const totalActual = tasks.reduce((sum, t) => sum + (t.actual_time || 0), 0)
    const avgEstimated = tasksWithEstimate > 0 ? totalEstimated / tasksWithEstimate : 0
    const avgActual = tasksWithActual > 0 ? totalActual / tasksWithActual : 0
    const efficiency = totalEstimated > 0 ? totalActual / totalEstimated : null

    return {
      tasksWithEstimate,
      tasksWithActual,
      totalEstimated: Math.round(totalEstimated * 10) / 10,
      totalActual: Math.round(totalActual * 10) / 10,
      avgEstimated: Math.round(avgEstimated * 10) / 10,
      avgActual: Math.round(avgActual * 10) / 10,
      efficiency: efficiency ? Math.round(efficiency * 100) / 100 : null,
    }
  }

  static async paginateByUser(
    options: {
      userId: DatabaseId
      organizationId: DatabaseId
      filterType: 'assigned' | 'created' | 'both'
      status?: DatabaseId
      priority?: DatabaseId
      page: number
      limit: number
    },
    trx?: TransactionClientContract
  ) {
    const query = this.baseQuery(trx)
      .where('organization_id', options.organizationId)
      .whereNull('deleted_at')

    if (options.filterType === 'assigned') {
      void query.where('assigned_to', options.userId)
    } else if (options.filterType === 'created') {
      void query.where('creator_id', options.userId)
    } else {
      void query.where((q) => {
        void q.where('assigned_to', options.userId).orWhere('creator_id', options.userId)
      })
    }

    if (options.status) void query.where('status', options.status)
    if (options.priority) void query.where('priority', options.priority)

    void query
      .preload('assignee', (q) => void q.select(['id', 'username']))
      .preload('creator', (q) => void q.select(['id', 'username']))
      .preload('project', (q) => void q.select(['id', 'name']))

    void query.orderBy('due_date', 'asc')

    return query.paginate(options.page, options.limit)
  }

  static async findRootTasksByOrganization(
    organizationId: DatabaseId,
    limit: number = 100,
    trx?: TransactionClientContract
  ): Promise<Task[]> {
    return this.baseQuery(trx)
      .select(['id', 'title', 'status'])
      .where('organization_id', organizationId)
      .whereNull('parent_task_id')
      .whereNull('deleted_at')
      .orderBy('title', 'asc')
      .limit(limit)
  }

  static async paginatePublicTasks(
    filters: {
      difficulty?: string | null
      min_budget?: number | null
      max_budget?: number | null
      skill_ids?: DatabaseId[] | null
      sort_by: string
      sort_order: 'asc' | 'desc'
      page: number
      perPage: number
    },
    userId?: DatabaseId | null,
    trx?: TransactionClientContract
  ) {
    const query = this.baseQuery(trx)
      .whereIn('task_visibility', ['external', 'all'])
      .whereNull('deleted_at')
      .whereNull('assigned_to')
      .preload('organization', (orgQuery) => {
        void orgQuery.select(['id', 'name', 'logo_url'])
      })
      .preload('required_skills_rel', (skillsQuery) => {
        void skillsQuery.preload('skill')
      })

    if (filters.difficulty) void query.where('difficulty', filters.difficulty)
    if (filters.min_budget) void query.where('estimated_budget', '>=', filters.min_budget)
    if (filters.max_budget) void query.where('estimated_budget', '<=', filters.max_budget)

    if (filters.skill_ids && filters.skill_ids.length > 0) {
      void query.whereHas('required_skills_rel', (builder) => {
        void builder.whereIn('skill_id', filters.skill_ids ?? [])
      })
    }

    switch (filters.sort_by) {
      case 'budget':
        void query.orderBy('estimated_budget', filters.sort_order)
        break
      case 'due_date':
        void query.orderBy('due_date', filters.sort_order)
        break
      default:
        void query.orderBy('created_at', filters.sort_order)
    }

    if (userId) {
      void query.withCount('applications', (appQuery) => {
        void appQuery.where('applicant_id', userId).as('user_applied')
      })
    }

    return query.paginate(filters.page, filters.perPage)
  }

  static async paginateOrganizationTasks(
    organizationId: DatabaseId,
    filters: {
      statusId?: DatabaseId
      priorityId?: DatabaseId
      projectId?: DatabaseId
      assignedTo?: DatabaseId
      search?: string
      sortField: string
      sortOrder: 'asc' | 'desc'
      page: number
      limit: number
    },
    trx?: TransactionClientContract
  ) {
    const query = this.baseQuery(trx)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')

    if (filters.statusId) void query.where('status', filters.statusId)
    if (filters.priorityId) void query.where('priority', filters.priorityId)
    if (filters.projectId) void query.where('project_id', filters.projectId)
    if (filters.assignedTo) void query.where('assigned_to', filters.assignedTo)

    if (filters.search) {
      const search = filters.search
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('title', `%${search}%`)
          .orWhereILike('description', `%${search}%`)
      })
    }

    void query
      .preload('assignee', (q) => {
        void q.select(['id', 'username', 'email'])
      })
      .preload('creator', (q) => {
        void q.select(['id', 'username'])
      })
      .preload('project', (q) => {
        void q.select(['id', 'name', 'status'])
      })

    void query.orderBy(filters.sortField, filters.sortOrder)

    return query.paginate(filters.page, filters.limit)
  }
}
