import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { DatabaseId } from '#types/database'
import { SystemRoleName } from '#constants'
import User from '#models/user'
import NotFoundException from '#exceptions/not_found_exception'
import db from '@adonisjs/lucid/services/db'

/**
 * UserRepository
 *
 * Data access for users (active checks, role lookups).
 * Extracted from User model static methods.
 */
export default class UserRepository {
  static async findActiveOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
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
  }

  static async isActive(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    try {
      await this.findActiveOrFail(userId, trx)
      return true
    } catch {
      return false
    }
  }

  static async isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return !!user?.is_freelancer
  }

  static async isSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role === SystemRoleName.SUPERADMIN
  }

  static async findNotDeletedOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.where('id', userId).whereNull('deleted_at').firstOrFail()
  }

  static async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role ?? null
  }

  static async isSystemAdmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const roleName = await this.getSystemRoleName(userId, trx)
    return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      roleName as SystemRoleName
    )
  }

  static async findByIds(
    userIds: DatabaseId[],
    selectColumns: string[] = ['id', 'username', 'email'],
    trx?: TransactionClientContract
  ): Promise<User[]> {
    if (userIds.length === 0) return []
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.whereIn('id', userIds).select(selectColumns)
  }

  static async findByOrganization(
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
  }

  static async findById(userId: DatabaseId, trx?: TransactionClientContract): Promise<User | null> {
    if (trx) {
      return User.query({ client: trx }).where('id', userId).first()
    }
    return User.find(userId)
  }

  static async findWithOrganizations(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.where('id', userId).preload('organizations').firstOrFail()
  }

  static queryNotDeleted(
    trx?: TransactionClientContract
  ): ModelQueryBuilderContract<typeof User, User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.whereNull('deleted_at')
  }

  static async findProfileWithRelations(
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
  }

  /**
   * Find task assignments for delivery metrics calculation
   */
  static async findTaskAssignmentsForMetrics(userId: DatabaseId) {
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
  }

  /**
   * Find user skills with details for aggregation
   */
  static async findUserSkillsForAggregation(userId: DatabaseId) {
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
  }

  /**
   * Find top reviewed skills for featured reviews
   */
  static async findTopReviewedSkills(userId: DatabaseId, limit: number = 2) {
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
  }

  /**
   * Find a representative review for a skill
   */
  static async findReviewForSkill(revieweeId: DatabaseId, skillId: DatabaseId) {
    return db
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
      .first()
  }
}
