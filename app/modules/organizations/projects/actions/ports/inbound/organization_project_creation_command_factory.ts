import type { OrganizationActionContext } from '#modules/organizations/projects/actions/action_context'
import type CreateOrganizationProjectCommand from '#modules/organizations/projects/actions/command/create_organization_project_command'

/**
 * Inbound construction contract for current-organization project creation.
 */
export abstract class OrganizationProjectCreationCommandFactory {
  abstract make(context: OrganizationActionContext): CreateOrganizationProjectCommand
}
