import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'

export interface OrganizationPendingMemberApprovalInput {
  organizationId: string
  targetUserId: string
  approverId: string
}

/**
 * Transitional anti-corruption port for the legacy Users-owned approval workflow.
 *
 * Organizations owns the membership intent. Outer composition may replace the
 * adapter without changing the Organizations command or controller.
 */
export interface OrganizationPendingMemberApprovalGateway {
  approvePendingMember(
    input: OrganizationPendingMemberApprovalInput,
    context: OrganizationActionContext
  ): Promise<void>
}
