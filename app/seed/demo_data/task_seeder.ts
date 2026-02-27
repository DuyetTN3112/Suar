import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import { getSeededTaskSpecs } from './task_specs.js'
import type {
  OrgKey,
  ProjectKey,
  SeededAssignment,
  SeededOrg,
  SeededTask,
  SeededUser,
  StatusSlug,
  TaskSpec,
  UserKey,
} from './types.js'

import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/proficiency_level_constants'
import { findMatchingProficiencyLevel } from '#modules/skills/public_contracts/proficiency_level_mapping'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { DEFAULT_TASK_STATUSES } from '#modules/tasks/public_contracts/task_constants'

export interface SeedTaskApplicationSpec {
  taskKey: string
  applicant: UserKey
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  source: 'public_listing' | 'referral'
  message: string
  reviewedBy?: UserKey
}

export const SEED_TASK_APPLICATION_SPECS: SeedTaskApplicationSpec[] = [
  {
    taskKey: 'owner-marketplace-pending',
    applicant: 'owner',
    status: 'pending',
    source: 'public_listing',
    message:
      'Tôi có kinh nghiệm xây dựng hồ sơ năng lực dựa trên chứng cứ và có thể hỗ trợ hoàn thiện câu chuyện chuyên gia.',
  },
  {
    taskKey: 'owner-marketplace-approved',
    applicant: 'owner',
    status: 'approved',
    source: 'public_listing',
    message:
      'Tôi có thể phụ trách hạng mục này nhờ kinh nghiệm thiết kế quy tắc kiểm định, truy vết dữ liệu và bàn giao liên nhóm.',
    reviewedBy: 'externalContributorTwo',
  },
  {
    taskKey: 'owner-marketplace-rejected',
    applicant: 'owner',
    status: 'rejected',
    source: 'public_listing',
    message:
      'Tôi quan tâm tới hạng mục thiết kế thẻ hồ sơ và có thể đóng góp phần kiến trúc thông tin cùng tiêu chí năng lực.',
    reviewedBy: 'externalContributorOne',
  },
  {
    taskKey: 'owner-marketplace-withdrawn',
    applicant: 'owner',
    status: 'withdrawn',
    source: 'public_listing',
    message:
      'Tôi xin rút đề xuất để ưu tiên cam kết phát hành hiện tại và tránh ảnh hưởng tiến độ của dự án.',
  },
  {
    taskKey: 'marketplace-content-pass',
    applicant: 'externalContributorOne',
    status: 'pending',
    source: 'public_listing',
    message:
      'Tôi có kinh nghiệm nghiên cứu hành trình người dùng và có thể bàn giao bản đề xuất nội dung trong ba ngày.',
  },
  {
    taskKey: 'marketplace-content-pass',
    applicant: 'externalContributorTwo',
    status: 'approved',
    source: 'referral',
    message:
      'Tôi từng xây dựng hệ thống chỉ số và nội dung hướng dẫn cho quy trình cộng tác chuyên gia.',
    reviewedBy: 'owner',
  },
  {
    taskKey: 'marketplace-qa-pipeline',
    applicant: 'externalContributorOne',
    status: 'pending',
    source: 'public_listing',
    message:
      'Tôi có thể hỗ trợ xây dựng tiêu chí sàng lọc đề xuất và quy trình nghiệm thu kết quả.',
  },
]

export const SEED_TASK_APPLICATION_COUNTS_BY_TASK = SEED_TASK_APPLICATION_SPECS.reduce<
  Record<string, number>
>((counts, row) => {
  if (row.status !== 'withdrawn') {
    counts[row.taskKey] = (counts[row.taskKey] ?? 0) + 1
  }
  return counts
}, {})

export const SEED_APPROVED_APPLICATION_ASSIGNMENT_KEYS = SEED_TASK_APPLICATION_SPECS.filter(
  (row) => row.status === 'approved'
).map((row) => `${row.taskKey}:${row.applicant}`)

