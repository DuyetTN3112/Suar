import ListOrganizationMembersQuery, {
  type ListOrganizationMembersDTO,
} from './list_organization_members_query.js'

import GetAssignableOrganizationRolesQuery from '#actions/organization/access/queries/get_assignable_organization_roles_query'
import type { ExecutionContext } from '#types/execution_context'

export type OrganizationMembersIndexPageInput = ListOrganizationMembersDTO

export interface OrganizationMembersIndexPageResult {
  members: Awaited<ReturnType<ListOrganizationMembersQuery['handle']>>['data']
  meta: Awaited<ReturnType<ListOrganizationMembersQuery['handle']>>['meta']
  filters: {
    search: string
    orgRole: string | null
    status: string | null
  }
  roleOptions: Awaited<ReturnType<GetAssignableOrganizationRolesQuery['handle']>>['roleOptions']
}

export default class GetOrganizationMembersIndexPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    input: OrganizationMembersIndexPageInput
  ): Promise<OrganizationMembersIndexPageResult> {
    const [membersResult, assignableRoles] = await Promise.all([
      new ListOrganizationMembersQuery(this.execCtx).handle(input),
      new GetAssignableOrganizationRolesQuery(this.execCtx).handle({
        organizationId: input.organizationId,
      }),
    ])

    return {
      members: membersResult.data,
      meta: membersResult.meta,
      filters: {
        search: input.search ?? '',
        orgRole: input.orgRole ?? null,
        status: input.status ?? null,
      },
      roleOptions: assignableRoles.roleOptions,
    }
  }
}
