import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

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
    if (filters.search) {
      query.where((q) => {
        q.where('username', 'ilike', `%${filters.search}%`).orWhere(
          'email',
          'ilike',
          `%${filters.search}%`
        )
      })
    }

    if (filters.systemRole) {
      query.where('system_role', filters.systemRole)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    // Order by created_at DESC
    query.orderBy('created_at', 'desc')

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

    const [total, active, suspended, newThisMonth] = await Promise.all([
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
    ])

    return {
      total: Number(total?.total || 0),
      active: Number(active?.total || 0),
      suspended: Number(suspended?.total || 0),
      newThisMonth: Number(newThisMonth?.total || 0),
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
}
