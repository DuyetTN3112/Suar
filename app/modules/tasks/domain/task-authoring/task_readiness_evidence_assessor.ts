import {
  type FindingTarget,
  addFinding,
  isMeaningfulText,
} from './task_readiness_findings.js'

import { TVA_PRIVACY_CLASSIFICATIONS } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskEvidenceContractV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export interface EvidenceAssessmentInput {
  readonly work: TaskWorkContractV1
  readonly assigneeId: string | null
  readonly snapshotCapabilityAvailable: boolean
}

export function assessEvidenceEnabled(
  input: EvidenceAssessmentInput,
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
