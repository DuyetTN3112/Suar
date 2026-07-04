import { createHash } from 'node:crypto'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type {
  AiProfileAssessmentApprovalUnitOfWork,
  AiProfileCapabilityApprovalRecord,
} from '#modules/reviews/actions/ports/outbound/ai_profile_assessment_approval_unit_of_work'
import { validateProfileAssessmentProposal } from '#modules/reviews/actions/commands/disputes/process_ai_dispute_callback_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

export interface ApproveAiProfileCapabilityProposalDTO {
  disputeId: string
  evaluationId: string
  proposalIndex: number
}

export interface ApproveAiProfileCapabilityProposalResult {
  approvalId: string
  evaluationId: string
  proposalIndex: number
  profileProjection: 'awaiting_task_review_done' | 'available_to_profile'
  approvedAt: string
}

type JsonRecord = Record<string, unknown>

interface ProfileCapabilityProposal {
  capabilityId: string
  capabilityName: string
  declaredMinimumLevel: string | null
  declaredTargetLevel: string | null
  proposedObservedLevel: string
  assessmentStatus: 'supported' | 'higher_evidence' | 'lower_evidence'
  assessedTaskDifficultyLevel: string | null
  taskDifficultyAssessmentStatus:
    | 'supported'
    | 'higher_evidence'
    | 'lower_evidence'
    | 'insufficient_evidence'
    | null
  evidenceRefs: string[]
  raw: JsonRecord
}

