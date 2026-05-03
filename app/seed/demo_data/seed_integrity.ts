import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_ORGANIZATIONS_SPECS } from './organization_seeds_specs.js'
import { assertNoBannedSeedCopy, collectVisibleSeedCopy } from './seed_copy_guard.js'
import type { SeedCopyCandidate } from './seed_copy_guard.js'
import type { SeedContext, TaskSpec } from './types.js'
import { SEED_USERS_SPECS } from './user_seeds_specs.js'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { DEFAULT_TASK_STATUSES } from '#modules/tasks/public_contracts/task_constants'

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

async function collectPersistedVisibleCopy(
  trx: TransactionClientContract
): Promise<SeedCopyCandidate[]> {
  const candidates: SeedCopyCandidate[] = []
  const sources: {
    table: string
    key: string
    columns: string[]
  }[] = [
    { table: 'users', key: 'email', columns: ['username', 'bio'] },
    { table: 'organizations', key: 'slug', columns: ['name', 'description'] },
    { table: 'projects', key: 'id', columns: ['name', 'description'] },
    {
      table: 'tasks',
      key: 'id',
      columns: ['title', 'description', 'context_background', 'complexity_notes'],
    },
    { table: 'notifications', key: 'id', columns: ['title', 'message'] },
    {
      table: 'review_sessions',
      key: 'id',
      columns: ['strengths_observed', 'areas_for_improvement'],
    },
    {
      table: 'review_disputes',
      key: 'id',
      columns: ['dispute_reason', 'final_rationale'],
    },
    { table: 'task_review_messages', key: 'id', columns: ['body'] },
    { table: 'sprint_review_dispute_comments', key: 'id', columns: ['body'] },
    { table: 'skills', key: 'skill_code', columns: ['description'] },
    { table: 'task_statuses', key: 'id', columns: ['description'] },
    {
      table: 'task_submissions',
      key: 'id',
      columns: ['summary', 'implementation_notes', 'known_limitations', 'test_notes'],
    },
    { table: 'task_comments', key: 'id', columns: ['body'] },
    { table: 'task_applications', key: 'id', columns: ['message'] },
    { table: 'sprint_manager_reviews', key: 'id', columns: ['comment'] },
    { table: 'sprint_environment_reviews', key: 'id', columns: ['comment'] },
    {
      table: 'sprint_reverse_review_workflows',
      key: 'id',
      columns: ['comment', 'final_rationale'],
    },
    { table: 'sprint_reverse_review_messages', key: 'id', columns: ['body'] },
    { table: 'sprint_review_disputes', key: 'id', columns: ['dispute_reason', 'final_rationale'] },
    { table: 'task_review_workflows', key: 'id', columns: ['final_rationale'] },
    { table: 'project_professional_role_skills', key: 'id', columns: ['notes'] },
    { table: 'project_sprints', key: 'id', columns: ['name', 'goal'] },
  ]

  for (const source of sources) {
    if (!(await tableExists(trx, source.table))) {
      continue
    }

    const rows = (await trx.from(source.table).select(source.key, ...source.columns)) as Record<
      string,
      unknown
    >[]
    for (const row of rows) {
      const sourceKey = row[source.key]
      const safeSourceKey =
        typeof sourceKey === 'string' || typeof sourceKey === 'number'
          ? String(sourceKey)
          : 'unknown'

      for (const column of source.columns) {
        const value = row[column]
        if (typeof value === 'string' && value.trim().length > 0) {
          candidates.push({
            source: `${source.table}.${column}`,
            key: safeSourceKey,
            text: value,
          })
        }
      }
    }
  }

  if (await tableExists(trx, 'tasks')) {
    const taskTagRows = (await trx.from('tasks').select('id', 'domain_tags')) as {
      id: string
      domain_tags: unknown
    }[]
    for (const row of taskTagRows) {
      const rawTags = row.domain_tags
      const tags: unknown[] = Array.isArray(rawTags)
        ? rawTags
        : typeof rawTags === 'string'
          ? (() => {
              try {
                const parsed: unknown = JSON.parse(rawTags)
                return Array.isArray(parsed) ? parsed.map((value: unknown) => value) : []
              } catch {
                return []
              }
            })()
          : []
      for (const tag of tags) {
        if (typeof tag === 'string' && tag.trim().length > 0) {
          candidates.push({ source: 'tasks.domain_tags', key: row.id, text: tag })
        }
      }
    }
  }

  return candidates
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

  const superadminRow = await requireUser(trx, superadmin.id, superadminSpec.email, 'superadmin')
  const mainUserRow = await requireUser(trx, mainUser.id, mainUserSpec.email, 'registered_user')
  await requireUser(trx, secondaryOwner.id, secondaryOwnerSpec.email, 'registered_user')

  if (!mainUserRow.current_organization_id) {
    fail('main user must have a current approved organization context')
  }
  const mainUserCurrentMembership = await countRowsWhere(trx, 'organization_users', {
    organization_id: mainUserRow.current_organization_id,
    user_id: mainUser.id,
    status: 'approved',
  })
  if (mainUserCurrentMembership !== 1) {
    fail('main user current organization must reference an approved membership')
  }

  const invalidCurrentOrganizationUsers = (await trx
    .from('users as user')
    .leftJoin('organization_users as membership', (join) => {
      join
        .on('membership.user_id', '=', 'user.id')
        .andOn('membership.organization_id', '=', 'user.current_organization_id')
        .andOnVal('membership.status', '=', 'approved')
    })
    .whereNotNull('user.current_organization_id')
    .whereNull('membership.user_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const superadminMemberships = await countRowsWhere(trx, 'organization_users', {
    user_id: superadmin.id,
  })
  if (
    Number(invalidCurrentOrganizationUsers?.total ?? 0) > 0 ||
    superadminRow.current_organization_id !== null ||
    superadminMemberships !== 0
  ) {
    fail(
      'current organization requires approved membership, while system admins stay outside organization membership'
    )
  }

  await requireMembership(trx, primaryOrg.id, mainUser.id, 'org_owner')
  await requireMembership(trx, secondaryOrg.id, mainUser.id, 'org_member')
  await requireMembership(trx, secondaryOrg.id, secondaryOwner.id, 'org_owner')

  const mainUserProviderCount = await countRowsWhere(trx, 'user_oauth_providers', {
    user_id: mainUser.id,
    provider: mainUser.authMethod,
  })
  if (mainUserProviderCount < 1) {
    fail('main user must retain at least one OAuth identity for the configured auth method')
  }

  if (Object.keys(context.projects).length < Object.keys(SEED_ORGANIZATIONS_SPECS).length) {
    fail('not enough projects linked to organizations')
  }

  const projectsWithInsufficientMembers = (await trx
    .from('projects as project')
    .leftJoin('project_members as member', 'member.project_id', 'project.id')
    .groupBy('project.id')
    .havingRaw('COUNT(DISTINCT member.user_id) < 2')
    .select('project.id')) as { id: string }[]
  const projectsWithInsufficientSkillCatalog = (await trx
    .from('projects as project')
    .leftJoin('project_skills as skill', (join) => {
      join.on('skill.project_id', '=', 'project.id').andOnVal('skill.is_active', '=', true)
    })
    .groupBy('project.id')
    .havingRaw('COUNT(DISTINCT skill.skill_id) < 4')
    .select('project.id')) as { id: string }[]
  const invalidProjectLeaders = (await trx
    .from('projects as project')
    .where((builder) => {
      for (const column of ['creator_id', 'owner_id', 'manager_id']) {
        void builder.orWhereRaw(
          `NOT EXISTS (
            SELECT 1
            FROM organization_users AS membership
            WHERE membership.organization_id = project.organization_id
              AND membership.user_id = project.${column}
              AND membership.status = 'approved'
          )`
        )
      }
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    projectsWithInsufficientMembers.length > 0 ||
    projectsWithInsufficientSkillCatalog.length > 0 ||
    Number(invalidProjectLeaders?.total ?? 0) > 0
  ) {
    fail(
      `projects require approved leaders, at least two members, and a four-skill catalog (member gaps=${projectsWithInsufficientMembers.length}, skill gaps=${projectsWithInsufficientSkillCatalog.length}, leader gaps=${Number(invalidProjectLeaders?.total ?? 0)})`
    )
  }

  if (Object.keys(context.tasks).length !== taskSpecs.length) {
    fail(`expected ${taskSpecs.length} tasks, got ${Object.keys(context.tasks).length}`)
  }

  for (const organization of Object.values(context.organizations)) {
    const statusRows = (await trx
      .from('task_statuses')
      .where('organization_id', organization.id)
      .whereNull('deleted_at')
      .select(
        'id',
        'name',
        'slug',
        'category',
        'color',
        'sort_order',
        'is_default',
        'is_system'
      )) as {
      id: string
      name: string
      slug: string
      category: string
      color: string
      sort_order: number
      is_default: boolean
      is_system: boolean
    }[]
    if (statusRows.length !== DEFAULT_TASK_STATUSES.length) {
      fail(
        `organization ${organization.slug} must have exactly ${DEFAULT_TASK_STATUSES.length} production task statuses`
      )
    }

    for (const expected of DEFAULT_TASK_STATUSES) {
      const actual = statusRows.find((row) => row.slug === expected.slug)
      if (
        !actual ||
        actual.name !== expected.name ||
        actual.category !== (expected.category as string) ||
        actual.color !== expected.color ||
        actual.sort_order !== expected.sort_order ||
        actual.is_default !== expected.is_default ||
        actual.is_system !== expected.is_system
      ) {
        fail(`organization ${organization.slug} task status ${expected.slug} diverges from runtime`)
      }
    }
  }

  const taskStatusMirrorMismatches = (await trx
    .from('tasks as task')
    .join('task_statuses as status', 'status.id', 'task.task_status_id')
    .whereRaw('task.status::text <> status.category::text')
    .count('* as total')
    .first()) as { total: string | number } | null
  const tasksMissingRequiredSkillCategories = (await trx
    .from('tasks as task')
    .leftJoin('task_required_skills as requirement', 'requirement.task_id', 'task.id')
    .leftJoin('skills as skill', 'skill.id', 'requirement.skill_id')
    .groupBy('task.id')
    .havingRaw(
      "COUNT(DISTINCT skill.category_code) FILTER (WHERE skill.category_code IN ('technology', 'engineering', 'soft_skill', 'delivery')) <> 4"
    )
    .select('task.id', 'task.title')) as { id: string; title: string }[]
  if (
    Number(taskStatusMirrorMismatches?.total ?? 0) > 0 ||
    tasksMissingRequiredSkillCategories.length > 0
  ) {
    fail(
      `every task must mirror its canonical status category and require all four skill categories (mirror mismatches=${Number(taskStatusMirrorMismatches?.total ?? 0)}, category gaps=${tasksMissingRequiredSkillCategories.length}, sample=${tasksMissingRequiredSkillCategories
        .slice(0, 3)
        .map((row) => `${row.id}:${row.title}`)
        .join(',')})`
    )
  }

  const duplicateTaskTitles = (await trx
    .from('tasks')
    .select('title')
    .groupBy('title')
    .havingRaw('COUNT(*) > 1')) as { title: string }[]
  const narrativelyIncompleteTasks = (await trx
    .from('tasks')
    .whereRaw(
      `
      LENGTH(TRIM(description)) < 80
      OR LENGTH(TRIM(acceptance_criteria)) < 80
      OR JSONB_ARRAY_LENGTH(expected_deliverables) < 2
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  if (duplicateTaskTitles.length > 0 || Number(narrativelyIncompleteTasks?.total ?? 0) > 0) {
    fail(
      `task narratives must be unique and demo-complete (duplicate titles=${duplicateTaskTitles.length}, incomplete=${Number(narrativelyIncompleteTasks?.total ?? 0)})`
    )
  }

  const invalidProjectMemberships = (await trx
    .from('project_members as project_member')
    .join('projects as project', 'project.id', 'project_member.project_id')
    .leftJoin('organization_users as membership', (join) => {
      join
        .on('membership.user_id', '=', 'project_member.user_id')
        .andOn('membership.organization_id', '=', 'project.organization_id')
        .andOnVal('membership.status', '=', 'approved')
    })
    .whereNull('membership.user_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidTaskCreators = (await trx
    .from('tasks as task')
    .leftJoin('organization_users as membership', (join) => {
      join
        .on('membership.user_id', '=', 'task.creator_id')
        .andOn('membership.organization_id', '=', 'task.organization_id')
        .andOnVal('membership.status', '=', 'approved')
    })
    .whereNull('membership.user_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidTaskAssignees = (await trx
    .from('tasks as task')
    .leftJoin('organization_users as membership', (join) => {
      join
        .on('membership.user_id', '=', 'task.assigned_to')
        .andOn('membership.organization_id', '=', 'task.organization_id')
        .andOnVal('membership.status', '=', 'approved')
    })
    .whereNotNull('task.assigned_to')
    .whereNull('membership.user_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    Number(invalidProjectMemberships?.total ?? 0) > 0 ||
    Number(invalidTaskCreators?.total ?? 0) > 0 ||
    Number(invalidTaskAssignees?.total ?? 0) > 0
  ) {
    fail('project members, task creators, and task assignees must be approved organization members')
  }

  if (Object.keys(context.assignments).length === 0) {
    fail('missing task assignments')
  }

  const mainUserAssignmentCount = await countRowsWhere(trx, 'task_assignments', {
    assignee_id: mainUser.id,
  })
  if (mainUserAssignmentCount < 12) {
    fail(`main user must have at least 12 assignments, got ${mainUserAssignmentCount}`)
  }

  const approvedApplications = (await trx
    .from('task_applications as application')
    .join('tasks as task', 'task.id', 'application.task_id')
    .where('application.application_status', 'approved')
    .select(
      'application.id',
      'application.task_id',
      'application.applicant_id',
      'task.organization_id',
      'task.assigned_to'
    )) as {
    id: string
    task_id: string
    applicant_id: string
    organization_id: string
    assigned_to: string | null
  }[]

  for (const application of approvedApplications) {
    const approvedMemberships = await countRowsWhere(trx, 'organization_users', {
      organization_id: application.organization_id,
      user_id: application.applicant_id,
      status: 'approved',
    })
    const applicationAssignments = await countRowsWhere(trx, 'task_assignments', {
      task_id: application.task_id,
      assignee_id: application.applicant_id,
    })
    const pendingSiblings = await countRowsWhere(trx, 'task_applications', {
      task_id: application.task_id,
      application_status: 'pending',
    })

    if (
      approvedMemberships !== 1 ||
      applicationAssignments !== 1 ||
      application.assigned_to !== application.applicant_id ||
      pendingSiblings !== 0
    ) {
      fail(
        `approved application ${application.id} must produce membership, assignment, task ownership, and sibling rejection`
      )
    }
  }

  for (const task of Object.values(context.tasks)) {
    const storedTask = (await trx
      .from('tasks')
      .where('id', task.id)
      .select('external_applications_count')
      .first()) as { external_applications_count: number | string } | null
    const activeApplications = (await trx
      .from('task_applications')
      .where('task_id', task.id)
      .whereNot('application_status', 'withdrawn')
      .count('* as total')
      .first()) as { total: number | string } | null

    if (
      Number(storedTask?.external_applications_count ?? 0) !==
      Number(activeApplications?.total ?? 0)
    ) {
      fail(`task ${task.id} external application counter must exclude withdrawn applications`)
    }
  }

  const taskAssignmentCacheMismatches = (await trx
    .from('tasks as task')
    .whereNotNull('task.assigned_to')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM task_assignments AS assignment
        WHERE assignment.task_id = task.id
          AND assignment.assignee_id = task.assigned_to
          AND assignment.assignment_status IN ('active', 'completed')
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  if (Number(taskAssignmentCacheMismatches?.total ?? 0) > 0) {
    fail('tasks.assigned_to must reference an active or completed task assignment')
  }

  const doneTasksMissingReviewWorkflow = (await trx
    .from('tasks as task')
    .join('task_statuses as status', 'status.id', 'task.task_status_id')
    .leftJoin('task_review_workflows as workflow', 'workflow.task_id', 'task.id')
    .where('status.category', 'done')
    .whereNotNull('task.assigned_to')
    .whereNull('workflow.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  if (Number(doneTasksMissingReviewWorkflow?.total ?? 0) > 0) {
    fail('completed tasks with assignments must open a task review workflow')
  }

  const submissionRows = await countRowsIfTableExists(trx, 'task_submissions')
  const submissionEvidenceRows = await countRowsIfTableExists(trx, 'task_submission_evidences')
  const taskCommentRows = await countRowsIfTableExists(trx, 'task_comments')
  const taskVersionRows = await countRowsIfTableExists(trx, 'task_versions')
  const assignmentSnapshotRows = await countRowsIfTableExists(trx, 'task_assignment_snapshots')

  if (taskCommentRows === 0 || taskVersionRows === 0 || assignmentSnapshotRows === 0) {
    fail('missing task context data')
  }

  const governanceFixtureKeys = new Set(
    taskSpecs.filter((spec) => spec.seedGovernanceFixture).map((spec) => spec.key)
  )
  const missingGovernanceSubmissions = [...governanceFixtureKeys].filter(
    (key) => !context.submissions[key]
  )
  const unexpectedSubmissionKeys = Object.keys(context.submissions).filter(
    (key) => !governanceFixtureKeys.has(key)
  )
  if (
    missingGovernanceSubmissions.length > 0 ||
    unexpectedSubmissionKeys.length > 0 ||
    submissionRows === 0 ||
    submissionEvidenceRows === 0
  ) {
    fail('explicit governance fixtures must include submission evidence')
  }

  const assignmentOrphans = (await trx
    .from('task_assignments as ta')
    .leftJoin('tasks as t', 't.id', 'ta.task_id')
    .leftJoin('users as u', 'u.id', 'ta.assignee_id')
    .where((builder) => {
      void builder.whereNull('t.id').orWhereNull('u.id')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  const submissionOrphans = (await trx
    .from('task_submissions as ts')
    .leftJoin('task_assignments as ta', 'ta.id', 'ts.task_assignment_id')
    .leftJoin('tasks as t', 't.id', 'ts.task_id')
    .where((builder) => {
      void builder.whereNull('ta.id').orWhereNull('t.id').orWhereRaw('ta.task_id <> ts.task_id')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  const reviewOrphans = (await trx
    .from('review_sessions as rs')
    .leftJoin('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
    .where((builder) => {
      void builder.whereNull('ta.id').orWhereRaw('ta.assignee_id <> rs.reviewee_id')
    })
    .count('* as total')
    .first()) as { total: string | number } | null

  if (
    Number(assignmentOrphans?.total ?? 0) > 0 ||
    Number(submissionOrphans?.total ?? 0) > 0 ||
    Number(reviewOrphans?.total ?? 0) > 0
  ) {
    fail('task, assignment, submission, and review relationships must not contain orphans')
  }

  const invalidAssignmentTimeline = (await trx
    .from('task_assignments')
    .whereNotNull('completed_at')
    .whereRaw('completed_at < assigned_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidSubmissionTimeline = (await trx
    .from('task_submissions as ts')
    .join('task_assignments as ta', 'ta.id', 'ts.task_assignment_id')
    .whereNotNull('ts.submitted_at')
    .whereRaw('ts.submitted_at < ta.assigned_at')
    .count('* as total')
    .first()) as { total: string | number } | null

  if (
    Number(invalidAssignmentTimeline?.total ?? 0) > 0 ||
    Number(invalidSubmissionTimeline?.total ?? 0) > 0
  ) {
    fail('assignment and submission timestamps must follow the delivery timeline')
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

    const disputesMissingDossierParts = (await trx
      .from('review_disputes as rd')
      .leftJoin('review_dispute_case_files as cf', 'cf.dispute_id', 'rd.id')
      .leftJoin('ai_dispute_evaluations as ae', 'ae.dispute_id', 'rd.id')
      .leftJoin('review_dispute_evidences as ev', 'ev.dispute_id', 'rd.id')
      .where((builder) => {
        void builder.whereNull('cf.id').orWhereNull('ae.id').orWhereNull('ev.id')
      })
      .countDistinct('rd.id as total')
      .first()) as { total: string | number } | null
    if (Number(disputesMissingDossierParts?.total ?? 0) > 0) {
      fail('every review dispute must have its own case file, evidence, and AI evaluation')
    }

    const incompleteCaseFiles = (await trx
      .from('review_dispute_case_files')
      .where('completeness_score', '<', 100)
      .count('* as total')
      .first()) as { total: string | number } | null
    const incompleteAiEvaluations = (await trx
      .from('ai_dispute_evaluations')
      .whereNot('status', 'completed')
      .count('* as total')
      .first()) as { total: string | number } | null
    if (
      Number(incompleteCaseFiles?.total ?? 0) > 0 ||
      Number(incompleteAiEvaluations?.total ?? 0) > 0
    ) {
      fail('dispute dossiers and advisory AI evaluations must be complete')
    }

    const reportedDisputesMissingGovernanceMetadata = (await trx
      .from('review_disputes')
      .whereNotNull('reported_to_admin_at')
      .where((builder) => {
        void builder
          .whereNull('reported_to_admin_by')
          .orWhereNull('escalation_reason')
          .orWhereRaw("BTRIM(escalation_reason) = ''")
      })
      .count('* as total')
      .first()) as { total: string | number } | null
    const reportedDisputesWithoutTwoSidedExchange = (await trx
      .from('review_disputes as dispute')
      .whereNotNull('dispute.reported_to_admin_at')
      .whereRaw(
        `
        (
          SELECT COUNT(DISTINCT comment.author_id)
          FROM review_dispute_comments AS comment
          WHERE comment.dispute_id = dispute.id
            AND comment.deleted_at IS NULL
            AND comment.visibility = 'all_parties'
        ) < 2
      `
      )
      .count('* as total')
      .first()) as { total: string | number } | null
    if (
      Number(reportedDisputesMissingGovernanceMetadata?.total ?? 0) > 0 ||
      Number(reportedDisputesWithoutTwoSidedExchange?.total ?? 0) > 0
    ) {
      fail(
        `reported review disputes require reporter, escalation reason, and two-sided exchange (metadata gaps=${Number(reportedDisputesMissingGovernanceMetadata?.total ?? 0)}, exchange gaps=${Number(reportedDisputesWithoutTwoSidedExchange?.total ?? 0)})`
      )
    }

    const demoDisputeTask = context.tasks['orga-review-dispute-detail']
    const demoDossier = demoDisputeTask
      ? ((await trx
          .from('review_dispute_case_files as cf')
          .join('review_disputes as rd', 'rd.id', 'cf.dispute_id')
          .where('rd.task_id', demoDisputeTask.id)
          .whereRaw("jsonb_array_length(COALESCE(cf.missing_data, '[]'::jsonb)) = 0")
          .whereRaw(
            "jsonb_array_length(COALESCE(cf.task_snapshot->'sprint_peer_tasks', '[]'::jsonb)) > 0"
          )
          .whereRaw(
            "COALESCE(cf.reviewee_profile_context_snapshot->'profile', '{}'::jsonb) <> '{}'::jsonb"
          )
          .whereRaw("COALESCE(cf.reviewer_context_snapshot->'profile', '{}'::jsonb) <> '{}'::jsonb")
          .orderBy('cf.case_version', 'desc')
          .select('cf.id')
          .first()) as { id: string } | null)
      : null
    if (!demoDossier) {
      fail('primary demo dispute must include sprint peers and both party profile contexts')
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

  const selfTaskReviewers = (await trx
    .from('task_review_reviewers as reviewer')
    .join('task_review_workflows as workflow', 'workflow.id', 'reviewer.workflow_id')
    .whereRaw('reviewer.reviewer_id = workflow.reviewee_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const taskReviewAssignmentMismatches = (await trx
    .from('task_review_workflows as workflow')
    .leftJoin('task_assignments as assignment', 'assignment.id', 'workflow.task_assignment_id')
    .where((builder) => {
      void builder
        .whereNull('workflow.task_assignment_id')
        .orWhereNull('assignment.id')
        .orWhereRaw('assignment.task_id <> workflow.task_id')
        .orWhereRaw('assignment.assignee_id <> workflow.reviewee_id')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  const taskGiverReviewerGaps = (await trx
    .from('task_review_workflows as workflow')
    .join('task_assignments as assignment', 'assignment.id', 'workflow.task_assignment_id')
    .whereRaw('assignment.assigned_by <> workflow.reviewee_id')
    .whereNotExists((query) => {
      void query
        .select(trx.raw('1'))
        .from('task_review_reviewers as reviewer')
        .whereRaw('reviewer.workflow_id = workflow.id')
        .whereRaw('reviewer.reviewer_id = assignment.assigned_by')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  const inconsistentTaskReviewCounts = (await trx
    .from('task_review_workflows as workflow')
    .select('workflow.id').whereRaw(`
      workflow.required_review_count <> (
        SELECT COUNT(*)::integer
        FROM task_review_reviewers AS reviewer
        WHERE reviewer.workflow_id = workflow.id
          AND reviewer.is_required = true
      )
      OR workflow.completed_review_count <> (
        SELECT COUNT(*)::integer
        FROM task_review_reviewers AS reviewer
        WHERE reviewer.workflow_id = workflow.id
          AND reviewer.is_required = true
          AND reviewer.status = 'submitted'
      )
    `)) as { id: string }[]
  const incompleteAcceptedTaskReviewWorkflows = (await trx
    .from('task_review_workflows')
    .where('status', 'done')
    .where((builder) => {
      void builder.whereNull('accepted_by_reviewee_at').orWhereNull('completed_at')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    Number(selfTaskReviewers?.total ?? 0) > 0 ||
    Number(taskReviewAssignmentMismatches?.total ?? 0) > 0 ||
    Number(taskGiverReviewerGaps?.total ?? 0) > 0 ||
    inconsistentTaskReviewCounts.length > 0 ||
    Number(incompleteAcceptedTaskReviewWorkflows?.total ?? 0) > 0
  ) {
    fail('task review workflows must have non-self reviewers and truthful quorum/acceptance state')
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

  const allowedFinalDecisions = [
    'uphold_review',
    'adjust_score',
    'request_re_review',
    'dismiss_dispute',
    'partially_accept',
  ]
  for (const disputeTable of [
    'review_disputes',
    'task_review_workflows',
    'sprint_review_disputes',
    'sprint_reverse_review_workflows',
  ]) {
    if (!(await tableExists(trx, disputeTable))) {
      continue
    }
    const invalidDecisionRows = (await trx
      .from(disputeTable)
      .whereNotNull('final_decision')
      .whereNotIn('final_decision', allowedFinalDecisions)
      .count('* as total')
      .first()) as { total: string | number } | null
    if (Number(invalidDecisionRows?.total ?? 0) > 0) {
      fail(`${disputeTable}.final_decision must use only Suar final-decision enum values`)
    }
  }

  const invalidDisputeTimeline = (await trx
    .from('review_disputes')
    .whereNotNull('resolved_at')
    .whereRaw('resolved_at < created_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidAiEvaluationTimeline = (await trx
    .from('ai_dispute_evaluations as ae')
    .join('review_disputes as rd', 'rd.id', 'ae.dispute_id')
    .whereRaw('ae.created_at < rd.created_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const resolutionBeforeAiCompletion = (await trx
    .from('review_disputes as rd')
    .join('ai_dispute_evaluations as ae', 'ae.dispute_id', 'rd.id')
    .whereNotNull('rd.resolved_at')
    .whereNotNull('ae.completed_at')
    .whereRaw('rd.resolved_at < ae.completed_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const aiEvaluationBeforeCaseFile = (await trx
    .from('ai_dispute_evaluations as evaluation')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM review_dispute_case_files AS case_file
        WHERE case_file.dispute_id = evaluation.dispute_id
          AND case_file.created_at <= evaluation.created_at
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    Number(invalidDisputeTimeline?.total ?? 0) > 0 ||
    Number(invalidAiEvaluationTimeline?.total ?? 0) > 0 ||
    Number(resolutionBeforeAiCompletion?.total ?? 0) > 0 ||
    Number(aiEvaluationBeforeCaseFile?.total ?? 0) > 0
  ) {
    fail(
      `case file, AI advisory evaluation, and human resolution timestamps must be chronological (dispute=${Number(invalidDisputeTimeline?.total ?? 0)}, ai_before_dispute=${Number(invalidAiEvaluationTimeline?.total ?? 0)}, resolution_before_ai=${Number(resolutionBeforeAiCompletion?.total ?? 0)}, ai_before_case=${Number(aiEvaluationBeforeCaseFile?.total ?? 0)})`
    )
  }

  const profileSnapshots = await countRowsIfTableExists(trx, 'user_profile_snapshots')
  const userSkills = await countRowsIfTableExists(trx, 'user_skills')
  if (profileSnapshots === 0 || userSkills === 0) {
    fail('missing linked profile data')
  }

  const usersWithCurrentSnapshots = (await trx
    .from('user_profile_snapshots')
    .where('is_current', true)
    .countDistinct('user_id as total')
    .first()) as { total: string | number } | null
  if (Number(usersWithCurrentSnapshots?.total ?? 0) !== Object.keys(context.users).length) {
    fail('every seeded user must have one current profile context snapshot')
  }

  const usersWithSkillProfiles = (await trx
    .from('user_skills')
    .groupBy('user_id')
    .havingRaw('COUNT(DISTINCT skill_id) >= 4')
    .count('* as grouped_total')) as { grouped_total: string | number }[]
  const usersWithPerformance = (await trx
    .from('user_performance_stats')
    .whereNull('period_start')
    .whereNull('period_end')
    .countDistinct('user_id as total')
    .first()) as { total: string | number } | null
  const usersWithExpertise = (await trx
    .from('user_domain_expertise')
    .countDistinct('user_id as total')
    .first()) as { total: string | number } | null
  if (
    usersWithSkillProfiles.length !== Object.keys(context.users).length ||
    Number(usersWithPerformance?.total ?? 0) !== Object.keys(context.users).length ||
    Number(usersWithExpertise?.total ?? 0) !== Object.keys(context.users).length
  ) {
    fail(
      `every seeded user needs a skill profile, performance aggregate, and domain expertise (skills=${usersWithSkillProfiles.length}, performance=${Number(usersWithPerformance?.total ?? 0)}, expertise=${Number(usersWithExpertise?.total ?? 0)}, users=${Object.keys(context.users).length})`
    )
  }

  const mainUserWorkHistory = await countRowsWhere(trx, 'user_work_history', {
    user_id: mainUser.id,
  })
  const completedAssignmentsWithoutWorkHistory = (await trx
    .from('task_assignments as ta')
    .leftJoin('user_work_history as uwh', (join) => {
      join.on('uwh.task_assignment_id', 'ta.id').andOn('uwh.user_id', 'ta.assignee_id')
    })
    .where('ta.assignment_status', 'completed')
    .whereNull('uwh.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const workHistoryWithoutCompletedAssignment = (await trx
    .from('user_work_history as uwh')
    .leftJoin('task_assignments as ta', (join) => {
      join
        .on('ta.id', 'uwh.task_assignment_id')
        .andOn('ta.assignee_id', 'uwh.user_id')
        .andOnVal('ta.assignment_status', 'completed')
    })
    .whereNull('ta.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    mainUserWorkHistory === 0 ||
    !context.snapshots['owner'] ||
    Number(completedAssignmentsWithoutWorkHistory?.total ?? 0) > 0 ||
    Number(workHistoryWithoutCompletedAssignment?.total ?? 0) > 0
  ) {
    fail(
      `work history must materialize every completed assignment for its assignee (main=${mainUserWorkHistory}, missing=${Number(completedAssignmentsWithoutWorkHistory?.total ?? 0)}, invalid=${Number(workHistoryWithoutCompletedAssignment?.total ?? 0)})`
    )
  }

  const invalidNotifications = (await trx
    .from('notifications')
    .whereRaw('(is_read = false AND read_at IS NOT NULL) OR (is_read = true AND read_at IS NULL)')
    .count('* as total')
    .first()) as { total: string | number } | null
  const notificationCount = await countRowsIfTableExists(trx, 'notifications')
  const notificationLedgerCount = await countRowsIfTableExists(
    trx,
    'notification_acceptance_ledger'
  )
  const notificationOutboxCount = await countRowsIfTableExists(trx, 'notification_outbox')
  const nonCanonicalNotifications = (await trx
    .from('notifications')
    .whereNotIn('type', Object.values(BACKEND_NOTIFICATION_TYPES))
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidNotificationLedgerRows = (await trx
    .from('notification_acceptance_ledger as ledger')
    .leftJoin('notifications as notification', (join) => {
      join
        .on('notification.id', '=', 'ledger.notification_id')
        .andOn('notification.event_id', '=', 'ledger.event_id')
        .andOn('notification.user_id', '=', 'ledger.recipient_id')
        .andOn('notification.event_fingerprint', '=', 'ledger.event_fingerprint')
    })
    .where('ledger.terminal_state', 'active')
    .whereNull('notification.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidRecipientStates = (await trx
    .from('notification_recipient_states as state')
    .whereRaw(
      `
      state.unread_count <> (
        SELECT COUNT(*)
        FROM notifications AS notification
        WHERE notification.user_id = state.recipient_id
          AND notification.is_read = false
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  const notificationsMissingRecipientState = (await trx
    .from('notifications as notification')
    .leftJoin(
      'notification_recipient_states as state',
      'state.recipient_id',
      'notification.user_id'
    )
    .whereNull('state.recipient_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidOutboxDestinations = (await trx
    .from('notification_outbox')
    .whereNotIn('destination', ['feed_search', 'unread_cache'])
    .count('* as total')
    .first()) as { total: string | number } | null

  if (
    notificationCount === 0 ||
    notificationLedgerCount !== notificationCount ||
    notificationOutboxCount !== notificationCount * 2 ||
    Number(invalidNotifications?.total ?? 0) > 0 ||
    Number(nonCanonicalNotifications?.total ?? 0) > 0 ||
    Number(invalidNotificationLedgerRows?.total ?? 0) > 0 ||
    Number(invalidRecipientStates?.total ?? 0) > 0 ||
    Number(notificationsMissingRecipientState?.total ?? 0) > 0 ||
    Number(invalidOutboxDestinations?.total ?? 0) > 0
  ) {
    fail(
      'notifications must be canonical and causally linked to ledger, unread state, and both projection outboxes'
    )
  }

  const auditRows = (await trx
    .from('audit_events')
    .select('id', 'event_hash', 'prev_hash')
    .orderBy('occurred_at', 'asc')
    .orderBy('id', 'asc')) as {
    id: string
    event_hash: string | null
    prev_hash: string | null
  }[]
  const auditChainBroken = auditRows.some((row, index) => {
    if (!row.event_hash) {
      return true
    }
    return index === 0 ? row.prev_hash !== null : row.prev_hash !== auditRows[index - 1]?.event_hash
  })
  const auditEventsMissingSystemScope = (await trx
    .from('audit_events as event')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM audit_event_scopes AS scope
        WHERE scope.event_id = event.id
          AND scope.surface = 'system'
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  const auditActorsMissingUserScope = (await trx
    .from('audit_events as event')
    .whereNotNull('event.user_id')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM audit_event_scopes AS scope
        WHERE scope.event_id = event.id
          AND scope.surface = 'user'
          AND scope.user_id = event.user_id
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  const auditTargetsMissingOrganizationScope = (await trx
    .from('audit_events as event')
    .whereNotNull('event.target_org_id')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM audit_event_scopes AS scope
        WHERE scope.event_id = event.id
          AND scope.surface = 'organization'
          AND scope.organization_id = event.target_org_id
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    auditRows.length === 0 ||
    auditChainBroken ||
    Number(auditEventsMissingSystemScope?.total ?? 0) > 0 ||
    Number(auditActorsMissingUserScope?.total ?? 0) > 0 ||
    Number(auditTargetsMissingOrganizationScope?.total ?? 0) > 0
  ) {
    fail('audit events must form a sealed hash chain with system, actor, and target scopes')
  }

  assertNoBannedSeedCopy(await collectPersistedVisibleCopy(trx))
}
