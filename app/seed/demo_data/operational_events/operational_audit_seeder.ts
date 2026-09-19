import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { OrgKey, ProjectKey, SeedContext, UserKey } from '../types.js'

import type { SeedOperationalEventRuntime } from './operational_notification_seeder.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'

interface DemoAuditSpec {
  actorId: string
  actorOrganizationId: string | null
  actorRoleSurface: string
  action: string
  eventName: string
  eventFamily: string
  module: string
  entityType: string
  entityId: string
  targetOrganizationId?: string | null
  affectedUserIds?: string[]
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  daysAgo: number
}

export async function seedOperationalAudits(
  runtime: SeedOperationalEventRuntime,
  context: SeedContext,
  trx: TransactionClientContract
): Promise<void> {
  const ownerPendingTask = runtime.requireValue(
    context.tasks['owner-marketplace-pending'],
    'operational-task:owner-marketplace-pending'
  )
  const ownerApprovedTask = runtime.requireValue(
    context.tasks['owner-marketplace-approved'],
    'operational-task:owner-marketplace-approved'
  )
  const ownerRejectedTask = runtime.requireValue(
    context.tasks['owner-marketplace-rejected'],
    'operational-task:owner-marketplace-rejected'
  )
  const ownerDisputedTask = runtime.requireValue(
    context.tasks['owner-review-dispute-case'],
    'operational-task:owner-review-dispute-case'
  )
  const ownerCompletedTask = runtime.requireValue(
    context.tasks['owner-profile-scoring-loop'],
    'operational-task:owner-profile-scoring-loop'
  )
  const ownerSnapshotId = runtime.requireValue(
    context.snapshots['owner'],
    'operational-snapshot:owner'
  )
  const memberSnapshotId = runtime.requireValue(
    context.snapshots['member'],
    'operational-snapshot:member'
  )

  const audits: DemoAuditSpec[] = [
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'organization_owner',
      action: 'organization_workspace_initialized',
      eventName: 'organization.workspace.initialized',
      eventFamily: 'organization.lifecycle',
      module: 'organizations',
      entityType: 'organization',
      entityId: context.organizations.orgA.id,
      targetOrganizationId: context.organizations.orgA.id,
      newValues: {
        primary_workspace: context.organizations.orgA.slug,
        secondary_membership: context.organizations.orgB.slug,
      },
      daysAgo: 5,
    },
    {
      actorId: context.users.superadmin.id,
      actorOrganizationId: null,
      actorRoleSurface: 'system_admin',
      action: 'admin_access_granted',
      eventName: 'admin.access.granted',
      eventFamily: 'admin.access',
      module: 'admin',
      entityType: 'user',
      entityId: context.users.superadmin.id,
      newValues: { system_role: 'superadmin', redirect_target: '/admin' },
      daysAgo: 5,
    },
    {
      actorId: context.users.member.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'user_profile',
      action: 'publish_profile_snapshot',
      eventName: 'user.profile_snapshot.published',
      eventFamily: 'user.profile',
      module: 'users',
      entityType: 'user',
      entityId: context.users.member.id,
      newValues: { snapshot_id: memberSnapshotId, is_public: true },
      daysAgo: 2,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'organization_owner',
      action: 'create_project',
      eventName: 'project.created',
      eventFamily: 'project.lifecycle',
      module: 'projects',
      entityType: 'project',
      entityId: context.projects.orgAPlatform.id,
      targetOrganizationId: context.organizations.orgA.id,
      newValues: { organization_id: context.organizations.orgA.id },
      daysAgo: 5,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgD.id,
      actorRoleSurface: 'marketplace_applicant',
      action: 'apply_marketplace_task',
      eventName: 'task.application.submitted',
      eventFamily: 'task.marketplace',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerPendingTask.id,
      targetOrganizationId: context.organizations.orgD.id,
      newValues: { application_status: 'pending', source: 'public_listing' },
      daysAgo: 2,
    },
    {
      actorId: context.users.externalContributorTwo.id,
      actorOrganizationId: context.organizations.orgE.id,
      actorRoleSurface: 'organization_owner',
      action: 'process_marketplace_application',
      eventName: 'task.application.approved',
      eventFamily: 'task.marketplace',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerApprovedTask.id,
      targetOrganizationId: context.organizations.orgE.id,
      affectedUserIds: [context.users.owner.id],
      oldValues: { application_status: 'pending' },
      newValues: {
        application_status: 'approved',
        assignment_type: 'external_contributor',
      },
      daysAgo: 1,
    },
    {
      actorId: context.users.externalContributorOne.id,
      actorOrganizationId: context.organizations.orgD.id,
      actorRoleSurface: 'organization_owner',
      action: 'process_marketplace_application',
      eventName: 'task.application.rejected',
      eventFamily: 'task.marketplace',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerRejectedTask.id,
      targetOrganizationId: context.organizations.orgD.id,
      affectedUserIds: [context.users.owner.id],
      oldValues: { application_status: 'pending' },
      newValues: {
        application_status: 'rejected',
        rejection_reason: 'Cần thêm bằng chứng thiết kế hệ thống giao diện ở quy mô sản phẩm.',
      },
      daysAgo: 1,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'task_assignee',
      action: 'complete_task',
      eventName: 'task.completed',
      eventFamily: 'task.lifecycle',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerCompletedTask.id,
      targetOrganizationId: context.organizations.orgA.id,
      oldValues: { status: 'in_testing' },
      newValues: { status: 'done' },
      daysAgo: 2,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'reviewee',
      action: 'dispute_review',
      eventName: 'review.dispute.created',
      eventFamily: 'review.governance',
      module: 'reviews',
      entityType: 'review_dispute',
      entityId: ownerDisputedTask.id,
      targetOrganizationId: context.organizations.orgA.id,
      oldValues: { review_status: 'completed' },
      newValues: { review_status: 'admin_reviewing' },
      daysAgo: 1,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'user_profile',
      action: 'publish_profile_snapshot',
      eventName: 'user.profile_snapshot.published',
      eventFamily: 'user.profile',
      module: 'users',
      entityType: 'user',
      entityId: context.users.owner.id,
      affectedUserIds: [context.users.owner.id],
      newValues: { snapshot_id: ownerSnapshotId, is_public: true },
      daysAgo: 0,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgB.id,
      actorRoleSurface: 'organization_member',
      action: 'switch_organization_context',
      eventName: 'organization.context.switched',
      eventFamily: 'organization.membership',
      module: 'organizations',
      entityType: 'organization',
      entityId: context.organizations.orgB.id,
      targetOrganizationId: context.organizations.orgB.id,
      oldValues: { organization: context.organizations.orgA.slug, role: 'org_owner' },
      newValues: { organization: context.organizations.orgB.slug, role: 'org_member' },
      daysAgo: 1,
    },
    {
      actorId: context.users.superadmin.id,
      actorOrganizationId: null,
      actorRoleSurface: 'system_admin',
      action: 'subscription_catalog_reviewed',
      eventName: 'subscription.catalog.reviewed',
      eventFamily: 'subscription.governance',
      module: 'subscriptions',
      entityType: 'user',
      entityId: context.users.superadmin.id,
      newValues: { display_packages: ['pro', 'promax'], storage_packages: ['pro', 'enterprise'] },
      daysAgo: 0,
    },
  ]

  const expandedOrganizations: {
    organization: OrgKey
    owner: UserKey
  }[] = [
    { organization: 'orgF', owner: 'backendSpecialist' },
    { organization: 'orgG', owner: 'civicServiceLead' },
    { organization: 'orgH', owner: 'agriProductOwner' },
    { organization: 'orgI', owner: 'securityOwner' },
    { organization: 'orgJ', owner: 'commerceOwner' },
  ]
  for (const [index, item] of expandedOrganizations.entries()) {
    const organization = context.organizations[item.organization]
    audits.push({
      actorId: context.users[item.owner].id,
      actorOrganizationId: organization.id,
      actorRoleSurface: 'organization_owner',
      action: 'organization_workspace_initialized',
      eventName: 'organization.workspace.initialized',
      eventFamily: 'organization.lifecycle',
      module: 'organizations',
      entityType: 'organization',
      entityId: organization.id,
      targetOrganizationId: organization.id,
      newValues: { workspace: organization.slug, narrative_pack: 'expanded_data_train_inspired' },
      daysAgo: 8 - index,
    })
  }

  const expandedProjectAuditActors: Partial<Record<ProjectKey, UserKey>> = {
    orgFReviewOps: 'backendSpecialist',
    orgFDeveloperExperience: 'frontendSpecialist',
    orgFReleaseReliability: 'devopsEngineer',
    orgGCitizenPortal: 'civicServiceLead',
    orgGComplaintResolution: 'civicServiceLead',
    orgGAccessibilityAnalytics: 'dataAnalyst',
    orgHFarmOperations: 'agriProductOwner',
    orgHIotFieldMonitoring: 'mobileEngineer',
    orgHKnowledgeHub: 'agriProductOwner',
    orgISecureDelivery: 'securityOwner',
    orgIIncidentReadiness: 'securityOwner',
    orgIDependencyGovernance: 'securityEngineer',
    orgJSustainableCommerce: 'commerceOwner',
    orgJCustomerInsight: 'productResearcher',
    orgJCreatorMarketplace: 'communityManager',
  }
  for (const [projectKey, actorKey] of Object.entries(expandedProjectAuditActors) as [
    ProjectKey,
    UserKey,
  ][]) {
    const project = context.projects[projectKey]
    audits.push({
      actorId: context.users[actorKey].id,
      actorOrganizationId: project.organizationId,
      actorRoleSurface: 'project_owner',
      action: 'create_project',
      eventName: 'project.created',
      eventFamily: 'project.lifecycle',
      module: 'projects',
      entityType: 'project',
      entityId: project.id,
      targetOrganizationId: project.organizationId,
      newValues: {
        organization_id: project.organizationId,
        content_provenance: 'curated_from_training_taxonomy',
      },
      daysAgo: 4,
    })
  }

  for (const audit of audits) {
    await auditPublicApi.write(
      {
        userId: audit.actorId,
        ip: '127.0.0.1',
        userAgent: 'seed:data:runtime-derived-v2',
        organizationId: audit.actorOrganizationId,
        actorRoleSurface: audit.actorRoleSurface,
        requestId: `seed-demo:${audit.eventName}`,
        traceId: 'seed-demo-runtime-derived-v2',
        workflowId: audit.eventFamily,
      },
      {
        user_id: audit.actorId,
        action: audit.action,
        event_name: audit.eventName,
        event_family: audit.eventFamily,
        module: audit.module,
        outcome: 'success',
        entity_type: audit.entityType,
        entity_id: audit.entityId,
        target_type: audit.entityType,
        target_id: audit.entityId,
        ...(audit.targetOrganizationId !== undefined
          ? { target_organization_id: audit.targetOrganizationId }
          : {}),
        ...(audit.affectedUserIds ? { affected_user_ids: audit.affectedUserIds } : {}),
        ...(audit.oldValues !== undefined ? { old_values: audit.oldValues } : {}),
        ...(audit.newValues !== undefined ? { new_values: audit.newValues } : {}),
        source_occurred_at: new Date(runtime.isoDaysAgo(audit.daysAgo)),
        retention_class: 'demo_operational_evidence_2y',
        critical: true,
      },
      trx
    )
  }
}
