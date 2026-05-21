import type { AdminActionContext } from '#modules/admin/organizations/actions/action_context'
import type GetOrganizationDetailsQuery from '#modules/admin/organizations/actions/queries/organizations/get_organization_details_query'
import type ListOrganizationsQuery from '#modules/admin/organizations/actions/queries/organizations/list_organizations_query'

export abstract class AdminOrganizationActionFactory {
  abstract makeListOrganizationsQuery(execCtx: AdminActionContext): ListOrganizationsQuery

  abstract makeGetOrganizationDetailsQuery(
    execCtx: AdminActionContext
  ): GetOrganizationDetailsQuery
}
