import type { ApplicationService } from '@adonisjs/core/types'

import { projectContextPublicationFactory } from '#composition/projects/project-context/project_context_composition'
import { projectLifecycleCommandFactory } from '#composition/projects/project-lifecycle/project_lifecycle_composition'
import { projectMembershipCommandFactory } from '#composition/projects/project-membership/project_membership_composition'
import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectListRepository,
  projectMemberCandidateReader,
  projectMembershipRepository,
} from '#composition/projects/project-membership/project_persistence_composition'
import { projectQueryFactory } from '#composition/projects/project-query/project_query_composition'

import { ProjectContextPublicationFactory } from '#modules/projects/actions/ports/inbound/project-context/project_context_publication_factory'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
import { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import { ProjectDetailProjectionReader } from '#modules/projects/actions/ports/outbound/project_detail_projection_reader'
import { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import { ProjectListRepository } from '#modules/projects/actions/ports/outbound/project_list_repository'
import { ProjectMemberCandidateReader } from '#modules/projects/actions/ports/outbound/project_member_candidate_reader'
import { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'

export default class ProjectApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      ProjectLifecycleCommandFactory,
      () => projectLifecycleCommandFactory
    )
    this.app.container.singleton(
      ProjectMembershipCommandFactory,
      () => projectMembershipCommandFactory
    )
    this.app.container.singleton(
      ProjectContextPublicationFactory,
      () => projectContextPublicationFactory
    )
    this.app.container.singleton(ProjectQueryFactory, () => projectQueryFactory)
    this.app.container.singleton(ProjectLifecycleRepository, () => projectLifecycleRepository)
    this.app.container.singleton(ProjectMembershipRepository, () => projectMembershipRepository)
    this.app.container.singleton(ProjectListRepository, () => projectListRepository)
    this.app.container.singleton(
      ProjectDetailProjectionReader,
      () => projectDetailProjectionReader
    )
    this.app.container.singleton(
      ProjectMemberCandidateReader,
      () => projectMemberCandidateReader
    )
  }
}
