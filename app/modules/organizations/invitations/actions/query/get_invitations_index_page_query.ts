import type ListInvitationsQuery from './list_invitations_query.js';
import { type ListInvitationsDTO } from './list_invitations_query.js'

import type GetAssignableOrganizationRolesQuery from '#modules/organizations/access/actions/query/get_assignable_organization_roles_query'

export type InvitationsIndexPageInput = ListInvitationsDTO

export interface InvitationsIndexPageResult extends Awaited<
  ReturnType<ListInvitationsQuery['handle']>
> {
  roleOptions: Awaited<ReturnType<GetAssignableOrganizationRolesQuery['handle']>>['roleOptions']
}

export default class GetInvitationsIndexPageQuery {
  constructor(
    private readonly invitations: ListInvitationsQuery,
    private readonly assignableRoles: GetAssignableOrganizationRolesQuery
  ) {}

  async execute(input: InvitationsIndexPageInput): Promise<InvitationsIndexPageResult> {
    const [result, assignableRoles] = await Promise.all([
      this.invitations.handle(input),
      this.assignableRoles.handle({}),
    ])

    return {
      ...result,
      roleOptions: assignableRoles.roleOptions,
    }
  }
}
