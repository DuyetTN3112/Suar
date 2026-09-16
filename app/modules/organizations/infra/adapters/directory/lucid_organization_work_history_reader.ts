import { asLucidTransaction } from './persistence_helpers.js'

import type { OrganizationWorkHistoryReader } from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import * as workHistoryQueries from '#modules/organizations/infra/repositories/read/members/organization_work_history_queries'

export class LucidOrganizationWorkHistoryReader implements OrganizationWorkHistoryReader {
  listApprovedMembershipsByUser(userId: string, transaction?: OrganizationTransaction) {
    return workHistoryQueries.listApprovedMembershipsByUser(userId, asLucidTransaction(transaction))
  }

  listOrganizationNamesByIds(organizationIds: string[], transaction?: OrganizationTransaction) {
    return workHistoryQueries.listOrganizationNamesByIds(
      organizationIds,
      asLucidTransaction(transaction)
    )
  }
}
