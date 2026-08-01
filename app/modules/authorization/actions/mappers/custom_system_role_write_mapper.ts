import type { CustomSystemRoleWriteData } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export function mapCustomSystemRoleWriteData(
  name: string,
  code: string,
  permissions: string[],
  description?: string
): CustomSystemRoleWriteData {
  return {
    name,
    code,
    permissions,
    ...(description === undefined ? {} : { description }),
  }
}
