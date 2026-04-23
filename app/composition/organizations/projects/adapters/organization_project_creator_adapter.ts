import { DateTime } from 'luxon'

import type { OrganizationProjectCreator } from '#modules/organizations/actions/ports/outbound/projects/organization_project_creator'
import type { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
import { CreateProjectDTO } from '#modules/projects/public_contracts/create_project_dto'
import { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'

function toProjectVisibility(
  visibility: Exclude<
    Parameters<OrganizationProjectCreator['create']>[0]['visibility'],
    undefined
  >
): ProjectVisibility {
  switch (visibility) {
    case 'public':
      return ProjectVisibility.PUBLIC
    case 'private':
      return ProjectVisibility.PRIVATE
    case 'team':
      return ProjectVisibility.TEAM
    default:
      return visibility
  }
}

export class OrganizationProjectCreatorAdapter implements OrganizationProjectCreator {
  constructor(private readonly lifecycleCommands: ProjectLifecycleCommandFactory) {}

  async create(
    input: Parameters<OrganizationProjectCreator['create']>[0],
    context: Parameters<OrganizationProjectCreator['create']>[1]
  ): ReturnType<OrganizationProjectCreator['create']> {
    const dto = CreateProjectDTO.fromValidatedPayload(
      {
        name: input.name,
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.status === undefined ? {} : { status: input.status }),
        start_date: input.start_date ? DateTime.fromISO(input.start_date) : null,
        end_date: input.end_date ? DateTime.fromISO(input.end_date) : null,
        manager_id: input.manager_id ?? null,
        ...(input.visibility === undefined
          ? {}
          : { visibility: toProjectVisibility(input.visibility) }),
      },
      input.organization_id
    )

    return this.lifecycleCommands.makeCreate(context).handle(dto)
  }
}
