import ListInvitationsQuery, { type ListInvitationsDTO } from './list_invitations_query.js'

import GetAssignableOrganizationRolesQuery from '#actions/organizations/current/access/queries/get_assignable_organization_roles_query'
import type { ExecutionContext } from '#types/execution_context'

export type InvitationsIndexPageInput = ListInvitationsDTO

export interface InvitationsIndexPageResult extends Awaited<
  ReturnType<ListInvitationsQuery['handle']>
> {
  roleOptions: Awaited<ReturnType<GetAssignableOrganizationRolesQuery['handle']>>['roleOptions']
}

export default class GetInvitationsIndexPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: InvitationsIndexPageInput): Promise<InvitationsIndexPageResult> {
    const [result, assignableRoles] = await Promise.all([
      new ListInvitationsQuery(this.execCtx).handle(input),
      new GetAssignableOrganizationRolesQuery(this.execCtx).handle({}),
    ])

    return {
      ...result,
      roleOptions: assignableRoles.roleOptions,
    }
  }
}
