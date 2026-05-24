import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import ReviewEvidence from '#modules/reviews/infra/models/review_evidence'
import TaskSelfAssessment from '#modules/tasks/infra/models/task_self_assessment'
import BuildUserWorkHistoryCommand from '#modules/users/actions/commands/build_user_work_history_command'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import UserWorkHistory from '#modules/users/infra/models/user_work_history'
import {
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface BuildUserWorkHistoryResult {
  userId: string
  totalCompletedAssignments: number
  inserted: number
  updated: number
}

interface ActorRef {
  id: string
}

interface TaskRef {
  id: string
  title: string
}

interface AssignmentRef {
  id: string
}

interface WorkHistoryRow {
  id: string
  task_id: string
  task_assignment_id: string
  task_title: string
  estimated_hours: number | null
  actual_hours: number | null
  was_on_time: boolean | null
  overall_quality_score: number | null
  skill_scores: { skill_name?: string; assigned_level_code?: string }[]
  evidence_links: { evidence_type?: string; title?: string }[]
  knowledge_artifacts: { type?: string; content?: string }[]
  estimated_business_value: string | null
}

interface AuditLogSummary {
  action?: string
  entityType?: string
  entityId?: string
  createdAt?: string | Date
  new_values?: {
    full_rebuild?: boolean
    total_completed_assignments?: number
    inserted?: number
    updated?: number
  } | null
}

interface AuditLogRow {
  action?: string
  entity_type?: string
  entity_id?: string
  created_at?: string | Date
  new_values?: AuditLogSummary['new_values']
}

interface EvidenceSeed {
  evidence_type: 'pull_request' | 'document_link'
  url: string
  title: string
  description: string
  uploaded_by: string
}

interface SelfAssessmentSeed {
  overall_satisfaction: number
  difficulty_felt: 'as_expected' | 'easier_than_expected' | 'harder_than_expected'
  confidence_level: number
  what_went_well: string
  what_would_do_different: string
  skills_felt_strong: string[]
}

interface WorkHistorySeedInput {
  reviewee: ActorRef
  task: TaskRef
  assignment: AssignmentRef
  sessionId: string
}

export default class WorkHistoryScenario {
  public readonly reviewee: ActorRef
  public readonly task: TaskRef
  public readonly assignment: AssignmentRef

  private constructor(private readonly input: WorkHistorySeedInput) {
    this.reviewee = input.reviewee
    this.task = input.task
    this.assignment = input.assignment
  }

  public static async build(): Promise<WorkHistoryScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.createFreelancer()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      due_date: DateTime.now().plus({ days: 3 }),
      actual_time: 6,
      estimated_time: 8,
    })

    await db
      .from('tasks')
      .where('id', task.id)
      .update({
        updated_at: DateTime.now().toSQL(),
        task_type: 'feature_development',
        business_domain: 'internal_tooling',
        problem_category: 'automation',
        role_in_task: 'lead',
        autonomy_level: 'autonomous',
        collaboration_type: 'solo',
        tech_stack: JSON.stringify(['typescript', 'adonisjs']),
        domain_tags: JSON.stringify(['backend', 'platform']),
        measurable_outcomes: JSON.stringify([{ name: 'latency', target: 'lower' }]),
        impact_scope: 'team',
      })

    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_type: 'freelancer',
      assignment_status: 'completed',
      estimated_hours: 8,
      progress_percentage: 100,
    })
    await assignment
      .merge({
        actual_hours: 6,
        completed_at: DateTime.now().plus({ days: 1 }),
      })
      .save()

    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      manager_review_completed: true,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
      confirmations: [],
    })
    await session
      .merge({
        overall_quality_score: 4,
        completed_at: DateTime.now().plus({ days: 1 }),
      })
      .save()

    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: owner.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_level_code: 'senior',
      comment: 'Strong system design',
    })

    await ReviewEvidence.create({
      review_session_id: session.id,
      evidence_type: 'pull_request',
      url: 'https://example.com/evidence-1',
      title: 'Evidence 1',
      description: 'Initial evidence',
      uploaded_by: owner.id,
    })

    await db.table('task_self_assessments').insert({
      task_assignment_id: assignment.id,
      user_id: reviewee.id,
      overall_satisfaction: 4,
      difficulty_felt: 'as_expected',
      confidence_level: 5,
      what_went_well: 'Clear delivery',
      what_would_do_different: 'Earlier communication',
      blockers_encountered: JSON.stringify([]),
      skills_felt_lacking: JSON.stringify([]),
      skills_felt_strong: JSON.stringify(['typescript']),
      submitted_at: DateTime.now().plus({ days: 1 }).toSQL(),
      created_at: DateTime.now().toSQL(),
      updated_at: DateTime.now().toSQL(),
    })

    return new WorkHistoryScenario({
      reviewee: {
        id: reviewee.id,
      },
      task: {
        id: task.id,
        title: task.title,
      },
      assignment: {
        id: assignment.id,
      },
      sessionId: session.id,
    })
  }

  public async runBuild(
    execCtx: UserActionContext,
    fullRebuild = false
  ): Promise<BuildUserWorkHistoryResult> {
    const command = new BuildUserWorkHistoryCommand(execCtx)

    return command.handle({
      userId: this.reviewee.id,
      ...(fullRebuild ? { fullRebuild: true } : {}),
    })
  }

  public async getWorkHistoryRow(): Promise<WorkHistoryRow> {
    return (await UserWorkHistory.query()
      .where('user_id', this.reviewee.id)
      .where('task_assignment_id', this.assignment.id)
      .firstOrFail())
  }

  public async getWorkHistoryRows(): Promise<WorkHistoryRow[]> {
    return (await UserWorkHistory.query().where('user_id', this.reviewee.id))
  }

  public async getAuditLogs(): Promise<AuditLogSummary[]> {
    const rows = (await db
      .from('audit_events')
      .where('action', 'build_user_work_history')
      .where('entity_type', 'user_work_history')
      .where('entity_id', this.reviewee.id)
      .orderBy('created_at', 'desc')) as AuditLogRow[]
    return rows.map((r) => ({
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      createdAt: r.created_at,
      new_values: r.new_values ?? null,
    }))
  }

  public async updateSessionQuality(overallQualityScore: number): Promise<void> {
    await db.from('review_sessions').where('id', this.input.sessionId).update({
      overall_quality_score: overallQualityScore,
    })
  }

  public async addEvidence(evidence: EvidenceSeed): Promise<void> {
    await ReviewEvidence.create({
      review_session_id: this.input.sessionId,
      ...evidence,
    })
  }

  public async replaceSelfAssessment(input: SelfAssessmentSeed): Promise<void> {
    await TaskSelfAssessment.query().where('task_assignment_id', this.assignment.id).delete()
    await db.table('task_self_assessments').insert({
      task_assignment_id: this.assignment.id,
      user_id: this.reviewee.id,
      overall_satisfaction: input.overall_satisfaction,
      difficulty_felt: input.difficulty_felt,
      confidence_level: input.confidence_level,
      what_went_well: input.what_went_well,
      what_would_do_different: input.what_would_do_different,
      blockers_encountered: JSON.stringify([]),
      skills_felt_lacking: JSON.stringify([]),
      skills_felt_strong: JSON.stringify(input.skills_felt_strong),
      submitted_at: DateTime.now().plus({ days: 1 }).toSQL(),
      created_at: DateTime.now().toSQL(),
      updated_at: DateTime.now().toSQL(),
    })
  }

  public async seedStaleWorkHistoryRow(): Promise<{
    staleWorkHistoryId: string
    staleTaskId: string
    staleAssignmentId: string
  }> {
    const staleWorkHistoryId = testId()
    const staleTaskId = testId()
    const staleAssignmentId = testId()

    await UserWorkHistory.create({
      id: staleWorkHistoryId,
      user_id: this.reviewee.id,
      task_id: staleTaskId,
      task_assignment_id: staleAssignmentId,
      organization_id: null,
      project_id: null,
      task_title: 'Stale row',
      task_type: 'legacy',
      business_domain: 'legacy',
      problem_category: 'legacy',
      role_in_task: 'legacy',
      autonomy_level: 'legacy',
      collaboration_type: 'legacy',
      tech_stack: [],
      domain_tags: [],
      difficulty: null,
      estimated_hours: null,
      actual_hours: null,
      was_on_time: null,
      days_early_or_late: null,
      measurable_outcomes: [],
      estimated_business_value: null,
      knowledge_artifacts: [],
      overall_quality_score: null,
      skill_scores: [],
      evidence_links: [],
      completed_at: DateTime.now().minus({ days: 10 }),
      is_featured: false,
      is_public: false,
    })

    return {
      staleWorkHistoryId,
      staleTaskId,
      staleAssignmentId,
    }
  }
}
