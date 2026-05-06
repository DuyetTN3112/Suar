import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ListCompletedAssignmentProfileFactsV1Query from '#modules/tasks/actions/queries/task-assignment/list_completed_assignment_profile_facts_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_fact_source_reader'
import type {
  UserCompletedAssignmentFact,
  UserCompletedAssignmentFactReader,
} from '#modules/users/actions/ports/outbound/user_completed_assignment_fact_reader'

export class TaskCompletedAssignmentFactReaderAdapter
  implements UserCompletedAssignmentFactReader
{
  private readonly query = new ListCompletedAssignmentProfileFactsV1Query(
    new LucidTaskFactSourceReader()
  )

  async listCompletedAssignmentFacts(
    userId: string,
    trx: TransactionClientContract
  ): Promise<UserCompletedAssignmentFact[]> {
    const facts = await this.query.execute(userId, trx)
    return facts.map(({ contractVersion: _contractVersion, ...fact }) => fact)
  }
}

export const completedAssignmentFactReader =
  new TaskCompletedAssignmentFactReaderAdapter()
