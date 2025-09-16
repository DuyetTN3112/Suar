import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import { SEEDED_TASK_SPECS } from './task_specs.js'
import type {
  OrgKey,
  ProjectKey,
  SeededAssignment,
  SeededOrg,
  SeededTask,
  SeededUser,
  StatusSlug,
  UserKey,
} from './types.js'

export async function seedTasks(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, { id: string; name: string; organizationId: string }>,
  organizations: Record<OrgKey, SeededOrg>,
  statuses: Record<OrgKey, Record<StatusSlug, string>>
): Promise<Record<string, SeededTask>> {
  const result: Record<string, SeededTask> = {}

  for (const spec of SEEDED_TASK_SPECS) {
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

    const taskStatusId = statuses[spec.organization][spec.taskStatus]

    const payload = {
      title: spec.title,
      description: spec.description,
      status: spec.status,
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
      estimated_budget: spec.estimatedBudget,
      external_applications_count: spec.visibility === 'internal' ? 0 : 2,
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
  tasks: Record<string, SeededTask>
): Promise<Record<string, SeededAssignment>> {
  const result: Record<string, SeededAssignment> = {}

  for (const spec of SEEDED_TASK_SPECS.filter((item) => item.assignee)) {
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
      assignment_type:
        spec.visibility === 'internal'
          ? 'member'
          : spec.assignee?.startsWith('freelancer')
            ? 'freelancer'
            : 'member',
      assignment_status: spec.status === 'done' ? 'completed' : 'active',
      estimated_hours: spec.assignmentEstimatedHours ?? 8,
      actual_hours:
        spec.status === 'done'
          ? (spec.assignmentActualHours ?? spec.assignmentEstimatedHours ?? 8)
          : (spec.assignmentActualHours ?? null),
      progress_percentage: spec.status === 'done' ? 100 : spec.status === 'in_review' ? 90 : 55,
      completion_notes:
        spec.status === 'done' ? 'Seeded completion note for local verification.' : null,
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
): Promise<void> {
  const rows = [
    {
      taskKey: 'marketplace-content-pass',
      applicant: 'freelancerOne',
      status: 'pending',
      source: 'public_listing',
      message:
        'Tôi có kinh nghiệm viết tài liệu kỹ thuật cho B2B SaaS và có thể bàn giao trong 3 ngày.',
    },
    {
      taskKey: 'marketplace-content-pass',
      applicant: 'freelancerTwo',
      status: 'approved',
      source: 'referral',
      message: 'Đã từng triển khai content guide cho marketplace workflow tương tự.',
    },
    {
      taskKey: 'marketplace-qa-pipeline',
      applicant: 'freelancerOne',
      status: 'pending',
      source: 'public_listing',
      message: 'Có thể hỗ trợ thiết kế QA checklist và checklist verify deliverables.',
    },
  ] as const

  for (const row of rows) {
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
      expected_rate: row.applicant === 'freelancerOne' ? 600000 : 450000,
      portfolio_links: runtime.toJson([
        `https://portfolio.local/${users[row.applicant].username.toLowerCase()}`,
        `https://github.com/${users[row.applicant].username.toLowerCase()}`,
      ]),
      applied_at: runtime.isoDaysAgo(2),
      reviewed_by: row.status === 'approved' ? users.owner.id : null,
      reviewed_at: row.status === 'approved' ? runtime.isoDaysAgo(1) : null,
      rejection_reason: null,
    }

    if (existing) {
      await applyWhere(trx.from('task_applications'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('task_applications')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}

export async function seedTaskRequiredSkills(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  tasks: Record<string, SeededTask>,
  skills: Record<string, string>
): Promise<void> {
  for (const spec of SEEDED_TASK_SPECS) {
    for (const code of spec.requiredSkills) {
      const task = runtime.requireValue(tasks[spec.key], `task-required-skills:${spec.key}`)
      const skillId = runtime.requireValue(skills[code], `skill:${code}`)
      const where = {
        task_id: task.id,
        skill_id: skillId,
      }
      const existing = await findRow(trx, 'task_required_skills', where)
      const payload = {
        required_level_code:
          code === 'leadership' || code === 'problem_solving'
            ? 'senior'
            : code === 'communication'
              ? 'middle'
              : 'junior',
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
