import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskOrganizationMembershipWriter {
  ensureApprovedMembership(
    organizationId: string,
    userId: string,
    trx: TaskTransaction
  ): Promise<void>

  settleApprovedMembership(organizationId: string, userId: string): Promise<void>
}
