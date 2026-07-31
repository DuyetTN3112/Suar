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
  decideAssignmentAcknowledgement,
  TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES,
  type AssignmentAcknowledgementFact,
  type AssignmentSnapshotIdentity,
} from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'
import { assignmentAcknowledgementRequestHashInput } from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'

interface AcknowledgeTaskAssignmentResult {
  code: string
  fact: AssignmentAcknowledgementFact
  replayed: boolean
}

export default class AcknowledgeTaskAssignmentContractCommand extends BaseCommand<
  TaskAssignmentExpectedSnapshotDTO,
  AcknowledgeTaskAssignmentResult
> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskAssignmentInteractionCommandDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  async handle(dto: TaskAssignmentExpectedSnapshotDTO): Promise<AcknowledgeTaskAssignmentResult> {
    return this.execute(dto)
  }

  async execute(dto: TaskAssignmentExpectedSnapshotDTO): Promise<AcknowledgeTaskAssignmentResult> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()
    if (!dto.idempotencyKey.trim()) {
      throw new ValidationException('Assignment acknowledgement idempotency key is required')
    }
    const expectedSnapshot: AssignmentSnapshotIdentity = {
      snapshotId: dto.snapshotId,
      snapshotHash: dto.snapshotHash,
      contractVersionHead: dto.contractVersionHead,
    }
    const idempotencyKey = dto.idempotencyKey.trim()
    const requestHash = this.dependencies.hasher.hash(
      assignmentAcknowledgementRequestHashInput({
        assignmentId: dto.assignmentId,
        assigneeId: actorId,
        snapshotId: dto.snapshotId,
        snapshotHash: dto.snapshotHash,
        contractVersionHead: dto.contractVersionHead,
      })
    )

    return this.dependencies.transactions.run(async (transaction) => {
      const replay = await this.dependencies.repository.findAcknowledgementReplay(
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
          code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementIdempotentReplay,
          fact: replay.fact,
          replayed: true,
        }
      }
      const interactionContext = await this.dependencies.repository.lockInteractionContext(
        dto.assignmentId,
        transaction
      )
      if (!interactionContext) throw new NotFoundException('Assignment Contract not found')
      const decision = decideAssignmentAcknowledgement({
        context: interactionContext,
        actorId,
        expectedSnapshot,
        acknowledgedAt: this.dependencies.clock.nowIso(),
      })
      if (!decision.allowed) {
        throw new BusinessLogicException(decision.code, { reasonCode: decision.code })
      }
      const persisted = await this.dependencies.repository.persistAcknowledgement(
        {
          fact: decision.fact,
          idempotencyKey,
          requestHash,
        },
        transaction
      )
      return { code: decision.code, fact: persisted.fact, replayed: persisted.replayed }
    })
  }

}
