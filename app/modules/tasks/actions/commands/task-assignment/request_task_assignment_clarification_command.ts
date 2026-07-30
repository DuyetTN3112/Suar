import { BaseCommand } from '#modules/tasks/actions/base_command'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  TaskAssignmentExpectedSnapshotDTO,
  TaskAssignmentInteractionCommandDependencies,
} from '#modules/tasks/actions/commands/internal/task_assignment_interaction_command_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  decideAssignmentClarificationRequest,
  TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES,
  type AssignmentClarificationRequestFact,
  type AssignmentSnapshotIdentity,
} from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'
import { assignmentClarificationRequestHashInput } from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'

interface RequestTaskAssignmentClarificationResult {
  code: string
  acknowledgementEffect: 'none' | 'created'
  fact: AssignmentClarificationRequestFact
  replayed: boolean
}

export interface RequestTaskAssignmentClarificationDTO
  extends TaskAssignmentExpectedSnapshotDTO {
  readonly reason: string
}

export default class RequestTaskAssignmentClarificationCommand extends BaseCommand<
  RequestTaskAssignmentClarificationDTO,
  RequestTaskAssignmentClarificationResult
> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskAssignmentInteractionCommandDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  async handle(
    dto: RequestTaskAssignmentClarificationDTO
  ): Promise<RequestTaskAssignmentClarificationResult> {
    return this.execute(dto)
  }

  async execute(
    dto: RequestTaskAssignmentClarificationDTO
  ): Promise<RequestTaskAssignmentClarificationResult> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()
    const reason = dto.reason.trim()
    if (!dto.idempotencyKey.trim() || !reason) {
      throw new ValidationException(
        'Assignment clarification reason and idempotency key are required'
      )
    }
    const expectedSnapshot: AssignmentSnapshotIdentity = {
      snapshotId: dto.snapshotId,
      snapshotHash: dto.snapshotHash,
      contractVersionHead: dto.contractVersionHead,
    }
    const idempotencyKey = dto.idempotencyKey.trim()
    const requestHash = this.dependencies.hasher.hash(
      assignmentClarificationRequestHashInput({
        request: {
          assignmentId: dto.assignmentId,
          requestedBy: actorId,
          snapshotId: dto.snapshotId,
          snapshotHash: dto.snapshotHash,
          contractVersionHead: dto.contractVersionHead,
        },
        reason,
      })
    )

    return this.dependencies.transactions.run(async (transaction) => {
      const replay = await this.dependencies.repository.findClarificationReplay(
        {
          actorId,
          assignmentId: dto.assignmentId,
          snapshotId: dto.snapshotId,
          snapshotHash: dto.snapshotHash,
          contractVersionHead: dto.contractVersionHead,
          idempotencyKey,
          requestHash,
        },
        transaction
      )
      if (replay) {
        return {
          code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.clarificationRecorded,
          acknowledgementEffect: 'none' as const,
          fact: replay.fact,
          replayed: true,
        }
      }
      const interactionContext = await this.dependencies.repository.lockInteractionContext(
        dto.assignmentId,
        transaction
      )
      if (!interactionContext) throw new NotFoundException('Assignment Contract not found')
      const decision = decideAssignmentClarificationRequest({
        context: interactionContext,
        actorId,
        expectedSnapshot,
        requestId: this.dependencies.identityFactory.nextId(),
        requestedAt: this.dependencies.clock.nowIso(),
      })
      if (!decision.allowed) {
        throw new BusinessLogicException(decision.code, { reasonCode: decision.code })
      }

      const persisted = await this.dependencies.repository.persistClarification(
        {
          request: decision.request,
          reason,
          idempotencyKey,
          requestHash,
        },
        transaction
      )
      return {
        code: decision.code,
        acknowledgementEffect: decision.acknowledgementEffect,
        fact: persisted.fact,
        replayed: persisted.replayed,
      }
    })
  }

}
