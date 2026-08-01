import { randomUUID } from 'node:crypto'

import {
  CustomSystemRoleRepository as CustomSystemRoleRepositoryPort,
  type CustomSystemRoleRecord,
  type CustomSystemRoleWriteData,
} from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'
import CustomSystemRole from '#modules/authorization/infra/models/custom_system_role'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'

function toRecord(role: CustomSystemRole): CustomSystemRoleRecord {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    permissions: [...role.permissions],
    createdAt: role.createdAt.toISO(),
    updatedAt: role.updatedAt.toISO(),
  }
}

export default class CustomSystemRoleRepository extends CustomSystemRoleRepositoryPort {
  async listPermissionSnapshots() {
    const roles = await CustomSystemRole.query().select('code', 'permissions')
    return roles.map((role) => ({
      code: role.code,
      permissions: role.permissions,
    }))
  }

  async listAll(): Promise<CustomSystemRoleRecord[]> {
    const roles = await CustomSystemRole.query().orderBy('created_at', 'asc')
    return roles.map(toRecord)
  }

  async find(id: string): Promise<CustomSystemRoleRecord | null> {
    const role = await CustomSystemRole.find(id)
    return role ? toRecord(role) : null
  }

  async isCodeTaken(code: string, exceptRoleId?: string): Promise<boolean> {
    const query = CustomSystemRole.query().where('code', code)
    if (exceptRoleId) {
      void query.whereNot('id', exceptRoleId)
    }
    return (await query.first()) !== null
  }

  async create(data: CustomSystemRoleWriteData): Promise<CustomSystemRoleRecord> {
    const role = await CustomSystemRole.create({
      id: randomUUID(),
      ...omitUndefined(data),
    })
    return toRecord(role)
  }

  async update(
    id: string,
    data: CustomSystemRoleWriteData
  ): Promise<CustomSystemRoleRecord | null> {
    const role = await CustomSystemRole.find(id)
    if (!role) return null

    role.merge(omitUndefined(data))
    await role.save()
    return toRecord(role)
  }

  async delete(id: string): Promise<boolean> {
    const role = await CustomSystemRole.find(id)
    if (!role) return false

    await role.delete()
    return true
  }
}
