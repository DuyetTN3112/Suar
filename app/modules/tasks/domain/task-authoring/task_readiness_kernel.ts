import {
  TVA_PRIVACY_CLASSIFICATIONS,
  type TvaJsonValue,
  type TvaEvidenceReadinessState,
  type TvaWorkReadinessState,
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

const PLACEHOLDER_PHRASES = new Set([
  '-',
  'n/a',
  'na',
  'none',
  'see docs',
  'see document',
  'tbd',
  'todo',
  'xem docs',
  'xem tài liệu',
  'xem tai lieu',
])

const PLACEHOLDER_TOKENS = new Set([
  'docs',
  'document',
  'later',
  'lieu',
  'n',
  'na',
  'none',
  'see',
  'tai',
  'tbd',
  'todo',
  'xem',
])

const READY_DEPENDENCY_STATES = new Set([
  'available',
  'completed',
  'none_known',
  'not_applicable',
  'ready',
])

const SUPPORTED_RICH_CONTENT_NODE_TYPES = new Set([
  'blockquote',
  'bulletList',
  'codeBlock',
  'diagram',
  'doc',
  'document',
  'hardBreak',
  'heading',
  'horizontalRule',
  'image',
  'listItem',
  'orderedList',
  'paragraph',
  'table',
  'tableCell',
  'tableHeader',
  'tableRow',
  'text',
])

type FindingTarget = TaskReadinessFindingV1[]

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN')
}

function isMeaningfulText(value: string | null | undefined): boolean {
  const normalized = normalizeText(value)
  if (!normalized || PLACEHOLDER_PHRASES.has(normalized)) {
    return false
  }

  const tokens = normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
  return tokens.length > 0 && !tokens.every((token) => PLACEHOLDER_TOKENS.has(token))
}

function hasMeaningfulListContent(
  values: readonly { readonly title: string; readonly description: string }[]
): boolean {
  return values.some(
    (value) => isMeaningfulText(value.title) || isMeaningfulText(value.description)
  )
}

function addFinding(
  target: FindingTarget,
  finding: Omit<TaskReadinessFindingV1, 'severity'> & {
    readonly severity?: TaskReadinessFindingV1['severity']
  }
): void {
  target.push({ severity: finding.severity ?? 'blocker', ...finding })
}

function normalizeFindings(findings: readonly TaskReadinessFindingV1[]): TaskReadinessFindingV1[] {
  const byCode = new Map<string, TaskReadinessFindingV1>()
  for (const finding of [...findings].sort(compareFindings)) {
    if (!byCode.has(finding.code)) {
      byCode.set(finding.code, finding)
    }
  }
  return [...byCode.values()].sort(compareFindings)
}

function compareFindings(left: TaskReadinessFindingV1, right: TaskReadinessFindingV1): number {
  return (
    left.code.localeCompare(right.code) ||
    left.fieldPath.localeCompare(right.fieldPath) ||
    (left.sourcePath ?? '').localeCompare(right.sourcePath ?? '')
  )
}

function addRequiredTextFinding(
  target: FindingTarget,
  value: string | null | undefined,
  code: string,
  fieldPath: string,
  label: string
): void {
  if (!isMeaningfulText(value)) {
    addFinding(target, {
      code,
      fieldPath,
      sourcePath: null,
      message: `${label} is missing or contains only placeholder text.`,
      remediationHint: `Provide a concrete ${label.toLocaleLowerCase('en-US')}.`,
    })
  }
}

function findUnsupportedRichContentNode(
  value: TvaJsonValue,
  path = 'specification.richContent',
  isNode = true
): { type: string; path: string } | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Readonly<Record<string, TvaJsonValue>>
  const type = record['type']
  if (
    isNode &&
    typeof type === 'string' &&
    !SUPPORTED_RICH_CONTENT_NODE_TYPES.has(type)
  ) {
    return { type, path }
  }

  const content = record['content']
  if (!Array.isArray(content)) return null
  for (const [index, child] of content.entries()) {
    const unsupported = findUnsupportedRichContentNode(child as TvaJsonValue, `${path}.content.${index}`, true)
    if (unsupported) return unsupported
  }
  return null
}

