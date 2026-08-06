import type {
  AssignmentAcknowledgementFact,
  AssignmentClarificationRequestFact,
} from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'

export function assignmentAcknowledgementRequestHashInput(
  fact: Omit<AssignmentAcknowledgementFact, 'acknowledgedAt'>
): Record<string, unknown> {
  return {
    schemaVersion: 'suar.task_assignment_acknowledgement_request.v1',
    assignmentId: fact.assignmentId,
    assigneeId: fact.assigneeId,
    snapshotId: fact.snapshotId,
    snapshotHash: fact.snapshotHash,
    contractVersionHead: fact.contractVersionHead,
  }
}

export function assignmentClarificationRequestHashInput(input: {
  request: Omit<AssignmentClarificationRequestFact, 'requestId' | 'requestedAt'>
  reason: string
}): Record<string, unknown> {
  return {
    schemaVersion: 'suar.task_assignment_clarification_request.v1',
    assignmentId: input.request.assignmentId,
    requestedBy: input.request.requestedBy,
    snapshotId: input.request.snapshotId,
    snapshotHash: input.request.snapshotHash,
    contractVersionHead: input.request.contractVersionHead,
    reason: input.reason.trim(),
  }
}
