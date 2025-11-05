import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'

/**
 * Command: Add Member By Email
 *
 * Resolves user from email, then delegates to AddMemberCommand.
 * Controller only needs to pass email + org + role — no User.findBy() in controller.
 */
export default class AddMemberByEmailCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(organizationId: string, email: string, roleId: string): Promise<void> {
    const user = await DefaultOrganizationDependencies.user.findUserByEmail(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const addMember = new AddMemberCommand(this.execCtx, notificationPublicApi)
    const dto = new AddMemberDTO(organizationId, user.id, roleId)
    await addMember.execute(dto)
  }
}
