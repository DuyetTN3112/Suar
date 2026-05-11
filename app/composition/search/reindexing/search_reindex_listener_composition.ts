import emitter from '@adonisjs/core/services/emitter'

import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import type {
  OrganizationCreatedEvent,
  OrganizationDeletedEvent,
  OrganizationUpdatedEvent,
} from '#modules/organizations/public_contracts/directory/organization_events'
import { PostgresSearchProjectionDeliveryReceiptWriter } from '#modules/search/infra/adapters/projection-generation/postgres_search_projection_delivery_receipt_writer'
import {
  handleProjectLifecycleChanged,
  handleTalentReindexRequested,
  handleUserAccountLifecycleChanged,
  handleUserProfileChanged,
  type ProjectLifecycleSearchDependencies,
  type TalentReindexRequestedDependencies,
  type UserLifecycleSearchDependencies,
} from '#modules/search/listeners/search_reindex_listener'
import type { SkillScoreUpdatedEvent } from '#modules/skills/public_contracts/skill_events'
import type {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from '#modules/tasks/public_contracts/task_events'

const talentDependencies: TalentReindexRequestedDependencies = {
  isSearchEnabled: () => searchPublicApi.isEnabled(),
  reindexTalentDocument: (userId, signal) =>
    searchPublicApi.reindexTalentDocument(userId, signal),
  reindexTalentDocumentFenced: (userId, context) =>
    searchPublicApi.reindexTalentDocumentFenced(userId, context),
  acknowledgeProjectionReceipt: (sourceEventId) =>
    talentProjectionReceiptWriter.acknowledge(sourceEventId),
}

const userLifecycleDependencies: UserLifecycleSearchDependencies = {
  isSearchEnabled: () => searchPublicApi.isEnabled(),
  reindexUserDirectoryDocumentFenced: (userId, context) =>
    searchPublicApi.reindexUserDirectoryDocumentFenced(userId, context),
  reindexTalentDocumentFenced: (userId, context) =>
    searchPublicApi.reindexTalentDocumentFenced(userId, context),
}

const projectLifecycleDependencies: ProjectLifecycleSearchDependencies = {
  isSearchEnabled: () => searchPublicApi.isEnabled(),
  reindexProjectDocument: (projectId, context) =>
    searchPublicApi.reindexProjectDocument(projectId, context),
  removeProjectDocument: (projectId, context) =>
    searchPublicApi.removeProjectDocument(projectId, context),
}

const talentProjectionReceiptWriter = new PostgresSearchProjectionDeliveryReceiptWriter()

emitter.on('skill:score:updated', async (event: SkillScoreUpdatedEvent) => {
  await searchPublicApi.reindexTalentDocumentQuietly(event.userId)
})

emitter.on('search:talent-reindex-requested', (event) =>
  handleTalentReindexRequested(event, talentDependencies)
)
emitter.on('user:account:lifecycle:changed:v1', (event) =>
  handleUserAccountLifecycleChanged(event, userLifecycleDependencies)
)
emitter.on('user:profile:changed:v1', (event) =>
  handleUserProfileChanged(event, userLifecycleDependencies)
)
emitter.on('project:lifecycle:changed:v1', (event) =>
  handleProjectLifecycleChanged(event, projectLifecycleDependencies)
)

emitter.on('organization:created', async (event: OrganizationCreatedEvent) => {
  await searchPublicApi.reindexOrganizationDocumentQuietly(event.organizationId)
})
emitter.on('organization:updated', async (event: OrganizationUpdatedEvent) => {
  await searchPublicApi.reindexOrganizationDocumentQuietly(event.organizationId)
})
emitter.on('organization:deleted', async (event: OrganizationDeletedEvent) => {
  await searchPublicApi.removeOrganizationDocumentQuietly(event.organizationId)
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
