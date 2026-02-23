import emitter from '@adonisjs/core/services/emitter'

import loggerService from '#modules/logger/public_contracts/application_logger'
import type { OrganizationCreatedEvent } from '#modules/organizations/directory/public_contracts/organization_events'
import type { ProjectCreatedEvent } from '#modules/projects/public_contracts/project_events'

emitter.on('organization:created', (event: OrganizationCreatedEvent) => {
  loggerService.debug('Organization created event', {
    orgId: event.organizationId,
    ownerId: event.ownerId,
    ip: event.ip,
  })
})

emitter.on('project:created', (event: ProjectCreatedEvent) => {
  loggerService.debug('Project created event', {
    projectId: event.projectId,
    creatorId: event.creatorId,
    organizationId: event.organizationId,
  })
})
