import CustomSystemRole from '#modules/authorization/infra/models/custom_system_role'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'

export class CustomSystemRoleService {
  private static cachedRoles: Map<string, string[]> | null = null

  /**
   * Tải lại toàn bộ Custom System Roles từ DB vào cache
   */
  static async refreshCache(): Promise<void> {
    const roles = await CustomSystemRole.query().select('code', 'permissions')
    const map = new Map<string, string[]>()
    for (const role of roles) {
      map.set(role.code, role.permissions)
    }
    this.cachedRoles = map
  }

  /**
   * Lấy permissions của 1 custom role (từ cache)
   */
  static async getRolePermissions(roleCode: string): Promise<string[] | null> {
    if (this.cachedRoles === null) {
      await this.refreshCache()
    }
    return this.cachedRoles?.get(roleCode) ?? null
  }

  /**
   * Kiểm tra xem 1 roleCode có phải là Custom Role không
   */
  static async isCustomRole(roleCode: string): Promise<boolean> {
    if (this.cachedRoles === null) {
      await this.refreshCache()
    }
    return this.cachedRoles?.has(roleCode) ?? false
  }

  /**
   * Lấy toàn bộ Custom System Roles (thường dùng cho UI)
   */
  static async getAllCustomRoles(): Promise<CustomSystemRole[]> {
    return CustomSystemRole.query().orderBy('created_at', 'asc')
  }

  static async findCustomRole(id: string): Promise<CustomSystemRole | null> {
    return CustomSystemRole.find(id)
  }

  static async isRoleCodeTaken(code: string, exceptRoleId?: string): Promise<boolean> {
    const query = CustomSystemRole.query().where('code', code)
    if (exceptRoleId) {
      void query.whereNot('id', exceptRoleId)
    }
    return (await query.first()) !== null
  }

  static async createCustomRole(name: string, code: string, permissions: string[], description?: string): Promise<CustomSystemRole> {
    const role = await CustomSystemRole.create(omitUndefined({
      name,
      code,
      permissions,
      description,
    }))
    await this.refreshCache()
    return role
  }

  static async updateCustomRole(id: string, name: string, code: string, permissions: string[], description?: string): Promise<CustomSystemRole | null> {
    const role = await CustomSystemRole.find(id)
    if (!role) {
      return null
    }

    role.merge(omitUndefined({
      name,
      code,
      permissions,
      description,
    }))
    
    await role.save()
    await this.refreshCache()
    return role
  }

  static async deleteCustomRole(id: string): Promise<boolean> {
    const role = await CustomSystemRole.find(id)
    if (!role) {
      return false
    }

    await role.delete()
    await this.refreshCache()
    return true
  }
}
