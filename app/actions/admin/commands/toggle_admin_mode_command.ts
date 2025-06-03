import { BaseCommand } from '#actions/shared/base_command'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import { canAccessOrganizationAdminShell } from '#domain/organizations/org_permission_policy'
import { canToggleAdminMode } from '#domain/users/user_management_rules'

export interface ToggleAdminModeDTO {
  enabled: boolean
}

export interface ToggleAdminModeResult {
  enabled: boolean
  redirectPath: string
  successMessage: string
}

export default class ToggleAdminModeCommand extends BaseCommand<
  ToggleAdminModeDTO,
  ToggleAdminModeResult
> {
  async handle(dto: ToggleAdminModeDTO): Promise<ToggleAdminModeResult> {
    const userId = this.getCurrentUserId()
    const actorSystemRole = await UserRepository.getSystemRoleName(userId)

    enforcePolicy(canToggleAdminMode(actorSystemRole))

    if (dto.enabled) {
      return {
        enabled: true,
        redirectPath: '/admin',
        successMessage: 'Đã bật Admin Mode',
      }
    }

    const organizationId = this.execCtx.organizationId
    if (!organizationId) {
      return {
        enabled: false,
        redirectPath: '/organizations',
        successMessage: 'Đã tắt Admin Mode',
      }
    }

    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      undefined,
      true
    )

    return {
      enabled: false,
      redirectPath: canAccessOrganizationAdminShell(actorOrgRole) ? '/org' : '/tasks',
      successMessage: 'Đã tắt Admin Mode',
    }
  }
}
