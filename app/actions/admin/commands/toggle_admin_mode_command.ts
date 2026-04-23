import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { BaseCommand } from '#actions/shared/base_command'
import { canAccessOrganizationAdminShell } from '#domain/organizations/org_permission_policy'
import { canToggleAdminMode } from '#domain/users/user_management_rules'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'

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

    const membershipContext = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId,
      undefined,
      true
    )
    const actorOrgRole = membershipContext?.role ?? null

    return {
      enabled: false,
      redirectPath: canAccessOrganizationAdminShell(actorOrgRole).allowed ? '/org' : '/tasks',
      successMessage: 'Đã tắt Admin Mode',
    }
  }
}
