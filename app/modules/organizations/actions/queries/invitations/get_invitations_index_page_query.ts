import type ListInvitationsQuery from './list_invitations_query.js';
import { type ListInvitationsDTO } from './list_invitations_query.js'

import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'

export type InvitationsIndexPageInput = ListInvitationsDTO

export interface InvitationsIndexPageResult extends Awaited<
  ReturnType<ListInvitationsQuery['handle']>
> {
  roleOptions: Awaited<ReturnType<GetAssignableOrganizationRolesQuery['handle']>>['roleOptions']
}

export default class GetInvitationsIndexPageQuery extends BaseQuery<
  InvitationsIndexPageInput,
  InvitationsIndexPageResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly invitations: ListInvitationsQuery,
    private readonly assignableRoles: GetAssignableOrganizationRolesQuery
  ) {
    super(execCtx)
  }

  override async handle(input: InvitationsIndexPageInput): Promise<InvitationsIndexPageResult> {
    const [result, assignableRoles] = await Promise.all([
      this.invitations.handle(input),
      this.assignableRoles.handle({}),
    ])

    return {
      ...result,
      roleOptions: assignableRoles.roleOptions,
    }
  }

  async execute(input: InvitationsIndexPageInput): Promise<InvitationsIndexPageResult> {
    return this.handle(input)
  }
}
