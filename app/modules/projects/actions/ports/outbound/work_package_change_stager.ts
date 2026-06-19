import type { ProjectTransaction } from './project_transaction.js'

import type { WorkPackageChangedV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

export interface WorkPackageChangeStager {
  stageWorkPackageChanged(
    fact: WorkPackageChangedV1,
    transaction: ProjectTransaction
  ): Promise<void>
}
