import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/**
 * AdminUserRepository (Infrastructure Layer)
 *
 * Handles all database queries for admin user management.
 * Pure infrastructure concern - no business logic here.
 */

export interface ListUsersFilters {
  search?: string
  systemRole?: string
  status?: string
}

export interface ListUsersResult {
  users: User[]
  total: number
}

export interface DashboardUserStats {
  total: number
  active: number
  suspended: number
  newThisMonth: number
}

export default class AdminUserRepository {
  /**
   * List users with filters and pagination
   */
  async listUsers(
    filters: ListUsersFilters,
    page: number,
    perPage: number
  ): Promise<ListUsersResult> {
    const query = User.query()

    // Apply filters
    const search = filters.search
    if (search) {
      void query.where((q) => {
        void q.where('username', 'ilike', `%${search}%`).orWhere('email', 'ilike', `%${search}%`)
      })
    }

    if (filters.systemRole) {
      void query.where('system_role', filters.systemRole)
    }

    if (filters.status) {
      void query.where('status', filters.status)
    }

    // Order by created_at DESC
    void query.orderBy('created_at', 'desc')

    // Execute with pagination
    const result = await query.paginate(page, perPage)

    return {
      users: result.all(),
      total: result.total,
    }
  }

  /**
   * Get user statistics for dashboard
   */
  async getUserStats(): Promise<DashboardUserStats> {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const statsResults = (await Promise.all([
      db.from('users').count('* as total').whereNull('deleted_at').first(),
      db
        .from('users')
        .count('* as total')
        .where('status', 'active')
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('status', 'suspended')
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])) as unknown[]

    const total = statsResults[0]
    const active = statsResults[1]
    const suspended = statsResults[2]
    const newThisMonth = statsResults[3]

    return {
      total: isRecord(total) ? toNumberValue(total.total) : 0,
      active: isRecord(active) ? toNumberValue(active.total) : 0,
      suspended: isRecord(suspended) ? toNumberValue(suspended.total) : 0,
      newThisMonth: isRecord(newThisMonth) ? toNumberValue(newThisMonth.total) : 0,
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    return await User.find(userId)
  }

  /**
   * Update user system role
   */
  async updateSystemRole(userId: string, systemRole: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.system_role = systemRole
    await user.save()
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.status = 'suspended'
    await user.save()
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.status = 'active'
    await user.save()
  }
}
