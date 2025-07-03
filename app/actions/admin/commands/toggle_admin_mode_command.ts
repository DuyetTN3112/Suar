import { BaseCommand } from '#actions/admin/base_command'
import { enforcePolicy } from '#actions/authorization/public_api'
import { organizationPublicApi } from '#actions/organizations/public_api'
import { userPublicApi } from '#actions/users/public_api'

export interface ToggleAdminModeDTO {
  enabled: boolean
}

export interface ToggleAdminModeResult {
  enabled: boolean
  redirectPath: string
  successMessage: string
}

// Admin module là orchestration layer. Import từ public APIs của nhiều modules
// (users, organizations) tại đây là intentional — đây là trách nhiệm của
// orchestration layer, không phải boundary violation.
export default class ToggleAdminModeCommand extends BaseCommand<
  ToggleAdminModeDTO,
  ToggleAdminModeResult
> {
  async handle(dto: ToggleAdminModeDTO): Promise<ToggleAdminModeResult> {
    const userId = this.getCurrentUserId()
    const actorSystemRole = await userPublicApi.getSystemRoleName(userId)

    enforcePolicy(userPublicApi.canToggleAdminMode(actorSystemRole))

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

    const membershipContext = await organizationPublicApi.getMembershipContext(
      organizationId,
      userId,
      undefined,
      true
    )
    const actorOrgRole = membershipContext?.role ?? null

    return {
      enabled: false,
      redirectPath: organizationPublicApi.canAccessAdminShell(actorOrgRole).allowed
        ? '/org'
        : '/tasks',
      successMessage: 'Đã tắt Admin Mode',
    }
  }
}
