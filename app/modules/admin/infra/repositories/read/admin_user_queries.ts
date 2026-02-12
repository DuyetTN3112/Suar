import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export interface ListUsersFilters {
  search?: string
  systemRole?: string
  status?: string
}

export interface ListUsersResult {
  users: Awaited<ReturnType<typeof userPublicApi.listUsersForAdmin>>['users']
  total: number
}

export interface DashboardUserStats {
  total: number
  active: number
  suspended: number
  newThisMonth: number
}

export const AdminUserReadOps = {
  async listUsers(
    filters: ListUsersFilters,
    page: number,
    perPage: number
  ): Promise<ListUsersResult> {
    return userPublicApi.listUsersForAdmin(filters, page, perPage)
  },

  async getUserStats(): Promise<DashboardUserStats> {
    return userPublicApi.getUserStatsForAdmin()
  },

  async findById(userId: string): Promise<Awaited<ReturnType<typeof userPublicApi.findById>>> {
    return await userPublicApi.findById(userId)
  },
}