export async function seedTasks(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, { id: string; name: string; organizationId: string }>,
  organizations: Record<OrgKey, SeededOrg>,
  statuses: Record<OrgKey, Record<StatusSlug, string>>,
  taskSpecs: TaskSpec[] = getSeededTaskSpecs()
): Promise<Record<string, SeededTask>> {
  const result: Record<string, SeededTask> = {}

  for (const spec of taskSpecs) {
    const project = projects[spec.project]
    const organization = organizations[spec.organization]
    const existing = (await trx
      .from('tasks')
      .where('project_id', project.id)
      .where('title', spec.title)
      .first()) as { id: string } | null
    const id = existing?.id ?? runtime.uuid()
    const assignedUserId = spec.assignee ? users[spec.assignee].id : null
    const dueDate =
      spec.dueDaysOffset >= 0
        ? runtime.isoDaysAhead(spec.dueDaysOffset)
        : runtime.isoDaysAgo(Math.abs(spec.dueDaysOffset))

    const canonicalTaskStatus = spec.taskStatus === 'in_review' ? 'in_testing' : spec.taskStatus
    const taskStatusId = statuses[spec.organization][canonicalTaskStatus]
    const taskStatus = runtime.requireValue(
      DEFAULT_TASK_STATUSES.find((status) => status.slug === canonicalTaskStatus),
      `task-status-definition:${canonicalTaskStatus}`
    )

    const payload = {
      title: spec.title,
      description: spec.description,
      status: toLegacyTaskStatusMirror(taskStatus),
      label: spec.label,
      priority: spec.priority,
      difficulty: spec.difficulty,
      assigned_to: assignedUserId,
      creator_id: users[spec.creator].id,
      updated_by: users[spec.creator].id,
      due_date: dueDate,
      parent_task_id: null,
      estimated_time: spec.assignmentEstimatedHours ?? 8,
      actual_time:
        spec.status === 'done'
          ? (spec.assignmentActualHours ?? spec.assignmentEstimatedHours ?? 8)
          : (spec.assignmentActualHours ?? 0),
      organization_id: organization.id,
      project_id: project.id,
      task_visibility: spec.visibility,
      application_deadline:
        spec.visibility === 'internal'
          ? null
          : runtime.isoDaysAhead(spec.applicationDeadlineDaysAhead ?? 4),
      task_type: spec.taskType,
      acceptance_criteria: spec.acceptanceCriteria.join('\n'),
      verification_method: spec.verificationMethod,
      expected_deliverables: runtime.toJson(spec.expectedDeliverables),
      context_background: spec.contextBackground,
      impact_scope: spec.impactScope,
      tech_stack: runtime.toJson(spec.techStack),
      environment: spec.environment,
      collaboration_type: spec.collaborationType,
      complexity_notes: spec.complexityNotes,
      measurable_outcomes: runtime.toJson(spec.measurableOutcomes),
      learning_objectives: runtime.toJson(spec.learningObjectives),
      domain_tags: runtime.toJson(spec.domainTags),
      role_in_task: spec.roleInTask,
      autonomy_level: spec.autonomyLevel,
      problem_category: spec.problemCategory,
      business_domain: spec.businessDomain,
      estimated_users_affected: spec.estimatedUsersAffected,
      external_applications_count: SEED_TASK_APPLICATION_COUNTS_BY_TASK[spec.key] ?? 0,
      sort_order: Object.keys(result).length,
      task_status_id: taskStatusId,
      created_at: runtime.isoDaysAgo(20),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('tasks').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('tasks')
        .insert({ id, ...payload })
    }

    result[spec.key] = {
      id,
      title: spec.title,
      organizationId: organization.id,
      projectId: project.id,
    }
  }

  return result
}

