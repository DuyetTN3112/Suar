import emitter from '@adonisjs/core/services/emitter'

import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationCreatedEvent } from '#modules/organizations/events/organization_events'
import type { ProjectCreatedEvent } from '#modules/projects/events/project_events'

emitter.on('organization:created', (event: OrganizationCreatedEvent) => {
  loggerService.info('Organization created event', {
    orgId: event.organizationId,
    ownerId: event.ownerId,
    ip: event.ip,
  })
})

emitter.on('project:created', (event: ProjectCreatedEvent) => {
  loggerService.info('Project created event', {
    projectId: event.projectId,
    creatorId: event.creatorId,
    organizationId: event.organizationId,
  })
})
