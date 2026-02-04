import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { enforcePolicy } from '#actions/authorization/public_api'
import { notificationPublicApi } from '#actions/notifications/public_api'
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import { AddMemberDTO } from '#actions/organizations/dtos/request/add_member_dto'
import type { BulkAddMembersDTO } from '#actions/organizations/dtos/request/bulk_add_members_dto'
import loggerService from '#infra/logger/logger_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import { canBulkAddOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import { type ExecutionContext } from '#types/execution_context'

interface BulkAddResult {
  user_id: string
  status: 'added' | 'skipped' | 'failed'
  message: string
}

/**
 * Command: Bulk Add Members to Organization
 *
 * Business rules:
 * - Requester must be org owner (super admin)
 * - Skips non-existent users
 * - Skips users already in organization
 * - Uses AddMemberCommand for each user
 */
export default class BulkAddMembersCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: BulkAddMembersDTO): Promise<{
    results: BulkAddResult[]
    addedCount: number
  }> {
    // 1. Check requester is org owner
    await this.checkPermission(dto.requesterId, dto.organizationId)

    // 2. Process each user
    const addMember = new AddMemberCommand(this.execCtx, notificationPublicApi)
    const defaultRoleId = OrganizationRole.MEMBER
    const results: BulkAddResult[] = []

    for (const userId of dto.userIds) {
      try {
        const targetUser = await DefaultOrganizationDependencies.user.findUserIdentity(userId)
        if (!targetUser) {
          results.push({
            user_id: userId,
            status: 'skipped',
            message: 'Không tìm thấy người dùng',
          })
          continue
        }

        // Check not already a member
        const existingMember = await OrganizationUserRepository.findMembership(
          dto.organizationId,
          userId
        )

        if (existingMember) {
          results.push({
            user_id: userId,
            status: 'skipped',
            message: 'Người dùng đã là thành viên của tổ chức',
          })
          continue
        }

        // Add member using existing command
        const memberDto = new AddMemberDTO(dto.organizationId, targetUser.id, defaultRoleId)
        await addMember.execute(memberDto)

        results.push({
          user_id: userId,
          status: 'added',
          message: 'Thêm thành công',
        })
      } catch (error: unknown) {
        loggerService.error(`[BulkAddMembersCommand] Error adding user ${userId}:`, error)
        results.push({
          user_id: userId,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Lỗi không xác định',
        })
      }
    }

    const addedCount = results.filter((r) => r.status === 'added').length

    return { results, addedCount }
  }

  private async checkPermission(userId: string, organizationId: string): Promise<void> {
    const orgUser = await OrganizationUserRepository.findMembership(organizationId, userId)
    enforcePolicy(canBulkAddOrganizationMembers(orgUser?.org_role ?? null))
  }
}