export async function seedTaskAssignments(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  tasks: Record<string, SeededTask>,
  taskSpecs: TaskSpec[] = getSeededTaskSpecs()
): Promise<Record<string, SeededAssignment>> {
  const result: Record<string, SeededAssignment> = {}

  for (const spec of taskSpecs.filter((item) => item.assignee)) {
    const task = runtime.requireValue(tasks[spec.key], `task:${spec.key}`)
    const assigneeKey = runtime.requireValue(spec.assignee, `task-assignee:${spec.key}`)
    const assigneeId = users[assigneeKey].id
    const existing = (await trx
      .from('task_assignments')
      .where('task_id', task.id)
      .where('assignee_id', assigneeId)
      .first()) as { id: string } | null
    const id = existing?.id ?? runtime.uuid()

    const completedAt =
      typeof spec.assignmentCompletedDaysAgo === 'number'
        ? runtime.isoDaysAgo(spec.assignmentCompletedDaysAgo)
        : null

    const payload = {
      task_id: task.id,
      assignee_id: assigneeId,
      assigned_by: users[spec.creator].id,
      assignment_type: spec.visibility === 'internal' ? 'member' : 'external_contributor',
      assignment_status: spec.status === 'done' ? 'completed' : 'active',
      estimated_hours: spec.assignmentEstimatedHours ?? 8,
      actual_hours:
        spec.status === 'done'
          ? (spec.assignmentActualHours ?? spec.assignmentEstimatedHours ?? 8)
          : (spec.assignmentActualHours ?? null),
      progress_percentage: spec.status === 'done' ? 100 : spec.status === 'in_review' ? 90 : 55,
      completion_notes:
        spec.status === 'done'
          ? 'Bàn giao được nghiệm thu với chứng cứ hiển thị cho reviewer và trách nhiệm theo dõi tiếp theo đã được ghi nhận.'
          : null,
      verified_by: spec.status === 'done' ? users.orgAdmin.id : null,
      verified_at: completedAt,
      assigned_at: runtime.isoDaysAgo(18),
      completed_at: completedAt,
    }

    if (existing) {
      await trx.from('task_assignments').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('task_assignments')
        .insert({ id, ...payload })
    }

    result[spec.key] = { id, taskId: task.id, assigneeId }
  }

  return result
}

