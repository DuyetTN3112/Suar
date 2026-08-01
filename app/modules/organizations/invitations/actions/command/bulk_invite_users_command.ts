import { InviteUserDTO } from '../dtos/request/invite_user_dto.js'

import InviteUserCommand from './invite_user_command.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { publicErrorMessage } from '#modules/errors/public_contracts/public_error_message'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/invitations/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/invitations/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/invitations/actions/ports/outbound/organization_transaction'

/**
 * DTO for bulk inviting users
 */
export interface BulkInviteUsersDTO {
  organization_id: string
  user_emails: string[]
  org_role: string
  message?: string
}

/**
 * Command: Bulk Invite Users to Organization
 *
 * Migrate từ stored procedure: bulk_invite_users_to_organization
 *
 * Business rules:
 * - Loop qua danh sách emails và gọi InviteUserCommand cho từng user
 * - Collect kết quả success/failure
 */
export default class BulkInviteUsersCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  async execute(dto: BulkInviteUsersDTO): Promise<{
    success: string[]
    failed: { email: string; error: string }[]
  }> {
    const success: string[] = []
    const failed: { email: string; error: string }[] = []

    const inviteCommand = new InviteUserCommand(
      this.execCtx,
      this.notificationStager,
      this.userReaderWriter,
      this.transactionRunner,
      this.organizations,
      this.memberships
    )

    for (const email of dto.user_emails) {
      try {
        const inviteDto = InviteUserDTO.fromValidatedPayload(
          omitUndefined({
            organization_id: dto.organization_id,
            email,
            role_id: dto.org_role,
            message: dto.message,
          })
        )

        await inviteCommand.execute(inviteDto)
        success.push(email)
      } catch (error) {
        failed.push({
          email: email,
          error: publicErrorMessage(error),
        })
      }
    }

    return { success, failed }
  }
}
