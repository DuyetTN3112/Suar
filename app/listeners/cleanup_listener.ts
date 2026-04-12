import emitter from '@adonisjs/core/services/emitter'

import type { OrganizationMemberRemovedEvent } from '#events/event_types'
import loggerService from '#infra/logger/logger_service'

/**
 * Cleanup Listener — Sprint 7
 *
 * When a member is removed from an organization:
 *   1. Remove from all projects in that organization
 *   2. Remove from all conversations in that organization
 *
 * This replaces the MySQL trigger: after_organization_user_update
 * which removed users from conversations when their org status changed.
 */
emitter.on('organization:member:removed', async (event: OrganizationMemberRemovedEvent) => {
  try {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    // 1. Remove from all projects in this organization
    const projectIds = await db
      .from('projects')
      .where('organization_id', event.organizationId)
      .select('id')

    if (projectIds.length > 0) {
      const ids = projectIds.map((p: { id: string }) => p.id)
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
    }

    const conversationTables = await db
      .from('information_schema.tables')
      .where('table_schema', 'public')
      .whereIn('table_name', ['conversations', 'conversation_participants'])
      .select('table_name')

    const hasConversationTables = conversationTables.length === 2

    // 2. Remove from all conversations in this organization when the messaging tables exist
    if (hasConversationTables) {
      const conversationIds = await db
        .from('conversation_participants as cp')
        .join('conversations as c', 'cp.conversation_id', 'c.id')
        .where('cp.user_id', event.userId)
        .where('c.organization_id', event.organizationId)
        .select('cp.conversation_id')

      if (conversationIds.length > 0) {
        const ids = conversationIds.map((c: { conversation_id: string }) => c.conversation_id)
        const deletedParticipants = Number(
          await db
            .from('conversation_participants')
            .where('user_id', event.userId)
            .whereIn('conversation_id', ids)
            .delete()
        )

        if (deletedParticipants > 0) {
          loggerService.info('Removed user from org conversations', {
            userId: event.userId,
            organizationId: event.organizationId,
            removedFromConversations: deletedParticipants,
          })
        }
      }
    }

    loggerService.debug('Organization member removal cleanup completed', {
      userId: event.userId,
      organizationId: event.organizationId,
      removedBy: event.removedBy,
    })
  } catch (error) {
    loggerService.error('CleanupListener: org member removal cleanup failed', {
      userId: event.userId,
      organizationId: event.organizationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
