import type { HttpContext } from '@adonisjs/core/http'
import InviteUserCommand from './invite_user_command.js'
import { InviteUserDTO } from '../dtos/invite_user_dto.js'

/**
 * DTO for bulk inviting users
 */
export interface BulkInviteUsersDTO {
  organization_id: number
  user_emails: string[]
  role_id: number
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
  constructor(protected ctx: HttpContext) {}

  async execute(dto: BulkInviteUsersDTO): Promise<{
    success: string[]
    failed: { email: string; error: string }[]
  }> {
    const success: string[] = []
    const failed: { email: string; error: string }[] = []

    const inviteCommand = new InviteUserCommand(this.ctx)

    for (const email of dto.user_emails) {
      try {
        const inviteDto = new InviteUserDTO(dto.organization_id, email, dto.role_id, dto.message)

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
