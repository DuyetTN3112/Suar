import { OrganizationProjectCreatorAdapter } from './adapters/organization_project_creator_adapter.js'
import { projectLifecycleCommandFactory } from '#composition/projects/project-lifecycle/project_lifecycle_composition'

export const organizationProjectCreator = new OrganizationProjectCreatorAdapter(
  projectLifecycleCommandFactory
)
