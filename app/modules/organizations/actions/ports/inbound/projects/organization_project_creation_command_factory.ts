import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type CreateOrganizationProjectCommand from '#modules/organizations/actions/commands/projects/create_organization_project_command'

/**
 * Inbound construction contract for current-organization project creation.
 */
export abstract class OrganizationProjectCreationCommandFactory {
  abstract make(context: OrganizationActionContext): CreateOrganizationProjectCommand
}
