import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { DatabaseId } from '#types/database'
import { SystemRoleName } from '#constants'
import User from '#models/user'
import NotFoundException from '#exceptions/not_found_exception'
import db from '@adonisjs/lucid/services/db'

export interface TaskAssignmentMetricsRow {
  id: DatabaseId
  task_id: DatabaseId
  assignee_id: DatabaseId
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | string | null
  actual_hours: number | string | null
  assigned_at: Date | string
  completed_at: Date | string | null
  task_due_date: Date | string | null
}

export interface UserSkillAggregationRow {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  avg_percentage: number | string | null
  total_reviews: number
  category_code: string
}

export interface TopReviewedSkillRow {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  avg_percentage: number | string | null
  total_reviews: number
}

export interface FeaturedSkillReviewRow {
  reviewer_name: string | null
  reviewer_role: string | null
  rating: number | null
  comment: string | null
  task_id: DatabaseId | null
}

export interface UserCreatedAtRow {
  created_at: Date
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
}

const toNullableNumber = (value: unknown): number | null => {
  return typeof value === 'number' ? value : null
}

const toNullableDatabaseId = (value: unknown): DatabaseId | null => {
  return typeof value === 'string' ? value : null
}

/**
 * UserRepository
 *
 * Data access for users (active checks, role lookups).
 * Extracted from User model static methods.
 */
const UserRepository = {
  async findActiveOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query
      .where('id', userId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .first()

    if (!user) {
      throw new NotFoundException('User không tồn tại hoặc không active')
    }
    return user
  },

  async isActive(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    try {
      await UserRepository.findActiveOrFail(userId, trx)
      return true
    } catch {
      return false
    }
  },

  async isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return !!user?.is_freelancer
  },

  async isSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role === SystemRoleName.SUPERADMIN
  },

  async findNotDeletedOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.where('id', userId).whereNull('deleted_at').firstOrFail()
  },

  async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role ?? null
  },

  async isSystemAdmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const roleName = await UserRepository.getSystemRoleName(userId, trx)
    return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      roleName as SystemRoleName
    )
  },

  async findByIds(
    userIds: DatabaseId[],
    selectColumns: string[] = ['id', 'username', 'email'],
    trx?: TransactionClientContract
  ): Promise<User[]> {
    if (userIds.length === 0) return []
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.whereIn('id', userIds).select(selectColumns)
  },

  async findByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<User[]> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query
      .select(['users.id', 'users.username', 'users.email'])
      .join('organization_users', 'users.id', 'organization_users.user_id')
      .where('organization_users.organization_id', organizationId)
      .whereNull('users.deleted_at')
      .orderBy('users.username', 'asc')
  },

  async findById(userId: DatabaseId, trx?: TransactionClientContract): Promise<User | null> {
    if (trx) {
      return User.query({ client: trx }).where('id', userId).first()
    }
    return User.find(userId)
  },

  async findWithOrganizations(userId: DatabaseId, trx?: TransactionClientContract): Promise<User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.where('id', userId).preload('organizations').firstOrFail()
  },

  queryNotDeleted(trx?: TransactionClientContract): ModelQueryBuilderContract<typeof User, User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.whereNull('deleted_at')
  },

  async findProfileWithRelations(
    userId: DatabaseId,
    options: { includeSkills?: boolean },
    trx?: TransactionClientContract
  ): Promise<User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    void query.where('id', userId).whereNull('deleted_at').preload('current_organization')

    if (options.includeSkills) {
      void query.preload('skills', (skillsQuery) => {
        void skillsQuery.preload('skill')
      })
    }

    return query.firstOrFail()
  },

  /**
   * Find task assignments for delivery metrics calculation
   */
  async findTaskAssignmentsForMetrics(userId: DatabaseId): Promise<TaskAssignmentMetricsRow[]> {
    return db
      .from('task_assignments as ta')
      .join('tasks as t', 't.id', 'ta.task_id')
      .where('ta.assignee_id', userId)
      .whereNull('t.deleted_at')
      .select(
        'ta.id',
        'ta.task_id',
        'ta.assignee_id',
        'ta.assignment_status',
        'ta.estimated_hours',
        'ta.actual_hours',
        'ta.assigned_at',
        'ta.completed_at',
        't.due_date as task_due_date'
      )
  },

  /**
   * Find user skills with details for aggregation
   */
  async findUserSkillsForAggregation(userId: DatabaseId): Promise<UserSkillAggregationRow[]> {
    return db
      .from('user_skills as us')
      .join('skills as s', 's.id', 'us.skill_id')
      .where('us.user_id', userId)
      .select(
        's.id as skill_id',
        's.skill_name',
        'us.level_code',
        'us.avg_percentage',
        'us.total_reviews',
        's.category_code'
      )
  },

  /**
   * Find top reviewed skills for featured reviews
   */
  async findTopReviewedSkills(
    userId: DatabaseId,
    limit: number = 2
  ): Promise<TopReviewedSkillRow[]> {
    return db
      .from('user_skills as us')
      .join('skills as s', 's.id', 'us.skill_id')
      .where('us.user_id', userId)
      .whereNotNull('us.avg_percentage')
      .orderBy('us.total_reviews', 'desc')
      .orderBy('us.avg_percentage', 'desc')
      .limit(limit)
      .select(
        'us.skill_id',
        's.skill_name',
        'us.level_code',
        'us.avg_percentage',
        'us.total_reviews'
      )
  },

  /**
   * Find a representative review for a skill
   */
  async findReviewForSkill(
    revieweeId: DatabaseId,
    skillId: DatabaseId
  ): Promise<FeaturedSkillReviewRow | null> {
    const reviewRaw = (await db
      .from('skill_reviews as sr')
      .join('users as reviewer', 'reviewer.id', 'sr.reviewer_id')
      .where('sr.reviewee_id', revieweeId)
      .where('sr.skill_id', skillId)
      .orderBy('sr.created_at', 'desc')
      .select(
        'reviewer.username as reviewer_name',
        'sr.reviewer_role',
        'sr.rating',
        'sr.comment',
        'sr.task_id'
      )
      .first()) as unknown

    if (!isRecord(reviewRaw)) {
      return null
    }

    return {
      reviewer_name: toNullableString(reviewRaw.reviewer_name),
      reviewer_role: toNullableString(reviewRaw.reviewer_role),
      rating: toNullableNumber(reviewRaw.rating),
      comment: toNullableString(reviewRaw.comment),
      task_id: toNullableDatabaseId(reviewRaw.task_id),
    }
  },

  async findTaskTitleById(taskId: DatabaseId): Promise<string | null> {
    const taskRaw = (await db.from('tasks').where('id', taskId).select('title').first()) as unknown

    if (!isRecord(taskRaw)) {
      return null
    }

    return toNullableString(taskRaw.title)
  },

  async findUserCreatedAt(userId: DatabaseId): Promise<UserCreatedAtRow | null> {
    const rowRaw = (await db
      .from('users')
      .where('id', userId)
      .select('created_at')
      .first()) as unknown

    if (!isRecord(rowRaw)) {
      return null
    }

    const createdAtValue = rowRaw.created_at
    if (createdAtValue instanceof Date) {
      return { created_at: createdAtValue }
    }

    if (typeof createdAtValue === 'string') {
      const parsed = new Date(createdAtValue)
      if (!Number.isNaN(parsed.getTime())) {
        return { created_at: parsed }
      }
    }

    return null
  },
}

export default UserRepository
