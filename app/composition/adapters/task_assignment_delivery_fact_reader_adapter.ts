import ListAssignmentDeliveryFactsV1Query from '#modules/tasks/actions/queries/list_assignment_delivery_facts_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/lucid_task_fact_source_reader'
import type {
  UserAssignmentDeliveryFact,
  UserAssignmentDeliveryFactReader,
} from '#modules/users/actions/ports/outbound/user_assignment_delivery_fact_reader'

export class TaskAssignmentDeliveryFactReaderAdapter
  implements UserAssignmentDeliveryFactReader
{
  private readonly query = new ListAssignmentDeliveryFactsV1Query(
    new LucidTaskFactSourceReader()
  )

  async listAssignmentDeliveryFacts(
    userId: string
  ): Promise<UserAssignmentDeliveryFact[]> {
    const facts = await this.query.execute(userId)
    return facts.map(({ contractVersion: _contractVersion, ...fact }) => fact)
  }
}
