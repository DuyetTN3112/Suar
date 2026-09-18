import { assessEvidenceEnabled } from './task_readiness_evidence_assessor.js'
import {
  type FindingTarget,
  addFinding,
  addRequiredTextFinding,
  hasMeaningfulListContent,
  isMeaningfulText,
  normalizeFindings,
  normalizeText,
  READY_DEPENDENCY_STATES,
} from './task_readiness_findings.js'
import { assessSpecification } from './task_readiness_specification_assessor.js'

import type {
  TvaJsonValue,
  TvaEvidenceReadinessState,
  TvaWorkReadinessState,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskEvidenceContractV1,
  TaskReadinessFindingV1,
  TaskReadinessResultV1,
  TaskSpecificationSectionV1,
  TaskSupportingReferenceV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export interface TaskReadinessAssessmentInput {
  readonly policyVersion: string | null
  readonly assessedAt: string
  readonly specification: {
    readonly richContent?: TvaJsonValue
    readonly plainText: string
    readonly sections: readonly TaskSpecificationSectionV1[]
  }
  readonly work: TaskWorkContractV1
  readonly evidence: TaskEvidenceContractV1 | null
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly creatorConfirmed: boolean
  readonly assigneeId: string | null
  readonly declarations: {
    readonly constraintsAddressed: boolean
    readonly dependenciesAddressed: boolean
  }
  readonly snapshotCapabilityAvailable: boolean
  readonly inheritedFindings?: readonly TaskReadinessFindingV1[]
}

function assessWork(
  input: TaskReadinessAssessmentInput,
  workBlockers: FindingTarget,
  warnings: FindingTarget
): void {
  const { work } = input
  addRequiredTextFinding(
    workBlockers,
    work.action,
    'TVA.WORK.ACTION_MISSING',
    'work.action',
    'Action'
  )
  addRequiredTextFinding(
    workBlockers,
    work.object,
    'TVA.WORK.OBJECT_MISSING',
    'work.object',
    'Object'
  )
  addRequiredTextFinding(
    workBlockers,
    work.problemStatement,
    'TVA.WORK.PROBLEM_STATEMENT_MISSING',
    'work.problemStatement',
    'Problem statement'
  )
  addRequiredTextFinding(
    workBlockers,
    work.desiredOutcome,
    'TVA.WORK.OUTCOME_MISSING',
    'work.desiredOutcome',
    'Desired outcome'
  )

  if (!hasMeaningfulListContent(work.scope)) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.SCOPE_MISSING',
      fieldPath: 'work.scope',
      sourcePath: null,
      message: 'In-scope work is not defined.',
      remediationHint: 'List the concrete systems, behaviours, or outputs that are in scope.',
    })
  }
  if (!hasMeaningfulListContent(work.deliverables)) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.DELIVERABLE_MISSING',
      fieldPath: 'work.deliverables',
      sourcePath: null,
      message: 'No concrete deliverable is defined.',
      remediationHint: 'Define what must be produced, its format, and expected location.',
    })
  }
  if (!hasMeaningfulListContent(work.qualityRequirements)) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.QUALITY_REQUIREMENT_MISSING',
      fieldPath: 'work.qualityRequirements',
      sourcePath: null,
      message: 'No meaningful quality requirement is defined.',
      remediationHint: 'Describe the quality property, where it applies, and how it will be observed.',
    })
  }
  if (!work.acceptanceCriteria.some((criterion) => isMeaningfulText(criterion.statement))) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.ACCEPTANCE_CRITERION_MISSING',
      fieldPath: 'work.acceptanceCriteria',
      sourcePath: null,
      message: 'No meaningful acceptance criterion is defined.',
      remediationHint: 'Add observable, testable conditions for completion.',
    })
  }
  const normalizedCriteria = work.acceptanceCriteria
    .map((criterion) => normalizeText(criterion.statement))
    .filter(Boolean)
  if (new Set(normalizedCriteria).size !== normalizedCriteria.length) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.DUPLICATE_ACCEPTANCE_CRITERION',
      fieldPath: 'work.acceptanceCriteria',
      sourcePath: null,
      message: 'The acceptance contract contains duplicated criteria.',
      remediationHint: 'Merge duplicate criteria and keep one stable criterion identifier.',
    })
  }
  const unavailableDependency = work.dependencies.find(
    (dependency) => !READY_DEPENDENCY_STATES.has(normalizeText(dependency.state))
  )
  if (unavailableDependency) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.DEPENDENCY_NOT_READY',
      fieldPath: 'work.dependencies',
      sourcePath: `work.dependencies.${unavailableDependency.id}`,
      message: 'A required dependency is not ready.',
      remediationHint: 'Resolve the dependency or explicitly change task scope before assignment.',
    })
  }
  if (!input.assigneeId) {
    addFinding(warnings, {
      code: 'TVA.WORK.ASSIGNEE_MISSING',
      severity: 'warning',
      fieldPath: 'assigneeId',
      sourcePath: null,
      message: 'No assignee is selected yet.',
      remediationHint: 'Assign a project member before moving the task into Done.',
    })
  }
  if (!input.creatorConfirmed) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.CREATOR_CONFIRMATION_MISSING',
      fieldPath: 'creatorConfirmed',
      sourcePath: null,
      message: 'The creator has not confirmed the resolved contract.',
      remediationHint: 'Review the resolved brief and explicitly confirm the current version.',
    })
  }
}

