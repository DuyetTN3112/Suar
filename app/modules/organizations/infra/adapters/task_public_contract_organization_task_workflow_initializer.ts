import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { OrganizationTaskWorkflowInitializer } from '#modules/organizations/application/ports/organization_task_workflow_initializer'
import { taskWorkflowInitializer } from '#modules/tasks/public_contracts/task_workflow_initializer'

export class TaskPublicContractOrganizationTaskWorkflowInitializer
  implements OrganizationTaskWorkflowInitializer
{
  async seedDefaultStatusesForOrganization(
    organizationId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await taskWorkflowInitializer.seedDefaultStatusesForOrganization(organizationId, trx)
  }
}
