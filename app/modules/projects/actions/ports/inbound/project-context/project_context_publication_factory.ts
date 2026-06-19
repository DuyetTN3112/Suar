import type ArchiveWorkPackageCommand from '#modules/projects/actions/commands/work-package/archive_work_package_command'
import type PublishProjectContextVersionCommand from '#modules/projects/actions/commands/project-context/publish_project_context_version_command'
import type PublishWorkPackageVersionCommand from '#modules/projects/actions/commands/work-package/publish_work_package_version_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export abstract class ProjectContextPublicationFactory {
  abstract makePublishProjectContextVersion(context: ProjectActionContext): Pick<PublishProjectContextVersionCommand, 'handle' | 'executeAndWrap'>
  abstract makePublishWorkPackageVersion(context: ProjectActionContext): Pick<PublishWorkPackageVersionCommand, 'handle' | 'executeAndWrap'>
  abstract makeArchiveWorkPackage(context: ProjectActionContext): Pick<ArchiveWorkPackageCommand, 'handle' | 'executeAndWrap'>
}