function isDraft(input: TaskReadinessAssessmentInput): boolean {
  return ![
    input.work.action,
    input.work.object,
    input.work.problemStatement,
    input.work.desiredOutcome,
    input.specification.plainText,
  ].some((value) => isMeaningfulText(value))
}

export function assessTaskReadiness(input: TaskReadinessAssessmentInput): TaskReadinessResultV1 {
  const workBlockers: TaskReadinessFindingV1[] = []
  const evidenceBlockers: TaskReadinessFindingV1[] = []
  const warnings: TaskReadinessFindingV1[] = []
  const policyVersion = input.policyVersion?.trim() || 'missing'
  const policyAvailable = policyVersion !== 'missing'

  if (!policyAvailable) {
    addFinding(workBlockers, {
      code: 'TVA.READINESS.POLICY_VERSION_MISSING',
      fieldPath: 'policyVersion',
      sourcePath: null,
      message: 'Readiness policy version is missing.',
      remediationHint: 'Select and persist an approved deterministic readiness policy version.',
    })
  }

  assessSpecification(input, workBlockers, warnings)
  assessWork(input, workBlockers, warnings)

  for (const inheritedFinding of input.inheritedFindings ?? []) {
    if (inheritedFinding.severity === 'warning') {
      warnings.push({ ...inheritedFinding })
    } else if (inheritedFinding.code.startsWith('TVA.EVIDENCE.')) {
      evidenceBlockers.push({ ...inheritedFinding })
    } else {
      workBlockers.push({ ...inheritedFinding })
    }
  }

  let evidenceState: TvaEvidenceReadinessState = 'not_configured'
  if (input.evidence?.mode === 'operational_only') {
    evidenceState = 'not_applicable'
    if (input.evidence.profileEligibility) {
      addFinding(evidenceBlockers, {
        code: 'TVA.EVIDENCE.OPERATIONAL_PROFILE_ELIGIBILITY_CONFLICT',
        fieldPath: 'evidence.profileEligibility',
        sourcePath: null,
        message: 'Operational-only work cannot be profile-eligible.',
        remediationHint: 'Disable profile eligibility or switch to Evidence-enabled mode.',
      })
      evidenceState = 'needs_clarification'
    }
  } else if (input.evidence?.mode === 'evidence_enabled') {
    assessEvidenceEnabled(input, input.evidence, evidenceBlockers, warnings)
    evidenceState =
      evidenceBlockers.length === 0 && policyAvailable ? 'evidence_ready' : 'needs_clarification'
  } else {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.CONTRACT_MISSING',
      fieldPath: 'evidence',
      sourcePath: null,
      message: 'Evidence mode and contract are not configured.',
      remediationHint: 'Choose Evidence-enabled or explicit Operational-only mode.',
    })
  }

  const normalizedWorkBlockers = normalizeFindings(workBlockers)
  const normalizedEvidenceBlockers = normalizeFindings(evidenceBlockers)
  const assignmentReady =
    policyAvailable && normalizedWorkBlockers.length === 0 && Boolean(input.assigneeId)
  const evidenceReady =
    policyAvailable &&
    input.evidence?.mode === 'evidence_enabled' &&
    normalizedWorkBlockers.length === 0 &&
    normalizedEvidenceBlockers.length === 0
  const workState: TvaWorkReadinessState = assignmentReady
    ? 'ready_to_assign'
    : isDraft(input)
      ? 'draft'
      : 'needs_clarification'

  return {
    policyVersion,
    workState,
    evidenceState: evidenceReady
      ? 'evidence_ready'
      : input.evidence?.mode === 'evidence_enabled'
        ? 'needs_clarification'
        : evidenceState,
    assignmentReady,
    evidenceReady,
    blockers: normalizeFindings([...normalizedWorkBlockers, ...normalizedEvidenceBlockers]),
    warnings: normalizeFindings(warnings),
    assessedAt: input.assessedAt,
  }
}
