import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedContext, TaskSpec } from '../types.js'

import {
  countRowsIfTableExists,
  countRowsWhere,
  fail,
} from './seed_integrity_helpers.js'

import { DEFAULT_TASK_STATUSES } from '#modules/tasks/public_contracts/task_constants'

export async function assertTaskAndAssignmentIntegrity(
  trx: TransactionClientContract,
  context: SeedContext,
  taskSpecs: TaskSpec[]
): Promise<void> {
  const mainUser = context.users.owner

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
}

export async function assertSprintAndPackageIntegrity(
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
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
}
