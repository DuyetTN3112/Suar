import { InviteUserDTO } from '../dtos/request/invite_user_dto.js'

import InviteUserCommand from './invite_user_command.js'

import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

/**
 * DTO for bulk inviting users
 */
export interface BulkInviteUsersDTO {
  organization_id: DatabaseId
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
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: BulkInviteUsersDTO): Promise<{
    success: string[]
    failed: { email: string; error: string }[]
  }> {
    const success: string[] = []
    const failed: { email: string; error: string }[] = []

    const inviteCommand = new InviteUserCommand(this.execCtx)

    for (const email of dto.user_emails) {
      try {
        const inviteDto = InviteUserDTO.fromValidatedPayload({
          organization_id: dto.organization_id,
          email,
          role_id: dto.org_role,
          message: dto.message,
        })

        await inviteCommand.execute(inviteDto)
        success.push(email)
      } catch (error) {
        failed.push({
          email: email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return { success, failed }
  }
}
