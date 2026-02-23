import emitter from '@adonisjs/core/services/emitter'

import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationMemberRemovedEvent } from '#modules/organizations/events/organization_events'

emitter.on('organization:member:removed', async (event: OrganizationMemberRemovedEvent) => {
  try {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const projectIds = await db
      .from('projects')
      .where('organization_id', event.organizationId)
      .select('id')

    if (projectIds.length === 0) {
      return
    }

    const ids = projectIds.map((project: { id: string }) => project.id)
    const deletedProjectMembers = Number(
      await db
        .from('project_members')
        .where('user_id', event.userId)
        .whereIn('project_id', ids)
        .delete()
    )

    if (deletedProjectMembers > 0) {
      loggerService.info('Removed user from org projects', {
        userId: event.userId,
        organizationId: event.organizationId,
        removedFromProjects: deletedProjectMembers,
      })
    }
  } catch (error) {
    loggerService.error('Project listener: org member removal cleanup failed', {
      userId: event.userId,
      organizationId: event.organizationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
