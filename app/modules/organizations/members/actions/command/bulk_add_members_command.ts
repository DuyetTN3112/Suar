import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import { publicErrorMessage } from '#modules/errors/public_contracts/public_error_message'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { canBulkAddOrganizationMembers } from '#modules/organizations/access/domain/org_permission_policy'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import AddMemberCommand from '#modules/organizations/members/actions/command/add_member_command'
import { AddMemberDTO } from '#modules/organizations/members/actions/dtos/request/add_member_dto'
import type { BulkAddMembersDTO } from '#modules/organizations/members/actions/dtos/request/bulk_add_members_dto'
import type { OrganizationEventPublisher } from '#modules/organizations/members/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/members/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/members/actions/ports/outbound/organization_notification_stager'
import type { OrganizationMembershipRepository } from '#modules/organizations/members/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/members/actions/ports/outbound/organization_transaction'

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
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {}

  async execute(dto: BulkAddMembersDTO): Promise<{
    results: BulkAddResult[]
    addedCount: number
  }> {
    // 1. Check requester is org owner
    await this.checkPermission(dto.requesterId, dto.organizationId)

    // 2. Process each user
    const addMember = new AddMemberCommand(
      this.execCtx,
      this.notificationStager,
      this.userReaderWriter,
      this.transactionRunner,
      this.memberships,
      this.organizationEventPublisher
    )
    const defaultRoleId = OrganizationRole.MEMBER
    const results: BulkAddResult[] = []

    for (const userId of dto.userIds) {
      try {
        const targetUser = await this.userReaderWriter.findUserIdentity(userId)
        if (!targetUser) {
          results.push({
            user_id: userId,
            status: 'skipped',
            message: 'Không tìm thấy người dùng',
          })
          continue
        }

        // Check not already a member
        const existingMember = await this.memberships.find(dto.organizationId, userId)

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
        loggerService.error('[BulkAddMembersCommand] Error adding user', {
          userId,
          error: serializeObservabilityError(error),
        })
        results.push({
          user_id: userId,
          status: 'failed',
          message: publicErrorMessage(error),
        })
      }
    }

    const addedCount = results.filter((r) => r.status === 'added').length

    return { results, addedCount }
  }

  private async checkPermission(userId: string, organizationId: string): Promise<void> {
    const orgUser = await this.memberships.find(organizationId, userId)
    enforcePolicy(canBulkAddOrganizationMembers(orgUser?.org_role ?? null))
  }
}
