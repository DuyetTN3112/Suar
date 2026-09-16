import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  countPendingReverseReviewWorkflows,
  countPendingTaskReviews,
  findAssignerTargets,
  findEligibleReviewerIds,
  findManagerTargetEvidence,
} from './lucid_sprint_review_target_reader.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewSprintPackageMutationPersistenceSession,
  ReviewSprintPackageMutationProject,
  ReviewSprintPackageMutationSprint,
  ReviewSprintPackageRecord,
} from '#modules/reviews/actions/ports/outbound/review_sprint_package_mutation_unit_of_work'

interface SprintRow {
  id: string
  organization_id: string
  project_id: string
  name: string
  status: string
  starts_at: string | Date
  ends_at: string | Date
}

function mapSprint(row: SprintRow): ReviewSprintPackageMutationSprint {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    name: row.name,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }
}

export class LucidReviewSprintPackageMutationSession implements ReviewSprintPackageMutationPersistenceSession {
  constructor(
    private readonly transaction: TransactionClientContract,
    private readonly notificationFanout: NotificationFanoutStagerContract
  ) {}

  async loadSprintForUpdate(
    sprintId: string,
    projectId?: string
  ): Promise<ReviewSprintPackageMutationSprint | null> {
    let query = this.transaction.from('project_sprints').where('id', sprintId)
    if (projectId !== undefined) {
      query = query.where('project_id', projectId)
    }
    const sprint = (await query.forUpdate().first()) as SprintRow | undefined

    return sprint ? mapSprint(sprint) : null
  }

  async loadSprint(sprintId: string): Promise<ReviewSprintPackageMutationSprint | null> {
    const sprint = (await this.transaction
      .from('project_sprints')
      .where('id', sprintId)
      .first()) as SprintRow | undefined

    return sprint ? mapSprint(sprint) : null
  }

  async loadProject(projectId: string): Promise<ReviewSprintPackageMutationProject | null> {
    const project = (await this.transaction
      .from('projects')
      .where('id', projectId)
      .whereNull('deleted_at')
      .select('owner_id', 'manager_id')
      .first()) as { owner_id: string | null; manager_id: string | null } | undefined

    return project
      ? {
          ownerId: project.owner_id,
          managerId: project.manager_id,
        }
      : null
  }

  async loadPackageForUpdate(packageId: string): Promise<ReviewSprintPackageRecord | null> {
    const reviewPackage = (await this.transaction
      .from('sprint_review_packages')
      .where('id', packageId)
      .forUpdate()
      .select('id', 'sprint_id', 'reviewer_id', 'status')
      .first()) as
      | { id: string; sprint_id: string; reviewer_id: string; status: string }
      | undefined

    return reviewPackage
      ? {
          id: reviewPackage.id,
          sprintId: reviewPackage.sprint_id,
          reviewerId: reviewPackage.reviewer_id,
          status: reviewPackage.status,
        }
      : null
  }

  async findActorProjectRole(projectId: string, actorId: string): Promise<string | null> {
    const member = (await this.transaction
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', actorId)
      .select('project_role')
      .first()) as { project_role: string } | undefined

    return member?.project_role ?? null
  }

  async findPreviousSprintId(
    projectId: string,
    endingBeforeOrAt: string | Date,
    excludingSprintId: string
  ): Promise<string | null> {
    const previousSprint = (await this.transaction
      .from('project_sprints')
      .where('project_id', projectId)
      .where('ends_at', '<=', endingBeforeOrAt)
      .whereNot('id', excludingSprintId)
      .orderBy('ends_at', 'desc')
      .select('id')
      .first()) as { id: string } | undefined

    return previousSprint?.id ?? null
  }

  countPendingReverseReviewWorkflows(sprintId: string): Promise<number> {
    return countPendingReverseReviewWorkflows(this.transaction, sprintId)
  }

