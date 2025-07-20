import { randomUUID } from 'node:crypto'

import SubmitSkillReviewCommand from '#actions/reviews/commands/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import { ProficiencyLevel } from '#constants/user_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import type Skill from '#models/skill'
import {
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

interface ReviewScoreInput {
  skill_id: string
  assigned_level_code: string
  comment?: string
}

interface SubmitReviewInput {
  overall_quality_score?: number
  delivery_timeliness?: string
  requirement_adherence?: number
  communication_quality?: number
  code_quality_score?: number
  proactiveness_score?: number
  would_work_with_again?: boolean
  strengths_observed?: string
  areas_for_improvement?: string
}

export interface SubmitReviewInvalidCase {
  sessionId: string
  errorType: typeof NotFoundException | typeof BusinessLogicException
  execute: () => Promise<unknown>
}

export default class SubmitReviewScenario {
  private constructor(
    public readonly ownerId: string,
    public readonly reviewerId: string,
    public readonly revieweeId: string,
    public readonly sessionId: string,
    public readonly skill1: Skill,
    public readonly skill2: Skill
  ) {}

  public static async build(): Promise<SubmitReviewScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'pending',
      required_peer_reviews: 2,
    })
    const skill1 = await SkillFactory.create({ skill_name: 'JavaScript' })
    const skill2 = await SkillFactory.create({ skill_name: 'TypeScript' })

    return new SubmitReviewScenario(owner.id, reviewer.id, reviewee.id, session.id, skill1, skill2)
  }

  public rating(skillId: string, assignedLevelCode: string, comment?: string): ReviewScoreInput {
    return {
      skill_id: skillId,
      assigned_level_code: assignedLevelCode,
      ...(comment !== undefined && { comment }),
    }
  }

  public async submitManager(
    skillRatings: ReviewScoreInput[],
    overrides: SubmitReviewInput = {}
  ): Promise<Awaited<ReturnType<SubmitSkillReviewCommand['handle']>>> {
    return this.submit(this.ownerId, 'manager', skillRatings, overrides)
  }

  public async submitPeer(
    actorId: string,
    skillRatings: ReviewScoreInput[],
    overrides: SubmitReviewInput = {}
  ): Promise<Awaited<ReturnType<SubmitSkillReviewCommand['handle']>>> {
    return this.submit(actorId, 'peer', skillRatings, overrides)
  }

  public async createPeer(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    return UserFactory.create()
  }

  public async buildInvalidSkillRatingCases(): Promise<SubmitReviewInvalidCase[]> {
    const inactiveSkill = await SkillFactory.create({ is_active: false })

    return [
      {
        sessionId: this.sessionId,
        errorType: NotFoundException,
        execute: () =>
          this.submitPeer(this.reviewerId, [
            this.rating(randomUUID(), ProficiencyLevel.MIDDLE),
          ]),
      },
      {
        sessionId: this.sessionId,
        errorType: BusinessLogicException,
        execute: () =>
          this.submitPeer(this.reviewerId, [
            this.rating(inactiveSkill.id, ProficiencyLevel.MIDDLE),
          ]),
      },
      {
        sessionId: this.sessionId,
        errorType: BusinessLogicException,
        execute: () =>
          this.submitPeer(this.reviewerId, [
            this.rating(this.skill1.id, 'invalid_level'),
          ]),
      },
    ]
  }

  private async submit(
    actorId: string,
    reviewerType: 'manager' | 'peer',
    skillRatings: ReviewScoreInput[],
    overrides: SubmitReviewInput = {}
  ): Promise<Awaited<ReturnType<SubmitSkillReviewCommand['handle']>>> {
    const command = new SubmitSkillReviewCommand(ExecutionContext.system(actorId))

    return command.handle(
      new SubmitSkillReviewDTO({
        review_session_id: this.sessionId,
        reviewer_type: reviewerType,
        skill_ratings: skillRatings,
        overall_quality_score: overrides.overall_quality_score,
        delivery_timeliness: overrides.delivery_timeliness,
        requirement_adherence: overrides.requirement_adherence,
        communication_quality: overrides.communication_quality,
        code_quality_score: overrides.code_quality_score,
        proactiveness_score: overrides.proactiveness_score,
        would_work_with_again: overrides.would_work_with_again,
        strengths_observed: overrides.strengths_observed,
        areas_for_improvement: overrides.areas_for_improvement,
      })
    )
  }
}
