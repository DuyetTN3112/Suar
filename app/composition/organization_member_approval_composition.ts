import { OrganizationPendingMemberApprovalAdapter } from './adapters/organization_pending_member_approval_adapter.js'
import { ComposedOrganizationMemberApprovalCommandFactory } from './factories/organization_member_action_factories.js'

const pendingMemberApprovalGateway = new OrganizationPendingMemberApprovalAdapter()

export const organizationMemberApprovalCommandFactory =
  new ComposedOrganizationMemberApprovalCommandFactory(pendingMemberApprovalGateway)
