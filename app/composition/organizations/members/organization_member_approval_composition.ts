import { OrganizationPendingMemberApprovalAdapter } from './adapters/organization_pending_member_approval_adapter.js'
import { ComposedOrganizationMemberApprovalCommandFactory } from '#composition/organizations/members/factories/organization_member_action_factories'

const pendingMemberApprovalGateway = new OrganizationPendingMemberApprovalAdapter()

export const organizationMemberApprovalCommandFactory =
  new ComposedOrganizationMemberApprovalCommandFactory(pendingMemberApprovalGateway)
