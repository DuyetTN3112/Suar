import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_ORGANIZATIONS_SPECS } from './organization_seeds_specs.js'
import { assertNoBannedSeedCopy, collectVisibleSeedCopy } from './seed_copy_guard.js'
import type { SeedContext, TaskSpec } from './types.js'
import { SEED_USERS_SPECS } from './user_seeds_specs.js'

interface UserIntegrityRow {
  id: string
  email: string
  system_role: string
  current_organization_id: string | null
}

interface MembershipIntegrityRow {
  org_role: string
  status: string
}

function fail(message: string): never {
  throw new Error(`Seed integrity failed: ${message}`)
}

async function tableExists(trx: TransactionClientContract, table: string): Promise<boolean> {
  const row = (await trx
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', table)
    .first()) as unknown

  return Boolean(row)
}

async function countRowsIfTableExists(
  trx: TransactionClientContract,
  table: string
): Promise<number> {
  if (!(await tableExists(trx, table))) {
    return 0
  }

  const row = (await trx.from(table).count('* as total').first()) as {
    total: string | number
  } | null

  return Number(row?.total ?? 0)
}

async function countRowsWhere(
  trx: TransactionClientContract,
  table: string,
  where: Record<string, string>
): Promise<number> {
  if (!(await tableExists(trx, table))) {
    return 0
  }

  let query = trx.from(table)
  for (const [key, value] of Object.entries(where)) {
    query = query.where(key, value)
  }

  const row = (await query.count('* as total').first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

async function countReverseReviewReportRuntimeContexts(
  trx: TransactionClientContract
): Promise<number> {
  if (!(await tableExists(trx, 'sprint_reverse_review_messages'))) {
    return 0
  }

  const row = (await trx
    .from('sprint_reverse_review_messages')
    .where('message_type', 'report')
    .whereRaw("metadata->'runtime_context' IS NOT NULL")
    .count('* as total')
    .first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

async function countTaskReviewRuntimeContextsWithSprintPeerTasks(
  trx: TransactionClientContract
): Promise<number> {
  if (!(await tableExists(trx, 'task_review_workflows'))) {
    return 0
  }

  const row = (await trx
    .from('task_review_workflows')
    .whereRaw("runtime_context->>'schema_version' = 'suar_task_review_workflow_runtime_context_v1'")
    .whereRaw("jsonb_array_length(COALESCE(runtime_context->'sprint_peer_tasks', '[]'::jsonb)) > 0")
    .count('* as total')
    .first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

async function countResolvedDisputeRows(
  trx: TransactionClientContract,
  table: string
): Promise<number> {
  if (!(await tableExists(trx, table))) {
    return 0
  }

  const row = (await trx
    .from(table)
    .where('status', 'resolved')
    .whereNotNull('final_decision')
    .whereNotNull('final_rationale')
    .whereNotNull('resolved_at')
    .whereNotNull('resolved_by')
    .count('* as total')
    .first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

async function requireUser(
  trx: TransactionClientContract,
  id: string,
  expectedEmail: string,
  expectedRole: string
): Promise<UserIntegrityRow> {
  const row = (await trx.from('users').where('id', id).first()) as UserIntegrityRow | null
  if (!row) {
    fail(`missing user ${expectedEmail}`)
  }

  if (row.email !== expectedEmail) {
    fail(`user ${expectedEmail} email mismatch`)
  }

  if (row.system_role !== expectedRole) {
    fail(`user ${expectedEmail} expected role ${expectedRole}, got ${row.system_role}`)
  }

  return row
}

async function requireMembership(
  trx: TransactionClientContract,
  organizationId: string,
  userId: string,
  role: string
): Promise<void> {
  const row = (await trx
    .from('organization_users')
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .first()) as MembershipIntegrityRow | null

  if (!row) {
    fail(`missing membership ${userId} -> ${organizationId}`)
  }

  if (row.org_role !== role || row.status !== 'approved') {
    fail(`membership ${userId} -> ${organizationId} expected ${role}/approved`)
  }
}

export async function assertSeedIntegrity(
  trx: TransactionClientContract,
  context: SeedContext,
  taskSpecs: TaskSpec[]
): Promise<void> {
  assertNoBannedSeedCopy(
    collectVisibleSeedCopy({
      organizations: SEED_ORGANIZATIONS_SPECS,
      users: SEED_USERS_SPECS,
      tasks: taskSpecs,
    })
  )

  const mainUserSpec = SEED_USERS_SPECS.owner
  const superadminSpec = SEED_USERS_SPECS.superadmin
  const secondaryOwnerSpec = SEED_USERS_SPECS.orgBOwner
  const primaryOrgSpec = SEED_ORGANIZATIONS_SPECS.orgA
  const secondaryOrgSpec = SEED_ORGANIZATIONS_SPECS.orgB

  const mainUser = context.users.owner
  const superadmin = context.users.superadmin
  const secondaryOwner = context.users.orgBOwner
  const primaryOrg = context.organizations.orgA
  const secondaryOrg = context.organizations.orgB

  if (primaryOrg.slug !== primaryOrgSpec.slug || secondaryOrg.slug !== secondaryOrgSpec.slug) {
    fail('canonical organization slugs mismatch')
  }

  await requireUser(trx, superadmin.id, superadminSpec.email, 'superadmin')
  const mainUserRow = await requireUser(trx, mainUser.id, mainUserSpec.email, 'registered_user')
  await requireUser(trx, secondaryOwner.id, secondaryOwnerSpec.email, 'registered_user')

  if (mainUserRow.current_organization_id !== primaryOrg.id) {
    fail('main user current organization must be the primary owner organization')
  }

  await requireMembership(trx, primaryOrg.id, mainUser.id, 'org_owner')
  await requireMembership(trx, secondaryOrg.id, mainUser.id, 'org_member')
  await requireMembership(trx, secondaryOrg.id, secondaryOwner.id, 'org_owner')

  if (Object.keys(context.projects).length < Object.keys(SEED_ORGANIZATIONS_SPECS).length) {
    fail('not enough projects linked to organizations')
  }

  if (Object.keys(context.tasks).length !== taskSpecs.length) {
    fail(`expected ${taskSpecs.length} tasks, got ${Object.keys(context.tasks).length}`)
  }

  if (Object.keys(context.assignments).length === 0) {
    fail('missing task assignments')
  }

  if (Object.keys(context.submissions).length !== Object.keys(context.assignments).length) {
    fail('every seeded assignment must have a task submission package')
  }

  const submissionRows = await countRowsIfTableExists(trx, 'task_submissions')
  const submissionEvidenceRows = await countRowsIfTableExists(trx, 'task_submission_evidences')
  const taskCommentRows = await countRowsIfTableExists(trx, 'task_comments')
  const taskVersionRows = await countRowsIfTableExists(trx, 'task_versions')
  const assignmentSnapshotRows = await countRowsIfTableExists(trx, 'task_assignment_snapshots')

  if (
    submissionRows === 0 ||
    submissionEvidenceRows === 0 ||
    taskCommentRows === 0 ||
    taskVersionRows === 0 ||
    assignmentSnapshotRows === 0
  ) {
    fail('missing task completion package data')
  }

  const reviewSessions = await countRowsIfTableExists(trx, 'review_sessions')
  const skillReviews = await countRowsIfTableExists(trx, 'skill_reviews')
  if (reviewSessions + skillReviews === 0) {
    fail('missing linked review data')
  }

  const reviewDisputes = await countRowsIfTableExists(trx, 'review_disputes')
  if (reviewDisputes > 0) {
    const caseFiles = await countRowsIfTableExists(trx, 'review_dispute_case_files')
    const aiEvaluations = await countRowsIfTableExists(trx, 'ai_dispute_evaluations')
    const disputeEvidences = await countRowsIfTableExists(trx, 'review_dispute_evidences')

    if (caseFiles < reviewDisputes || aiEvaluations < reviewDisputes || disputeEvidences === 0) {
      fail('review disputes must have dossier case files, evidence, and AI evaluations')
    }
  }

  if (Object.keys(context.sprints).length === 0) {
    fail('missing project sprint data')
  }

  const sprintRows = await countRowsIfTableExists(trx, 'project_sprints')
  const sprintPackages = await countRowsIfTableExists(trx, 'sprint_review_packages')
  const sprintWorkflows = await countRowsIfTableExists(trx, 'sprint_reverse_review_workflows')
  const sprintManagerReviews = await countRowsIfTableExists(trx, 'sprint_manager_reviews')
  const sprintEnvironmentReviews = await countRowsIfTableExists(trx, 'sprint_environment_reviews')
  const sprintReviewDisputes = await countRowsWhere(trx, 'sprint_review_disputes', {
    dispute_review_type: 'manager_review',
  })
  const reviewOpenSprintPackages = await countRowsWhere(trx, 'sprint_review_packages', {
    sprint_id: context.sprints['trustReviewJuly']?.id ?? '',
  })

  if (
    sprintRows === 0 ||
    sprintPackages === 0 ||
    sprintWorkflows === 0 ||
    sprintManagerReviews === 0 ||
    sprintEnvironmentReviews === 0 ||
    sprintReviewDisputes === 0 ||
    reviewOpenSprintPackages === 0
  ) {
    fail('missing linked sprint review data')
  }

  const taskReviewWorkflows = await countRowsIfTableExists(trx, 'task_review_workflows')
  const taskReviewReviewers = await countRowsIfTableExists(trx, 'task_review_reviewers')
  const taskReviewMessages = await countRowsIfTableExists(trx, 'task_review_messages')

  if (taskReviewWorkflows === 0 || taskReviewReviewers === 0 || taskReviewMessages === 0) {
    fail('missing task review workflow seed data')
  }

  const taskReviewSprintPeerContexts = await countTaskReviewRuntimeContextsWithSprintPeerTasks(trx)
  if (taskReviewSprintPeerContexts === 0) {
    fail('task review workflow runtime context must include sprint peer tasks')
  }

  const reverseReviewReportRuntimeContexts = await countReverseReviewReportRuntimeContexts(trx)
  if (reverseReviewReportRuntimeContexts === 0) {
    fail('missing sprint reverse review report runtime context')
  }

  const resolvedClassicDisputes = await countResolvedDisputeRows(trx, 'review_disputes')
  const resolvedTaskReviewWorkflows = await countResolvedDisputeRows(trx, 'task_review_workflows')
  const resolvedSprintReviewDisputes = await countResolvedDisputeRows(trx, 'sprint_review_disputes')
  const resolvedReverseWorkflows = await countResolvedDisputeRows(
    trx,
    'sprint_reverse_review_workflows'
  )
  if (
    resolvedClassicDisputes === 0 ||
    resolvedTaskReviewWorkflows === 0 ||
    resolvedSprintReviewDisputes === 0 ||
    resolvedReverseWorkflows === 0
  ) {
    fail('missing resolved dispute seed data')
  }

  const profileSnapshots = await countRowsIfTableExists(trx, 'user_profile_snapshots')
  const userSkills = await countRowsIfTableExists(trx, 'user_skills')
  if (profileSnapshots === 0 || userSkills === 0) {
    fail('missing linked profile data')
  }
}