export async function seedTaskApplications(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  tasks: Record<string, SeededTask>
): Promise<Record<string, SeededAssignment>> {
  const approvedAssignments: Record<string, SeededAssignment> = {}

  for (const row of SEED_TASK_APPLICATION_SPECS) {
    const task = runtime.requireValue(tasks[row.taskKey], `task-application:${row.taskKey}`)
    const where = {
      task_id: task.id,
      applicant_id: users[row.applicant].id,
    }
    const existing = await findRow(trx, 'task_applications', where)
    const payload = {
      application_status: row.status,
      application_source: row.source,
      message: row.message,
      portfolio_links: runtime.toJson([
        `https://portfolio.suar.vn/${encodeURIComponent(users[row.applicant].username)}`,
        `https://github.com/${encodeURIComponent(users[row.applicant].username)}`,
      ]),
      applied_at: runtime.isoDaysAgo(2),
      reviewed_by:
        row.status === 'approved' || row.status === 'rejected'
          ? users[row.reviewedBy ?? 'externalContributorTwo'].id
          : null,
      reviewed_at:
        row.status === 'approved' || row.status === 'rejected' ? runtime.isoDaysAgo(1) : null,
      rejection_reason:
        row.status === 'rejected'
          ? 'Hồ sơ hiện chưa thể hiện đủ kinh nghiệm thiết kế hệ thống giao diện ở quy mô sản phẩm.'
          : null,
    }

    if (existing) {
      await applyWhere(trx.from('task_applications'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('task_applications')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }

    if (row.status === 'approved') {
      const reviewerKey = row.reviewedBy ?? 'owner'
      const assignmentWhere = {
        task_id: task.id,
        assignee_id: users[row.applicant].id,
      }
      const existingAssignment = await findRow(trx, 'task_assignments', assignmentWhere)
      const assignmentId = existingAssignment?.id ?? runtime.uuid()
      const assignmentPayload = {
        assigned_by: users[reviewerKey].id,
        assignment_type: 'external_contributor',
        assignment_status: 'active',
        estimated_hours: 12,
        actual_hours: null,
        progress_percentage: 25,
        completion_notes: null,
        verified_by: null,
        verified_at: null,
        assigned_at: runtime.isoDaysAgo(1),
        completed_at: null,
      }

      if (existingAssignment) {
        await applyWhere(trx.from('task_assignments'), assignmentWhere).update(assignmentPayload)
      } else {
        await trx
          .insertQuery()
          .table('task_assignments')
          .insert({ id: assignmentId, ...assignmentWhere, ...assignmentPayload })
      }

      approvedAssignments[row.taskKey] = {
        id: assignmentId,
        taskId: task.id,
        assigneeId: users[row.applicant].id,
      }

      await trx
        .from('tasks')
        .where('id', task.id)
        .update({ assigned_to: users[row.applicant].id, updated_at: runtime.isoDaysAgo(1) })

      const membershipWhere = {
        organization_id: task.organizationId,
        user_id: users[row.applicant].id,
      }
      const existingMembership = await findRow(trx, 'organization_users', membershipWhere)
      if (existingMembership) {
        await applyWhere(trx.from('organization_users'), membershipWhere).update({
          status: 'approved',
          updated_at: runtime.isoDaysAgo(1),
        })
      } else {
        await trx
          .insertQuery()
          .table('organization_users')
          .insert({
            ...membershipWhere,
            org_role: 'org_member',
            status: 'approved',
            invited_by: null,
            created_at: runtime.isoDaysAgo(1),
            updated_at: runtime.isoDaysAgo(1),
          })
      }

      await trx
        .from('task_applications')
        .where('task_id', task.id)
        .where('application_status', 'pending')
        .whereNot('applicant_id', users[row.applicant].id)
        .update({
          application_status: 'rejected',
          reviewed_by: users[reviewerKey].id,
          reviewed_at: runtime.isoDaysAgo(1),
          rejection_reason: 'Một ứng viên khác đã được lựa chọn cho công việc này.',
        })
    }
  }

  for (const task of Object.values(tasks)) {
    const applicationCount = (await trx
      .from('task_applications')
      .where('task_id', task.id)
      .whereNot('application_status', 'withdrawn')
      .count('* as total')
      .first()) as { total: string | number } | null
    await trx
      .from('tasks')
      .where('id', task.id)
      .update({ external_applications_count: Number(applicationCount?.total ?? 0) })
  }

  return approvedAssignments
}

export async function seedTaskRequiredSkills(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  tasks: Record<string, SeededTask>,
  skills: Record<string, string>,
  taskSpecs: TaskSpec[] = getSeededTaskSpecs()
): Promise<void> {
  const dbLevels = (await trx
    .from('proficiency_levels')
    .select('id', 'code', 'display_name', 'short_name')) as {
    id: string
    code: string
    display_name: string | null
    short_name: string | null
  }[]
  const levelMap: Record<string, string> = {}
  for (const level of dbLevels) {
    levelMap[level.code] = level.id
  }

  for (const spec of taskSpecs) {
    for (const code of spec.requiredSkills) {
      const task = runtime.requireValue(tasks[spec.key], `task-required-skills:${spec.key}`)
      const skillId = runtime.requireValue(skills[code], `skill:${code}`)
      const where = {
        task_id: task.id,
        skill_id: skillId,
      }
      const existing = await findRow(trx, 'task_required_skills', where)

      const levelCode =
        code === 'leadership' || code === 'problem_solving'
          ? CanonicalProficiencyLevelCode.L10
          : code === 'communication'
            ? CanonicalProficiencyLevelCode.L7
            : CanonicalProficiencyLevelCode.L4
      const levelId =
        levelMap[levelCode] ?? findMatchingProficiencyLevel(dbLevels, levelCode)?.id ?? null

      const payload = {
        required_public_proficiency_code: levelCode,
        minimum_level_id: levelId,
        target_level_id: levelId,
        assessment_ceiling_level_id: levelId,
        requirement_source: 'imported_legacy',
        is_mandatory: true,
        created_at: runtime.isoDaysAgo(15),
      }

      if (existing) {
        await applyWhere(trx.from('task_required_skills'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('task_required_skills')
          .insert({ id: runtime.uuid(), ...where, ...payload })
      }
    }
  }
}
