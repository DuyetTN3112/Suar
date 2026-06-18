import type ListOrganizationMembersQuery from './list_organization_members_query.js';
import {
  type ListOrganizationMembersDTO,
} from './list_organization_members_query.js'

import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'

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

export default class GetOrganizationMembersIndexPageQuery extends BaseQuery<
  OrganizationMembersIndexPageInput,
  OrganizationMembersIndexPageResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly members: ListOrganizationMembersQuery,
    private readonly assignableRoles: GetAssignableOrganizationRolesQuery
  ) {
    super(execCtx)
  }

  override async handle(
    input: OrganizationMembersIndexPageInput
  ): Promise<OrganizationMembersIndexPageResult> {
    const [membersResult, assignableRoles] = await Promise.all([
      this.members.handle(input),
      this.assignableRoles.handle({
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

  async execute(input: OrganizationMembersIndexPageInput): Promise<OrganizationMembersIndexPageResult> {
    return this.handle(input)
  }
}
