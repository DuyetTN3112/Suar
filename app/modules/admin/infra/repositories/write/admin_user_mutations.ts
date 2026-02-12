import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export const AdminUserWriteOps = {
  async updateSystemRole(userId: string, systemRole: string): Promise<void> {
    await userPublicApi.updateSystemRoleForAdmin(userId, systemRole)
  },

  async suspendUser(userId: string): Promise<void> {
    await userPublicApi.suspendUserForAdmin(userId)
  },

  async activateUser(userId: string): Promise<void> {
    await userPublicApi.activateUserForAdmin(userId)
  },
}
