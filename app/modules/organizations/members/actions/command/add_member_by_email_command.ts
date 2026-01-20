import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import AddMemberCommand from '#modules/organizations/members/actions/command/add_member_command'
import { AddMemberDTO } from '#modules/organizations/members/actions/dtos/request/add_member_dto'
import type { OrganizationEventPublisher } from '#modules/organizations/members/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/members/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/members/actions/ports/outbound/organization_notification_stager'
import type { OrganizationMembershipRepository } from '#modules/organizations/members/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/members/actions/ports/outbound/organization_transaction'

/**
 * Command: Add Member By Email
 *
 * Resolves user from email, then delegates to AddMemberCommand.
 * Controller only needs to pass email + org + role — no User.findBy() in controller.
 */
export default class AddMemberByEmailCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {}

  async execute(organizationId: string, email: string, roleId: string): Promise<void> {
    const user = await this.userReaderWriter.findUserByEmail(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const addMember = new AddMemberCommand(
      this.execCtx,
      this.notificationStager,
      this.userReaderWriter,
      this.transactionRunner,
      this.memberships,
      this.organizationEventPublisher
    )
    const dto = new AddMemberDTO(organizationId, user.id, roleId)
    await addMember.execute(dto)
  }
}
