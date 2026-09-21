import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

const TestingMaintenanceController = () =>
  import('#modules/testing/controllers/testing-maintenance/testing_maintenance_controller')
const TestingCacheController = () =>
  import('#modules/testing/controllers/testing-cache/testing_cache_controller')
const TestingSearchRoleplayController = () =>
  import('#modules/testing/controllers/testing-search/testing_search_roleplay_controller')
const TestingOrgProjectSeedController = () =>
  import('#modules/testing/controllers/testing-seeds/testing_org_project_seed_controller')
const TestingTaskSeedController = () =>
  import('#modules/testing/controllers/testing-seeds/testing_task_seed_controller')
const TestingReviewSeedController = () =>
  import('#modules/testing/controllers/testing-seeds/testing_review_seed_controller')
const TestingDisputeSeedController = () =>
  import('#modules/testing/controllers/testing-seeds/testing_dispute_seed_controller')
const TestingAuditSeedController = () =>
  import('#modules/testing/controllers/testing-seeds/testing_audit_seed_controller')

router
  .group(() => {
    // Health & Maintenance & Auth-State
    router.get('/health', [TestingMaintenanceController, 'health']).as('testing.health.get')
    router.post('/health', [TestingMaintenanceController, 'health']).as('testing.health.post')
    router.get('/auth-state', [TestingMaintenanceController, 'authState'])
    router.post('/seed-cleanup', [TestingMaintenanceController, 'seedCleanup'])
    router.post('/drain-domain-event-outbox', [TestingMaintenanceController, 'drainDomainEventOutbox'])
    router.post('/revoke-saved-view-roleplay-membership', [
      TestingMaintenanceController,
      'revokeSavedViewRoleplayMembership',
    ])

    // Cache Testing
    router.post('/seed-cache-task-flow', [TestingCacheController, 'seedCacheTaskFlow'])
    router.post('/cache-task-list-generation', [TestingCacheController, 'taskListGeneration'])
    router.post('/cache-invalidation-status', [TestingCacheController, 'invalidationStatus'])
    router.post('/cache-invalidation-scope-status', [
      TestingCacheController,
      'invalidationScopeStatus',
    ])
    router.post('/cache-invalidation-scope-cleanup', [
      TestingCacheController,
      'invalidationScopeCleanup',
    ])

    // Search Discovery & Fault Roleplay
    router.post('/seed-search-alias-integrity-fault-roleplay', [
      TestingSearchRoleplayController,
      'seedSearchAliasIntegrityFaultRoleplay',
    ])
    router.post('/seed-search-cursor-clock-roleplay', [
      TestingSearchRoleplayController,
      'seedSearchCursorClockRoleplay',
    ])
    router.post('/seed-taxonomy-repair-roleplay', [
      TestingSearchRoleplayController,
      'seedTaxonomyRepairRoleplay',
    ])

    // Org, Project, Member & Planning Seeds
    router.post('/seed-e2e', [TestingOrgProjectSeedController, 'seedE2e'])
    router.post('/seed-project-member-flow', [
      TestingOrgProjectSeedController,
      'seedProjectMemberFlow',
    ])
    router.post('/seed-organization-invitation-flow', [
      TestingOrgProjectSeedController,
      'seedOrganizationInvitationFlow',
    ])
    router.post('/seed-organization-join-request-flow', [
      TestingOrgProjectSeedController,
      'seedOrganizationJoinRequestFlow',
    ])
    router.post('/seed-project-sprint-planning-flow', [
      TestingOrgProjectSeedController,
      'seedProjectSprintPlanningFlow',
    ])

    // Task & Marketplace Seeds
    router.post('/seed-task-submission-flow', [
      TestingTaskSeedController,
      'seedTaskSubmissionFlow',
    ])
    router.post('/seed-task-native-completion-flow', [
      TestingTaskSeedController,
      'seedTaskNativeCompletionFlow',
    ])
    router.post('/seed-task-create-flow', [TestingTaskSeedController, 'seedTaskCreateFlow'])
    router.post('/seed-marketplace-application-flow', [
      TestingTaskSeedController,
      'seedMarketplaceApplicationFlow',
    ])

    // Review, Reverse Review & Governance Seeds
    router.post('/seed-task-review-board-flow', [
      TestingReviewSeedController,
      'seedTaskReviewBoardFlow',
    ])
    router.post('/seed-task-review-observation-flow', [
      TestingReviewSeedController,
      'seedTaskReviewObservationFlow',
    ])
    router.post('/seed-sprint-review-governance-flow', [
      TestingReviewSeedController,
      'seedSprintReviewGovernanceFlow',
    ])
    router.post('/seed-sprint-reverse-review-board-flow', [
      TestingReviewSeedController,
      'seedSprintReverseReviewBoardFlow',
    ])
    router.post('/seed-review-lifecycle-flow', [
      TestingReviewSeedController,
      'seedReviewLifecycleFlow',
    ])

    // Dispute Seed
    router.post('/seed-review-dispute-exchange-flow', [
      TestingDisputeSeedController,
      'seedReviewDisputeExchangeFlow',
    ])

    // Audit Log Seed
    router.post('/seed-audit-log', [TestingAuditSeedController, 'seedAuditLog'])
  })
  .prefix('/api/testing')
  .use([middleware.bindHttpTransport('api-ops-internal'), middleware.testingRoutesApiKey()])
