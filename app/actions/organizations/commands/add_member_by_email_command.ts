import CreateNotification from '#actions/common/create_notification'
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import { AddMemberDTO } from '#actions/organizations/dtos/request/add_member_dto'
import NotFoundException from '#exceptions/not_found_exception'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

/**
 * Command: Add Member By Email
 *
 * Resolves user from email, then delegates to AddMemberCommand.
 * Controller only needs to pass email + org + role — no User.findBy() in controller.
 */
export default class AddMemberByEmailCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId, email: string, roleId: string): Promise<void> {
    const user = await UserRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const addMember = new AddMemberCommand(this.execCtx, new CreateNotification())
    const dto = new AddMemberDTO(organizationId, user.id, roleId)
    await addMember.execute(dto)
  }
}
