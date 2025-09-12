import User from '#infra/users/models/user'

export const AdminUserWriteOps = {
  async updateSystemRole(userId: string, systemRole: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.system_role = systemRole
    await user.save()
  },

  async suspendUser(userId: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.status = 'suspended'
    await user.save()
  },

  async activateUser(userId: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.status = 'active'
    await user.save()
  },
}