  countPendingTaskReviews(sprintId: string): Promise<number> {
    return countPendingTaskReviews(this.transaction, sprintId)
  }

  findEligibleReviewerIds(projectId: string, sprintId: string): Promise<string[]> {
    return findEligibleReviewerIds(this.transaction, projectId, sprintId)
  }

  async markReviewOpen(sprintId: string, actorId: string, openedAt: Date): Promise<void> {
    await this.transaction.from('project_sprints').where('id', sprintId).update({
      status: 'review_open',
      closed_by: actorId,
      review_opened_at: openedAt,
      updated_at: openedAt,
    })
  }

  async listPackages(
    sprintId: string,
    reviewerIds: readonly string[]
  ): Promise<Array<{ id: string; reviewerId: string }>> {
    if (reviewerIds.length === 0) return []

    const packages = (await this.transaction
      .from('sprint_review_packages')
      .where('sprint_id', sprintId)
      .whereIn('reviewer_id', Array.from(reviewerIds))
      .select('id', 'reviewer_id')) as Array<{ id: string; reviewer_id: string }>

    return packages.map((reviewPackage) => ({
      id: reviewPackage.id,
      reviewerId: reviewPackage.reviewer_id,
    }))
  }

  async createReviewPackages(
    rows: Parameters<ReviewSprintPackageMutationPersistenceSession['createReviewPackages']>[0]
  ): Promise<void> {
    if (rows.length === 0) return

    await this.transaction.table('sprint_review_packages').multiInsert(
      rows.map((row) => ({
        id: row.id,
        sprint_id: row.sprintId,
        reviewer_id: row.reviewerId,
        status: 'pending',
        submitted_at: null,
        created_at: row.createdAt,
        updated_at: row.createdAt,
      }))
    )
  }

  async listExistingReverseWorkflowTargets(sprintId: string): Promise<
    Array<{
      reviewerId: string
      targetType: string
      targetUserId: string | null
      targetEntityId: string | null
    }>
  > {
    const rows = (await this.transaction
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprintId)
      .select('reviewer_id', 'target_type', 'target_user_id', 'target_entity_id')) as Array<{
      reviewer_id: string
      target_type: string
      target_user_id: string | null
      target_entity_id: string | null
    }>

