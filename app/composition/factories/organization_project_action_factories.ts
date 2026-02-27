import type { OrganizationActionContext } from '#modules/organizations/projects/actions/action_context'
import CreateOrganizationProjectCommand from '#modules/organizations/projects/actions/command/create_organization_project_command'
import { OrganizationProjectCreationCommandFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_creation_command_factory'
import { OrganizationProjectDetailQueryFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_detail_query_factory'
import { OrganizationProjectQueryFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_query_factory'
import type { OrganizationProjectCreator } from '#modules/organizations/projects/actions/ports/outbound/organization_project_creator'
import type { OrganizationProjectDetailReader } from '#modules/organizations/projects/actions/ports/outbound/organization_project_detail_reader'
import type { OrganizationProjectListReader } from '#modules/organizations/projects/actions/ports/outbound/organization_project_list_reader'
import GetOrganizationProjectDetailQuery from '#modules/organizations/projects/actions/query/get_organization_project_detail_query'
import ListProjectsQuery from '#modules/organizations/projects/actions/query/list_projects_query'

export class ComposedOrganizationProjectCreationCommandFactory extends OrganizationProjectCreationCommandFactory {
  constructor(private readonly projects: OrganizationProjectCreator) {
    super()
  }

  make(context: OrganizationActionContext): CreateOrganizationProjectCommand {
    return new CreateOrganizationProjectCommand(context, this.projects)
  }
}

export class ComposedOrganizationProjectDetailQueryFactory extends OrganizationProjectDetailQueryFactory {
  constructor(private readonly projects: OrganizationProjectDetailReader) {
    super()
  }

  make(context: OrganizationActionContext): GetOrganizationProjectDetailQuery {
    return new GetOrganizationProjectDetailQuery(context, this.projects)
  }
}

export class ComposedOrganizationProjectQueryFactory extends OrganizationProjectQueryFactory {
  constructor(private readonly projects: OrganizationProjectListReader) {
    super()
  }

  makeListProjects(context: OrganizationActionContext): ListProjectsQuery {
    return new ListProjectsQuery(context, this.projects)
  }
}
