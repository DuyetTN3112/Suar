import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from './shared.js'

import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

export const paginatePublicTasks = async (
  filters: {
    keyword?: string | null
    difficulty?: string | null
    min_budget?: number | null
    max_budget?: number | null
    skill_ids?: string[] | null
    sort_by: string
    sort_order: 'asc' | 'desc'
    page: number
    perPage: number
  },
  userId?: string | null,
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx)
    .select([
      'tasks.id',
      'tasks.title',
      'tasks.description',
      'tasks.difficulty',
      'tasks.due_date',
      'tasks.application_deadline',
      'tasks.estimated_budget',
      'tasks.task_visibility',
      'tasks.organization_id',
      'tasks.project_id',
      'tasks.creator_id',
      'tasks.created_at',
      'tasks.updated_at',
      'tasks.parent_task_id',
    ])
    .whereIn('task_visibility', ['external', 'all'])
    .whereNull('tasks.deleted_at')
    .whereNull('assigned_to')
    .preload('organization', (orgQuery) => {
      void orgQuery.select(['id', 'name', 'logo'])
    })
    .preload('project', (projectQuery) => {
      void projectQuery.select(['id', 'name', 'owner_id']).preload('owner', (ownerQuery) => {
        void ownerQuery.select(['id', 'username', 'email', 'avatar_url'])
      })
    })
    .preload('creator', (creatorQuery) => {
      void creatorQuery.select(['id', 'username', 'email', 'avatar_url'])
    })
    .preload('parentTask', (parentTaskQuery) => {
      void parentTaskQuery.select(['id', 'title'])
    })
    .preload('required_skills_rel', (skillsQuery) => {
      void skillsQuery.select(['id', 'task_id', 'skill_id', 'required_level_code', 'is_mandatory'])
      void skillsQuery.preload('skill', (skillQuery) => {
        void skillQuery.select(['id', 'skill_name', 'skill_code', 'category_code', 'icon_url'])
      })
    })

  if (filters.keyword) {
    const term = `%${filters.keyword.trim().toLowerCase()}%`
    void query.where((builder) => {
      void builder
        .whereRaw('LOWER(tasks.title) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.description) LIKE ?', [term])
    })
  }

  if (filters.difficulty) {
    void query.where('difficulty', filters.difficulty)
  }
  if (filters.min_budget !== null && filters.min_budget !== undefined) {
    void query.where('estimated_budget', '>=', filters.min_budget)
  }
  if (filters.max_budget !== null && filters.max_budget !== undefined) {
    void query.where('estimated_budget', '<=', filters.max_budget)
  }

  if (filters.skill_ids && filters.skill_ids.length > 0) {
    const skillIds = filters.skill_ids
    void query.whereHas('required_skills_rel', (builder) => {
      void builder.whereIn('skill_id', skillIds)
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
      void appQuery
        .where('applicant_id', userId)
        .whereNot('application_status', ApplicationStatus.WITHDRAWN)
        .as('user_applied')
    })
  }

  return query.paginate(filters.page, filters.perPage)
}

export const paginatePublicTasksAsRecords = async (
  filters: Parameters<typeof paginatePublicTasks>[0],
  userId?: Parameters<typeof paginatePublicTasks>[1],
  trx?: Parameters<typeof paginatePublicTasks>[2]
) => {
  const paginator = await paginatePublicTasks(filters, userId, trx)
  const models = paginator.all()
  const currentUserApplicationMap = new Map<
    string,
    { id: string; status: 'pending' | 'approved' | 'rejected' }
  >()
  let currentUserSkillIds = new Set<string>()

  if (userId && models.length > 0) {
    const client = trx ?? db
    const [rows, userSkills] = await Promise.all([
      client
      .from('task_applications')
      .select(['id', 'task_id', 'application_status'])
      .where('applicant_id', userId)
      .whereIn(
        'task_id',
        models.map((task) => task.id)
      )
      .whereNot('application_status', ApplicationStatus.WITHDRAWN),
      client.from('user_skills').select(['skill_id']).where('user_id', userId),
    ]) as [
      {
        id: string
        task_id: string
        application_status: 'pending' | 'approved' | 'rejected'
      }[],
      { skill_id: string }[],
    ]

    currentUserSkillIds = new Set(userSkills.map((row) => row.skill_id))

    for (const row of rows) {
      currentUserApplicationMap.set(row.task_id, {
        id: row.id,
        status: row.application_status,
      })
    }
  }

  const prioritizedModels = models
    .map((task) => {
      const requiredSkills = task.required_skills_rel
      const matchedSkills = requiredSkills.filter((skill) =>
        currentUserSkillIds.has(skill.skill_id)
      ).length
      const matchedMandatorySkills = requiredSkills.filter(
        (skill) => skill.is_mandatory && currentUserSkillIds.has(skill.skill_id)
      ).length
      const hasApplication = currentUserApplicationMap.has(task.id)
      const visibilityBoost = task.task_visibility === 'all' ? 2 : 1
      const contextBoost =
        Number(Boolean(task.acceptance_criteria)) +
        Number(Boolean(task.verification_method)) +
        Number(Boolean(task.context_background))

      return {
        task,
        priorityScore:
          matchedSkills * 10 +
          matchedMandatorySkills * 15 +
          visibilityBoost * 2 +
          contextBoost -
          (hasApplication ? 20 : 0),
      }
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)

  return {
    data: prioritizedModels.map(({ task, priorityScore }) => ({
      ...TaskInfraMapper.toDetailRecord(task),
      current_user_application: currentUserApplicationMap.get(task.id),
      match_score: priorityScore,
    })),
    meta: {
      total: paginator.total,
      per_page: paginator.perPage,
      current_page: paginator.currentPage,
      last_page: paginator.lastPage,
    },
  }
}