    return rows.map((row) => ({
      reviewerId: row.reviewer_id,
      targetType: row.target_type,
      targetUserId: row.target_user_id,
      targetEntityId: row.target_entity_id,
    }))
  }

  findAssignerTargets(
    projectId: string,
    sprintId: string
  ): Promise<Array<{ reviewerId: string; targetUserId: string }>> {
    return findAssignerTargets(this.transaction, projectId, sprintId)
  }

  async loadOrganizationOwnerId(organizationId: string): Promise<string | null> {
    const organization = (await this.transaction
      .from('organizations')
      .where('id', organizationId)
      .select('owner_id')
      .first()) as { owner_id: string | null } | undefined

    return organization?.owner_id ?? null
  }

  async findApprovedOrganizationAdminId(organizationId: string): Promise<string | null> {
    const orgAdmin = (await this.transaction
      .from('organization_users')
      .where('organization_id', organizationId)
      .whereIn('org_role', ['org_owner', 'org_admin', 'admin'])
      .where('status', 'approved')
      .select('user_id')
      .first()) as { user_id: string } | undefined

    return orgAdmin?.user_id ?? null
  }

  async createReverseReviewWorkflows(
    rows: Parameters<
      ReviewSprintPackageMutationPersistenceSession['createReverseReviewWorkflows']
    >[0]
  ): Promise<void> {
    if (rows.length === 0) return

    await this.transaction.table('sprint_reverse_review_workflows').multiInsert(
      rows.map((row) => ({
        id: row.id,
        sprint_id: row.sprintId,
        project_id: row.projectId,
        organization_id: row.organizationId,
        reviewer_id: row.reviewerId,
        target_type: row.targetType,
        target_user_id: row.targetUserId,
        target_entity_id: row.targetEntityId,
        responder_id: row.responderId,
        status: 'awaiting_review',
        rating: null,
        comment: null,
        package_id: row.packageId,
        submitted_at: null,
        accepted_at: null,
        reported_at: null,
        created_at: row.createdAt,
        updated_at: row.createdAt,
      }))
    )
  }

  async createNextSprint(
    input: Parameters<ReviewSprintPackageMutationPersistenceSession['createNextSprint']>[0]
  ): Promise<void> {
    await this.transaction.table('project_sprints').insert({
      id: input.id,
      organization_id: input.organizationId,
      project_id: input.projectId,
      name: input.name,
      status: 'active',
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      created_by: input.createdBy,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
      created_at: input.createdAt,
      updated_at: input.createdAt,
    })
  }

  findManagerTargetEvidence(
    projectId: string
  ): Promise<Array<{ userId: string; assignedTaskCount: number; createdTaskCount: number }>> {
    return findManagerTargetEvidence(this.transaction, projectId)
  }

  async createManagerReviews(
    rows: Parameters<ReviewSprintPackageMutationPersistenceSession['createManagerReviews']>[0]
  ): Promise<void> {
    if (rows.length === 0) return

    await this.transaction.table('sprint_manager_reviews').multiInsert(
      rows.map((row) => ({
        id: row.id,
        package_id: row.packageId,
        target_user_id: row.targetUserId,
        target_role: row.targetRole,
        rating: row.rating,
        dimensions: JSON.stringify(row.dimensions),
        comment: row.comment,
        is_anonymous_to_target: row.isAnonymousToTarget,
        created_at: row.createdAt,
        updated_at: row.createdAt,
      }))
    )
  }

  async createEnvironmentReviews(
    rows: Parameters<ReviewSprintPackageMutationPersistenceSession['createEnvironmentReviews']>[0]
  ): Promise<void> {
    if (rows.length === 0) return

    await this.transaction.table('sprint_environment_reviews').multiInsert(
      rows.map((row) => ({
        id: row.id,
        package_id: row.packageId,
        target_type: row.targetType,
        target_id: row.targetId,
        rating: row.rating,
        dimensions: JSON.stringify(row.dimensions),
        comment: row.comment,
        is_anonymous_publicly: row.isAnonymousPublicly,
        created_at: row.createdAt,
        updated_at: row.createdAt,
      }))
    )
  }

  async markPackageSubmitted(packageId: string, submittedAt: Date): Promise<void> {
    await this.transaction.from('sprint_review_packages').where('id', packageId).update({
      status: 'submitted',
      submitted_at: submittedAt,
      updated_at: submittedAt,
    })
  }

  async writeAudit(
    execCtx: Parameters<ReviewSprintPackageMutationPersistenceSession['writeAudit']>[0],
    input: Parameters<ReviewSprintPackageMutationPersistenceSession['writeAudit']>[1]
  ): Promise<void> {
    await auditPublicApi.write(
      execCtx,
      {
        action: input.action,
        critical: true,
        entity_type: input.entityType,
        entity_id: input.entityId,
        new_values: input.newValues,
      },
      this.transaction
    )
  }

  async stageNotification(
    input: Parameters<ReviewSprintPackageMutationPersistenceSession['stageNotification']>[0]
  ): Promise<void> {
    await this.notificationFanout.stage(
      {
        eventName: input.eventName,
        businessEventId: input.businessEventId,
        type: input.type,
        schemaVersion: 1,
        scope: { kind: 'organization', id: input.organizationId },
        actor: { type: 'user', id: input.actorId },
        subject: { type: input.subjectType, id: input.subjectId },
        parameters: input.parameters,
        occurredAt: input.occurredAt,
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      },
      input.recipientIds,
      { trx: this.transaction, now: input.now }
    )
  }
}
