import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/access/public_contracts/organization_constants'
import type { OrganizationCacheInvalidator } from '#modules/organizations/directory/actions/ports/outbound/organization_cache_invalidator'
import { InProcessOrganizationEventPublisher } from '#modules/organizations/directory/infra/adapters/in_process_organization_event_publisher'
import * as organizationMembershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import * as organizationMembershipMutations from '#modules/organizations/members/infra/repositories/organization_user_repository/write/mutation_queries'
import type { TaskOrganizationMembershipWriter } from '#modules/tasks/actions/ports/outbound/task_organization_membership_writer'

export class OrganizationTaskMembershipWriterAdapter implements TaskOrganizationMembershipWriter {
  private readonly events = new InProcessOrganizationEventPublisher()

  constructor(private readonly cacheInvalidator: OrganizationCacheInvalidator) {}

  async ensureApprovedMembership(
    organizationId: string,
    userId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingMembership = await organizationMembershipQueries.findMembership(
      organizationId,
      userId,
      trx
    )

    if (existingMembership) {
      await organizationMembershipMutations.updateStatus(
        organizationId,
        userId,
        OrganizationUserStatus.APPROVED,
        trx
      )
      return
    }

    await organizationMembershipMutations.addMember(
      {
        organization_id: organizationId,
        user_id: userId,
        org_role: OrganizationRole.MEMBER,
        status: OrganizationUserStatus.APPROVED,
      },
      trx
    )
  }

  async settleApprovedMembership(organizationId: string, userId: string): Promise<void> {
    await this.cacheInvalidator.invalidateMembership({
      organizationId,
      userIds: [userId],
    })
    await this.events.publishOrganizationMemberAdded({
      organizationId,
      userId,
      org_role: OrganizationRole.MEMBER,
      invitedBy: null,
    })
  }
}