function assessSpecification(
  input: TaskReadinessAssessmentInput,
  workBlockers: FindingTarget,
  warnings: FindingTarget
): void {
  const hasSelfContainedText =
    isMeaningfulText(input.specification.plainText) ||
    input.specification.sections.some((section) => isMeaningfulText(section.plainText))
  const hasSupportingReference = input.supportingReferences.length > 0
  const unsupportedNode = input.specification.richContent
    ? findUnsupportedRichContentNode(input.specification.richContent)
    : null

  if (unsupportedNode) {
    addFinding(warnings, {
      code: 'TVA.WORK.UNSUPPORTED_RICH_CONTENT_NODE',
      severity: 'warning',
      fieldPath: 'specification.richContent',
      sourcePath: unsupportedNode.path,
      message: `Rich-content node "${unsupportedNode.type}" is not supported by the resolved brief renderer.`,
      remediationHint:
        'Add a supported accessible representation and keep the plain-text projection complete.',
    })
  }

  if (!hasSelfContainedText) {
    addFinding(workBlockers, {
      code: hasSupportingReference
        ? 'TVA.WORK.LINK_ONLY_CORE_CONTENT'
        : 'TVA.WORK.SPECIFICATION_MISSING',
      fieldPath: 'specification.plainText',
      sourcePath: hasSupportingReference ? 'supportingReferences' : null,
      message: hasSupportingReference
        ? 'Supporting references do not replace self-contained task content.'
        : 'The task specification has no meaningful local content.',
      remediationHint:
        'Restate all execution-critical requirements in the Suar specification and confirm them.',
    })
  }

  const nonTextCriticalSection = input.specification.sections.find(
    (section) => section.critical && !section.hasTextEquivalent
  )
  if (nonTextCriticalSection) {
    addFinding(workBlockers, {
      code: 'TVA.WORK.CRITICAL_NON_TEXT_WITHOUT_EQUIVALENT',
      fieldPath: 'specification.sections',
      sourcePath: `specification.sections.${nonTextCriticalSection.id}`,
      message: 'A critical image or diagram has no text equivalent.',
      remediationHint: 'Add an accessible caption, transcript, or structured textual summary.',
    })
  }

  const inaccessibleRequirementReference = input.supportingReferences.find(
    (reference) =>
      reference.relation === 'requirement_source' &&
      ['restricted', 'unavailable', 'unknown'].includes(reference.accessState)
  )
  if (inaccessibleRequirementReference) {
    addFinding(hasSelfContainedText ? warnings : workBlockers, {
      code: hasSelfContainedText
        ? 'TVA.REFERENCE.UNAVAILABLE_SUPPORTING_REFERENCE'
        : 'TVA.WORK.CRITICAL_REFERENCE_INACCESSIBLE',
      severity: hasSelfContainedText ? 'warning' : 'blocker',
      fieldPath: 'supportingReferences',
      sourcePath: `supportingReferences.${inaccessibleRequirementReference.id}`,
      message: hasSelfContainedText
        ? 'A supporting requirement source is currently inaccessible.'
        : 'Execution-critical information depends on an inaccessible reference.',
      remediationHint: hasSelfContainedText
        ? 'Restore access or replace the supporting reference.'
        : 'Bring the critical content into Suar and confirm that it is complete.',
    })
  }

  const authenticatedReference = input.supportingReferences.find(
    (reference) => reference.accessState === 'authenticated'
  )
  if (authenticatedReference) {
    addFinding(warnings, {
      code: 'TVA.REFERENCE.AUTHENTICATION_REQUIRED',
      severity: 'warning',
      fieldPath: 'supportingReferences',
      sourcePath: `supportingReferences.${authenticatedReference.id}`,
      message: 'A supporting reference requires external authentication.',
      remediationHint: 'Keep the Suar brief self-contained and verify access for intended readers.',
    })
  }
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

function assessEvidenceEnabled(
  input: TaskReadinessAssessmentInput,
  evidence: TaskEvidenceContractV1,
  evidenceBlockers: FindingTarget,
  warnings: FindingTarget
): void {
  if (evidence.requirements.length === 0) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.REQUIREMENT_MISSING',
      fieldPath: 'evidence.requirements',
      sourcePath: null,
      message: 'No expected evidence is defined.',
      remediationHint: 'Define the artifacts or observations required to verify completion.',
    })
  }
  const incompleteRequirement = evidence.requirements.find(
    (requirement) =>
      !isMeaningfulText(requirement.type) ||
      !isMeaningfulText(requirement.title) ||
      !isMeaningfulText(requirement.description)
  )
  if (incompleteRequirement) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.REQUIREMENT_CONTENT_MISSING',
      fieldPath: 'evidence.requirements',
      sourcePath: `evidence.requirements.${incompleteRequirement.id}`,
      message: 'An evidence requirement contains no actionable expected-evidence description.',
      remediationHint: 'Describe the expected artifact, content, and verification value.',
    })
  }

  const criticalCriterionIds = input.work.acceptanceCriteria
    .filter((criterion) => criterion.critical)
    .map((criterion) => criterion.id)
  const mappedCriterionIds = new Set(
    evidence.requirements
      .filter((requirement) => requirement.required)
      .flatMap((requirement) => requirement.criterionIds)
  )
  if (criticalCriterionIds.some((criterionId) => !mappedCriterionIds.has(criterionId))) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.CRITERION_EVIDENCE_MAPPING_MISSING',
      fieldPath: 'evidence.requirements[].criterionIds',
      sourcePath: 'work.acceptanceCriteria',
      message: 'At least one critical acceptance criterion has no required evidence mapping.',
      remediationHint: 'Map every critical criterion to one or more required evidence items.',
    })
  }

  const invalidDeliverableMapping = evidence.requirements.some((requirement) =>
    requirement.deliverableIds.some(
      (deliverableId) =>
        !input.work.deliverables.some((deliverable) => deliverable.id === deliverableId)
    )
  )
  if (invalidDeliverableMapping) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.DELIVERABLE_MAPPING_INVALID',
      fieldPath: 'evidence.requirements[].deliverableIds',
      sourcePath: 'work.deliverables',
      message: 'An evidence requirement references an unknown deliverable.',
      remediationHint: 'Use deliverable identifiers from the current resolved Work Contract.',
    })
  }

  if (!evidence.verificationMethods.some((method) => isMeaningfulText(method))) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.VERIFICATION_METHOD_MISSING',
      fieldPath: 'evidence.verificationMethods',
      sourcePath: null,
      message: 'No meaningful evidence verification method is defined.',
      remediationHint: 'Choose a concrete review, test, inspection, or measurement method.',
    })
  }
  if (
    input.work.acceptanceCriteria.some(
      (criterion) => !isMeaningfulText(criterion.verificationMethod)
    )
  ) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.CRITERION_VERIFICATION_METHOD_MISSING',
      fieldPath: 'work.acceptanceCriteria[].verificationMethod',
      sourcePath: null,
      message: 'An acceptance criterion has no meaningful verification method.',
      remediationHint: 'Specify how each criterion will be objectively verified.',
    })
  }

  const reviewerRoutes =
    evidence.verifierPolicy.reviewerIds.length + evidence.verifierPolicy.reviewerRoleCodes.length
  if (evidence.verifierPolicy.minimumReviewers < 1 || reviewerRoutes === 0) {
    addFinding(warnings, {
      code: 'TVA.EVIDENCE.REVIEWER_ROUTE_MISSING',
      severity: 'warning',
      fieldPath: 'evidence.verifierPolicy',
      sourcePath: null,
      message: 'No reviewer is selected yet.',
      remediationHint: 'Assign a tester before the task enters review or Done.',
    })
  }
  if (
    evidence.verifierPolicy.disallowSelfReview &&
    input.assigneeId !== null &&
    evidence.verifierPolicy.reviewerIds.includes(input.assigneeId) &&
    reviewerRoutes === 1
  ) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.SELF_REVIEW_CONFLICT',
      fieldPath: 'evidence.verifierPolicy.reviewerIds',
      sourcePath: null,
      message: 'The only configured reviewer is the assignee while self-review is disallowed.',
      remediationHint: 'Select another eligible reviewer or reviewer role.',
    })
  }

  const validPrivacyClassifications = new Set<string>(TVA_PRIVACY_CLASSIFICATIONS)
  if (
    !validPrivacyClassifications.has(evidence.privacyClassification) ||
    evidence.requirements.some(
      (requirement) => !validPrivacyClassifications.has(requirement.privacyClassification)
    )
  ) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.PRIVACY_CLASSIFICATION_INVALID',
      fieldPath: 'evidence.privacyClassification',
      sourcePath: null,
      message: 'Evidence privacy classification is missing or invalid.',
      remediationHint: 'Select an approved privacy class for the contract and every evidence item.',
    })
  }

  if (evidence.capabilities.length === 0) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.CAPABILITY_MISSING',
      fieldPath: 'evidence.capabilities',
      sourcePath: null,
      message: 'No relevant capability is selected for assessment.',
      remediationHint: 'Select only capabilities that can be observed in this task.',
    })
  }
  if (
    evidence.capabilities.some(
      (capability) =>
        !capability.observableBehaviours.some((behaviour) => isMeaningfulText(behaviour))
    )
  ) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.OBSERVABLE_BEHAVIOUR_MISSING',
      fieldPath: 'evidence.capabilities[].observableBehaviours',
      sourcePath: null,
      message: 'A capability has no observable behaviour.',
      remediationHint: 'Describe concrete behaviour the reviewer can observe in task evidence.',
    })
  }
  const capabilitiesWithoutCeiling = evidence.capabilities.filter(
    (capability) => capability.assessmentCeiling === null
  )
  if (capabilitiesWithoutCeiling.length > 0) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.ASSESSMENT_CEILING_MISSING',
      fieldPath: 'evidence.capabilities[].assessmentCeiling',
      sourcePath: null,
      message: `Skill chưa có mức trần đánh giá: ${capabilitiesWithoutCeiling
        .map((capability) => capability.capabilityName)
        .join(', ')}.`,
      remediationHint: 'Set the maximum profile level that this task can assess.',
    })
  }
  const capabilitiesWithoutRubric = evidence.capabilities.filter(
    (capability) => capability.rubricVersionId === null
  )
  if (capabilitiesWithoutRubric.length > 0) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.RUBRIC_VERSION_MISSING',
      fieldPath: 'evidence.capabilities[].rubricVersionId',
      sourcePath: null,
      message: `Skill chưa có rubric đã publish: ${capabilitiesWithoutRubric
        .map((capability) => capability.capabilityName)
        .join(', ')}.`,
      remediationHint: 'Publish a rubric for the capability and pin its version before publishing the task.',
    })
  }
  if (
    evidence.capabilities.some((capability) => {
      const { minimumLevel, targetLevel, assessmentCeiling } = capability
      return (
        (minimumLevel !== null && targetLevel !== null && minimumLevel > targetLevel) ||
        (targetLevel !== null && assessmentCeiling !== null && targetLevel > assessmentCeiling) ||
        (minimumLevel !== null && assessmentCeiling !== null && minimumLevel > assessmentCeiling)
      )
    })
  ) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.CAPABILITY_LEVEL_RANGE_INVALID',
      fieldPath: 'evidence.capabilities',
      sourcePath: null,
      message: 'A capability level range is inverted.',
      remediationHint: 'Ensure minimum level is at most target and target is at most ceiling.',
    })
  }
  if (!evidence.profileEligibility) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.PROFILE_ELIGIBILITY_DISABLED',
      fieldPath: 'evidence.profileEligibility',
      sourcePath: null,
      message: 'Evidence-enabled work is not eligible for profile projection.',
      remediationHint:
        'Use Operational-only mode or explicitly enable governed profile eligibility.',
    })
  }
  if (!input.snapshotCapabilityAvailable) {
    addFinding(evidenceBlockers, {
      code: 'TVA.EVIDENCE.SNAPSHOT_CAPABILITY_MISSING',
      fieldPath: 'snapshotCapabilityAvailable',
      sourcePath: null,
      message: 'The complete evidence contract cannot yet be snapshotted.',
      remediationHint: 'Resolve and pin all contract, rubric, reference, and policy versions.',
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
