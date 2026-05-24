import type loggerService from '#modules/logger/public_contracts/application_logger'
import type { OrganizationCreatedEvent } from '#modules/organizations/public_contracts/directory/organization_events'
import type { ProjectCreatedEvent } from '#modules/projects/public_contracts/project_events'

export interface LifecycleLogListenerDependencies {
  logger: Pick<typeof loggerService, 'debug'>
}

export function handleOrganizationCreatedLifecycleLog(
  event: OrganizationCreatedEvent,
  dependencies: LifecycleLogListenerDependencies
): void {
  dependencies.logger.debug('Organization created event', {
    orgId: event.organizationId,
    ownerId: event.ownerId,
    ip: event.ip,
  })
}

export function handleProjectCreatedLifecycleLog(
  event: ProjectCreatedEvent,
  dependencies: LifecycleLogListenerDependencies
): void {
  dependencies.logger.debug('Project created event', {
    projectId: event.projectId,
    creatorId: event.creatorId,
    organizationId: event.organizationId,
  })
}
