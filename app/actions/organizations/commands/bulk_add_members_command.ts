import { type ExecutionContext } from '#types/execution_context'
import { OrganizationRole } from '#constants/organization_constants'
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import { AddMemberDTO } from '#actions/organizations/dtos/request/add_member_dto'
import CreateNotification from '#actions/common/create_notification'
import loggerService from '#infra/logger/logger_service'
import ForbiddenException from '#exceptions/forbidden_exception'
import type { BulkAddMembersDTO } from '#actions/organizations/dtos/request/bulk_add_members_dto'
import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'

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
    const addMember = new AddMemberCommand(this.execCtx, new CreateNotification())
    const defaultRoleId = OrganizationRole.MEMBER
    const results: BulkAddResult[] = []

    for (const userId of dto.userIds) {
      try {
        const targetUser = await UserRepository.findById(userId)
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

    if (orgUser?.org_role !== OrganizationRole.OWNER) {
      throw new ForbiddenException('Bạn không có quyền thêm người dùng vào tổ chức')
    }
  }
}
