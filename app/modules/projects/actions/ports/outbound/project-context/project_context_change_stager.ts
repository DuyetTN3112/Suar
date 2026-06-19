import type { ProjectTransaction } from '../project_transaction.js'

import type { ProjectContextChangedV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

export interface ProjectContextChangeStager {
  stageProjectContextChanged(
    fact: ProjectContextChangedV1,
    transaction: ProjectTransaction
  ): Promise<void>
}
