import type { TaskAuthoringSummaryRecord } from '#modules/tasks/types/task_records'

export function safeTaskAuthoringAuditValues(summary: TaskAuthoringSummaryRecord) {
  return {
    mode: summary.mode,
    intent: summary.intent,
    specification_version_id: summary.specificationVersionId,
    contract_version_id: summary.contractVersionId,
    head_revision: summary.headRevision,
    policy_version: summary.readiness.policyVersion,
    work_state: summary.readiness.workState,
    evidence_state: summary.readiness.evidenceState,
    assignment_ready: summary.readiness.assignmentReady,
    evidence_ready: summary.readiness.evidenceReady,
    blocker_codes: summary.readiness.blockers.map((finding) => finding.code),
    warning_codes: summary.readiness.warnings.map((finding) => finding.code),
  }
}
