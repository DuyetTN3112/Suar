import emitter from '@adonisjs/core/services/emitter'

import loggerService from '#modules/logger/public_contracts/logger_service'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import type { OrganizationMemberRemovedEvent } from '#modules/organizations/events/organization_events'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import { buildProjectMembershipEvent } from '#modules/projects/observability/project_event_factory'

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
      platformOperationalLogger.log(
        'info',
        buildProjectMembershipEvent(makeSystemProjectActionContext(event.removedBy), {
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ORG_CLEANUP_COMPLETED,
          eventFamily: 'membership',
          subsystem: 'project_membership_listener',
          workflow: 'project_member_org_cleanup',
          stage: 'completed',
          outcome: 'success',
          projectId: ids[0] ?? 'organization-project-membership',
          targetType: 'project_member_cleanup',
          targetId: event.userId,
          organizationId: event.organizationId,
          change: {
            removed_from_projects: deletedProjectMembers,
            project_ids: ids,
          },
          retentionClass: 'transient_runtime',
        })
      )
      loggerService.info('Removed user from org projects', {
        userId: event.userId,
        organizationId: event.organizationId,
        removedFromProjects: deletedProjectMembers,
      })
    }
  } catch (error) {
    platformOperationalLogger.log(
      'warn',
      buildProjectMembershipEvent(makeSystemProjectActionContext(event.removedBy), {
        eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ORG_CLEANUP_FAILED,
        eventFamily: 'membership',
        subsystem: 'project_membership_listener',
        workflow: 'project_member_org_cleanup',
        stage: 'failed',
        outcome: 'failure',
        projectId: 'organization-project-membership',
        targetType: 'project_member_cleanup',
        targetId: event.userId,
        organizationId: event.organizationId,
        error,
        retentionClass: 'transient_runtime',
      })
    )
    loggerService.error('Project listener: org member removal cleanup failed', {
      userId: event.userId,
      organizationId: event.organizationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
