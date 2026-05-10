import { projectTransactionRunner } from '#composition/projects/project-membership/project_persistence_composition'
import ArchiveWorkPackageCommand from '#modules/projects/actions/commands/work-package/archive_work_package_command'
import PublishProjectContextVersionCommand from '#modules/projects/actions/commands/project-context/publish_project_context_version_command'
import PublishWorkPackageVersionCommand from '#modules/projects/actions/commands/work-package/publish_work_package_version_command'
import { ProjectContextPublicationFactory } from '#modules/projects/actions/ports/inbound/project-context/project_context_publication_factory'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { CacheProjectContextInvalidator } from '#modules/projects/infra/adapters/project-context/cache_project_context_invalidator'
import { LucidProjectContextAuthorizationReader } from '#modules/projects/infra/adapters/project-context/lucid_project_context_authorization_reader'
import { LucidProjectContextChangeStager } from '#modules/projects/infra/adapters/project-context/lucid_project_context_change_stager'
import { LucidProjectContextVersionRepository } from '#modules/projects/infra/adapters/project-context/lucid_project_context_version_repository'
import { LucidWorkPackageChangeStager } from '#modules/projects/infra/adapters/work-package/lucid_work_package_change_stager'
import { LucidWorkPackageRepository } from '#modules/projects/infra/adapters/work-package/lucid_work_package_repository'
import { NodeProjectContextContentHasher } from '#modules/projects/infra/adapters/project-context/node_project_context_content_hasher'

const contextVersionRepository = new LucidProjectContextVersionRepository()
const workPackageRepository = new LucidWorkPackageRepository()
const authorizationReader = new LucidProjectContextAuthorizationReader()
const contextChangeStager = new LucidProjectContextChangeStager()
const workPackageChangeStager = new LucidWorkPackageChangeStager()
const cacheInvalidator = new CacheProjectContextInvalidator()
const contentHasher = new NodeProjectContextContentHasher()

export function makePublishProjectContextVersionCommand(
  context: ProjectActionContext
): PublishProjectContextVersionCommand {
  return new PublishProjectContextVersionCommand(
    context,
    projectTransactionRunner,
    contextVersionRepository,
    authorizationReader,
    contextChangeStager,
    cacheInvalidator,
    contentHasher
  )
}

export function makePublishWorkPackageVersionCommand(
  context: ProjectActionContext
): PublishWorkPackageVersionCommand {
  return new PublishWorkPackageVersionCommand(
    context,
    projectTransactionRunner,
    workPackageRepository,
    authorizationReader,
    workPackageChangeStager,
    cacheInvalidator,
    contentHasher
  )
}

export function makeArchiveWorkPackageCommand(
  context: ProjectActionContext
): ArchiveWorkPackageCommand {
  return new ArchiveWorkPackageCommand(
    context,
    projectTransactionRunner,
    workPackageRepository,
    authorizationReader,
    workPackageChangeStager,
    cacheInvalidator
  )
}

class ComposedProjectContextPublicationFactory extends ProjectContextPublicationFactory {
  makePublishProjectContextVersion = makePublishProjectContextVersionCommand
  makePublishWorkPackageVersion = makePublishWorkPackageVersionCommand
  makeArchiveWorkPackage = makeArchiveWorkPackageCommand
}

export const projectContextPublicationFactory = new ComposedProjectContextPublicationFactory()
