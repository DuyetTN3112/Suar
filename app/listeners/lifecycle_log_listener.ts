import emitter from '@adonisjs/core/services/emitter'

import type { OrganizationCreatedEvent, ProjectCreatedEvent } from '#events/event_types'
import loggerService from '#infra/logger/logger_service'

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
