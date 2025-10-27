import emitter from '@adonisjs/core/services/emitter'

import type {
  OrganizationCreatedEvent,
  OrganizationDeletedEvent,
  OrganizationUpdatedEvent,
} from '#modules/organizations/events/organization_events'
import type {
  ProjectCreatedEvent,
  ProjectDeletedEvent,
  ProjectUpdatedEvent,
} from '#modules/projects/events/project_events'
import { searchPublicApi } from '#modules/search/public_contracts/search_public_api'
import type { SkillScoreUpdatedEvent } from '#modules/skills/events/skill_events'
import type {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from '#modules/tasks/events/task_events'
import type {
  UserApprovedEvent,
  UserDeactivatedEvent,
  UserProfileUpdatedEvent,
  UserRegisteredEvent,
} from '#modules/users/events/user_events'

emitter.on('user:registered', async (event: UserRegisteredEvent) => {
  await searchPublicApi.reindexUserDirectoryDocumentQuietly(event.userId)
})

emitter.on('user:approved', async (event: UserApprovedEvent) => {
  await searchPublicApi.reindexUserDirectoryDocumentQuietly(event.userId)
})

emitter.on('user:deactivated', async (event: UserDeactivatedEvent) => {
  await searchPublicApi.reindexUserDirectoryDocumentQuietly(event.userId)
  await searchPublicApi.reindexTalentDocumentQuietly(event.userId)
})

emitter.on('user:profile:updated', async (event: UserProfileUpdatedEvent) => {
  await searchPublicApi.reindexUserDirectoryDocumentQuietly(event.userId)
  await searchPublicApi.reindexTalentDocumentQuietly(event.userId)
})

emitter.on('skill:score:updated', async (event: SkillScoreUpdatedEvent) => {
  await searchPublicApi.reindexTalentDocumentQuietly(event.userId)
})

emitter.on('organization:created', async (event: OrganizationCreatedEvent) => {
  await searchPublicApi.reindexOrganizationDocumentQuietly(event.organizationId)
})

emitter.on('organization:updated', async (event: OrganizationUpdatedEvent) => {
  await searchPublicApi.reindexOrganizationDocumentQuietly(event.organizationId)
})

emitter.on('organization:deleted', async (event: OrganizationDeletedEvent) => {
  await searchPublicApi.removeOrganizationDocumentQuietly(event.organizationId)
})

emitter.on('project:created', async (event: ProjectCreatedEvent) => {
  await searchPublicApi.reindexProjectDocumentQuietly(event.projectId)
})

emitter.on('project:updated', async (event: ProjectUpdatedEvent) => {
  await searchPublicApi.reindexProjectDocumentQuietly(event.projectId)
})

emitter.on('project:deleted', async (event: ProjectDeletedEvent) => {
  await searchPublicApi.removeProjectDocumentQuietly(event.projectId)
})

emitter.on('task:created', async (event: TaskCreatedEvent) => {
  await searchPublicApi.reindexTaskDocumentQuietly(event.taskId)
})

emitter.on('task:updated', async (event: TaskUpdatedEvent) => {
  await searchPublicApi.reindexTaskDocumentQuietly(event.taskId)
})

emitter.on('task:deleted', async (event: TaskDeletedEvent) => {
  await searchPublicApi.removeTaskDocumentQuietly(event.taskId)
})