function requireActorId(ctx: ReviewActionContext): string {
  if (!ctx.userId) throw new UnauthorizedException()
  return ctx.userId
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function asRecord(value: unknown): JsonRecord {
  if (isRecord(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

function canonicalLevel(value: unknown): string | null {
  const raw = nonEmptyString(value)?.toLowerCase() ?? null
  return raw && isCanonicalProficiencyLevelCode(raw) ? raw : null
}

function payloadHash(value: unknown): string {
  const canonicalize = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') return input
    if (Array.isArray(input)) return input.map(canonicalize)
    const record = input as Record<string, unknown>
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]))
  }
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`
}

function profileAssessment(verdict: JsonRecord): JsonRecord {
  const assessment = verdict['profile_assessment']
  if (!isRecord(assessment) || assessment['status'] !== 'proposal_ready') {
    throw new ValidationException('AI chưa có đề xuất hồ sơ đủ điều kiện để quản trị viên phê duyệt')
  }
  return assessment
}

function workClaim(assessment: JsonRecord): JsonRecord {
  const claim = assessment['work_claim']
  if (!isRecord(claim)) {
    throw new ValidationException('Đề xuất AI thiếu nội dung công việc có căn cứ')
  }
  return claim
}

function proposalAt(assessment: JsonRecord, proposalIndex: number): ProfileCapabilityProposal {
  if (!Number.isSafeInteger(proposalIndex) || proposalIndex < 0) {
    throw new ValidationException('Chỉ số đề xuất năng lực không hợp lệ')
  }
  const raw = Array.isArray(assessment['capability_proposals'])
    ? assessment['capability_proposals'][proposalIndex]
    : undefined
  if (!isRecord(raw)) throw new NotFoundException('Không tìm thấy đề xuất năng lực của AI')
  const capabilityId = nonEmptyString(raw['capability_id'])
  const capabilityName = nonEmptyString(raw['capability_name'])
  const proposedObservedLevel = canonicalLevel(raw['proposed_observed_level'])
  const assessmentStatus = nonEmptyString(raw['assessment_status'])
  const taskDifficultyAssessmentStatus = nonEmptyString(
    raw['task_difficulty_assessment_status']
  )
  if (
    !capabilityId ||
    !capabilityName ||
    !proposedObservedLevel ||
    !assessmentStatus ||
    !['supported', 'higher_evidence', 'lower_evidence'].includes(assessmentStatus)
  ) {
    throw new ValidationException('Đề xuất năng lực không đủ dữ liệu để phê duyệt')
  }
  return {
    capabilityId,
    capabilityName,
    declaredMinimumLevel:
      canonicalLevel(raw['declared_minimum_level']) ??
      canonicalLevel(raw['declared_target_level']),
    declaredTargetLevel: canonicalLevel(raw['declared_target_level']),
    proposedObservedLevel,
    assessmentStatus: assessmentStatus as ProfileCapabilityProposal['assessmentStatus'],
    assessedTaskDifficultyLevel: canonicalLevel(raw['proposed_task_difficulty_level']),
    taskDifficultyAssessmentStatus: [
      'supported',
      'higher_evidence',
      'lower_evidence',
      'insufficient_evidence',
    ].includes(taskDifficultyAssessmentStatus ?? '')
      ? (taskDifficultyAssessmentStatus as ProfileCapabilityProposal['taskDifficultyAssessmentStatus'])
      : null,
    evidenceRefs: stringList(raw['evidence_refs']),
    raw,
  }
}

function requiresTaskDifficultyAssessment(candidate: JsonRecord): boolean {
  const contract = asRecord(candidate['profile_assessment_contract'])
  return (
    contract['schema_version'] === 'suar.profile_assessment_contract.v2' ||
    contract['requires_task_difficulty_assessment'] === true
  )
}

function assertProposalWithinContract(
  candidate: JsonRecord,
  proposal: ProfileCapabilityProposal
): void {
  const contract = asRecord(candidate['profile_assessment_contract'])
  if (contract['profile_eligibility'] !== true) {
    throw new ValidationException('Công việc này không được khai báo để tạo dữ liệu hồ sơ')
  }
  const matched = Array.isArray(contract['capabilities'])
    ? contract['capabilities'].find(
        (item) => isRecord(item) && item['capability_id'] === proposal.capabilityId
      )
    : undefined
  if (!isRecord(matched)) {
    throw new ValidationException('Năng lực AI đề xuất không thuộc phạm vi kỹ năng đã khai báo của task')
  }
  const contractDeclaredMinimumLevel =
    canonicalLevel(matched['declared_minimum_level']) ?? canonicalLevel(matched['minimum_level'])
  if (
    requiresTaskDifficultyAssessment(candidate) &&
    proposal.declaredMinimumLevel !== contractDeclaredMinimumLevel
  ) {
    throw new ValidationException(
      'Mức tối thiểu do AI trả về không khớp điều kiện nhận Task đã được khóa'
    )
  }
}

/**
 * Makes a single AI capability proposal auditable. The command records a
 * governed input only; the profile reader itself still waits for the task
 * Review Board to reach Done.
 */
export default class ApproveAiProfileCapabilityProposalCommand extends BaseCommand<
  ApproveAiProfileCapabilityProposalDTO,
  ApproveAiProfileCapabilityProposalResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly approvals: AiProfileAssessmentApprovalUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(
    dto: ApproveAiProfileCapabilityProposalDTO
  ): Promise<ApproveAiProfileCapabilityProposalResult> {
    return this.handle(dto)
  }

  async handle(
    dto: ApproveAiProfileCapabilityProposalDTO
  ): Promise<ApproveAiProfileCapabilityProposalResult> {
    const actorId = requireActorId(this.execCtx)
    return this.approvals.run(async (persistence) => {
      const role = await persistence.findActorSystemRole(actorId)
      if (role === undefined) throw new NotFoundException('Không tìm thấy người dùng')
      if (role !== 'system_admin' && role !== 'superadmin') {
        throw new ForbiddenException('Chỉ quản trị viên hệ thống được phê duyệt đề xuất hồ sơ của AI')
      }
      const candidate = await persistence.loadCandidateForUpdate(dto.evaluationId)
      if (!candidate || candidate.sourceType !== 'task_review_workflow' || candidate.sourceId !== dto.disputeId) {
        throw new NotFoundException('Không tìm thấy kết quả AI thuộc review công việc này')
      }
      if (candidate.evaluationStatus !== 'completed' || !candidate.workflow) {
        throw new ValidationException('Kết quả AI chưa hoàn tất hoặc review công việc không còn khả dụng')
      }
      if (!['resolved', 'done'].includes(candidate.workflow.status)) {
        throw new ValidationException('Chỉ được phê duyệt đề xuất hồ sơ sau khi review công việc đã được xử lý')
      }
      if (!candidate.workflow.taskAssignmentId || !candidate.workflow.revieweeId) {
        throw new ValidationException('Review công việc thiếu định danh giao việc bất biến')
      }

      const verdict = asRecord(candidate.responsePayload['verdict'])
      validateProfileAssessmentProposal(verdict, {
        required: true,
        taskDifficultyRequired: requiresTaskDifficultyAssessment(candidate.requestPayload),
      })
      const assessment = profileAssessment(verdict)
      const claim = workClaim(assessment)
      const proposal = proposalAt(assessment, dto.proposalIndex)
      assertProposalWithinContract(candidate.requestPayload, proposal)
      if (proposal.evidenceRefs.length === 0) {
        throw new ValidationException('Đề xuất năng lực phải dẫn chiếu ít nhất một căn cứ')
      }

      const persisted: AiProfileCapabilityApprovalRecord =
        await persistence.createOrLoadCapabilityApproval(
          {
            evaluationId: candidate.evaluationId,
            workflowId: candidate.workflow.id,
            taskId: candidate.workflow.taskId,
            taskAssignmentId: candidate.workflow.taskAssignmentId,
            subjectUserId: candidate.workflow.revieweeId,
            proposalIndex: dto.proposalIndex,
            capabilityId: proposal.capabilityId,
            capabilityName: proposal.capabilityName,
            declaredMinimumLevel: proposal.declaredMinimumLevel,
            declaredTargetLevel: proposal.declaredTargetLevel,
            approvedObservedLevel: proposal.proposedObservedLevel,
            assessmentStatus: proposal.assessmentStatus,
            assessedTaskDifficultyLevel: proposal.assessedTaskDifficultyLevel,
            taskDifficultyAssessmentStatus: proposal.taskDifficultyAssessmentStatus,
            workClaim: claim,
            proposalPayload: proposal.raw,
            evidenceRefs: proposal.evidenceRefs,
            profileEffect: String(assessment['profile_effect']),
            sourcePayloadHash: payloadHash({ request: candidate.requestPayload, response: candidate.responsePayload }),
            approvedBy: actorId,
          },
          this.execCtx
        )

      return {
        approvalId: persisted.id,
        evaluationId: persisted.evaluationId,
        proposalIndex: persisted.proposalIndex,
        profileProjection:
          candidate.workflow.status === 'done' ? 'available_to_profile' : 'awaiting_task_review_done',
        approvedAt: persisted.approvedAt.toISOString(),
      }
    })
  }
}
