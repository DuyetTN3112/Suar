import { OrganizationProjectCreatorAdapter } from './adapters/organization_project_creator_adapter.js'
import { projectLifecycleCommandFactory } from './project_lifecycle_composition.js'

export const organizationProjectCreator = new OrganizationProjectCreatorAdapter(
  projectLifecycleCommandFactory
)
