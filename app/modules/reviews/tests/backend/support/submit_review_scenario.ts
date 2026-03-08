import { randomUUID } from 'node:crypto'

import { makeSubmitSkillReviewCommand } from '#composition/review_action_factory'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type SubmitSkillReviewCommand from '#modules/reviews/actions/commands/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type Skill from '#modules/skills/infra/models/skill'
import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/proficiency_level_constants'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  ReviewSessionReviewerAssignmentFactory,
  SkillFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

interface ReviewScoreInput {
  skill_id: string
  assigned_public_proficiency_code: string
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
  errorType: typeof NotFoundException | typeof BusinessLogicException | typeof ValidationException
  execute: () => Promise<unknown>
}

export default class SubmitReviewScenario {
  private constructor(
    public readonly organizationId: string,
    public readonly projectId: string,
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
    if (!task.project_id) {
      throw new Error('TaskFactory must create a task with project_id')
    }
    const projectId = task.project_id
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await ProjectMemberFactory.create({
      project_id: projectId,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'pending',
      creator_reviewer_id: owner.id,
      required_peer_reviews: 2,
    })
    await ReviewSessionReviewerAssignmentFactory.create({
      review_session_id: session.id,
      reviewer_id: owner.id,
      reviewer_type: 'manager',
      assignment_role: 'creator_required',
      is_required: true,
    })
    await ReviewSessionReviewerAssignmentFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'peer',
      assignment_role: 'peer_required',
      is_required: true,
    })
    const skill1 = await SkillFactory.create({ skill_name: 'JavaScript' })
    const skill2 = await SkillFactory.create({ skill_name: 'TypeScript' })

    return new SubmitReviewScenario(
      org.id,
      projectId,
      owner.id,
      reviewer.id,
      reviewee.id,
      session.id,
      skill1,
      skill2
    )
  }

  public rating(skillId: string, assignedLevelCode: string, comment?: string): ReviewScoreInput {
    return {
      skill_id: skillId,
      assigned_public_proficiency_code: assignedLevelCode,
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
    const peer = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: this.organizationId,
      user_id: peer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await ProjectMemberFactory.create({
      project_id: this.projectId,
      user_id: peer.id,
      project_role: 'project_member',
    })
    await ReviewSessionReviewerAssignmentFactory.create({
      review_session_id: this.sessionId,
      reviewer_id: peer.id,
      reviewer_type: 'peer',
      assignment_role: 'peer_optional',
      is_required: false,
    })
    return peer
  }

  public async createOutsider(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    return UserFactory.create()
  }

  public async createOrgMemberOutsider(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    const user = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: this.organizationId,
      user_id: user.id,
      org_role: 'org_member',
      status: 'approved',
    })
    return user
  }

  public async buildInvalidSkillRatingCases(): Promise<SubmitReviewInvalidCase[]> {
    const inactiveSkill = await SkillFactory.create({ is_active: false })

    return [
      {
        sessionId: this.sessionId,
        errorType: NotFoundException,
        execute: () =>
          this.submitPeer(this.reviewerId, [
            this.rating(randomUUID(), CanonicalProficiencyLevelCode.L7),
          ]),
      },
      {
        sessionId: this.sessionId,
        errorType: BusinessLogicException,
        execute: () =>
          this.submitPeer(this.reviewerId, [
            this.rating(inactiveSkill.id, CanonicalProficiencyLevelCode.L7),
          ]),
      },
      {
        sessionId: this.sessionId,
        errorType: ValidationException,
        execute: () =>
          this.submitPeer(this.reviewerId, [this.rating(this.skill1.id, 'invalid_level')]),
      },
    ]
  }

  private async submit(
    actorId: string,
    reviewerType: 'manager' | 'peer',
    skillRatings: ReviewScoreInput[],
    overrides: SubmitReviewInput = {}
  ): Promise<Awaited<ReturnType<SubmitSkillReviewCommand['handle']>>> {
    const command = makeSubmitSkillReviewCommand(makeSystemReviewActionContext(actorId))
    const dtoInput: Partial<SubmitSkillReviewDTO> = {
      review_session_id: this.sessionId,
      reviewer_type: reviewerType,
      skill_ratings: skillRatings,
    }

    if (overrides.overall_quality_score !== undefined) {
      dtoInput.overall_quality_score = overrides.overall_quality_score
    }
    if (overrides.delivery_timeliness !== undefined) {
      dtoInput.delivery_timeliness = overrides.delivery_timeliness
    }
    if (overrides.requirement_adherence !== undefined) {
      dtoInput.requirement_adherence = overrides.requirement_adherence
    }
    if (overrides.communication_quality !== undefined) {
      dtoInput.communication_quality = overrides.communication_quality
    }
    if (overrides.code_quality_score !== undefined) {
      dtoInput.code_quality_score = overrides.code_quality_score
    }
    if (overrides.proactiveness_score !== undefined) {
      dtoInput.proactiveness_score = overrides.proactiveness_score
    }
    if (overrides.would_work_with_again !== undefined) {
      dtoInput.would_work_with_again = overrides.would_work_with_again
    }
    if (overrides.strengths_observed !== undefined) {
      dtoInput.strengths_observed = overrides.strengths_observed
    }
    if (overrides.areas_for_improvement !== undefined) {
      dtoInput.areas_for_improvement = overrides.areas_for_improvement
    }

    return command.handle(new SubmitSkillReviewDTO(dtoInput))
  }
}
