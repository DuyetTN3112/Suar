import {
  recordArray,
  recordValue,
  stringArray,
  stringField,
} from './review_report_party_context_loader.js'

export const SUAR_PROFILE_SCORING_POLICY = {
  version: 'performance_v1',
  authority: 'Suar canonical calculation; AI is advisory only',
  performance_formula: {
    quality_score: 0.35,
    delivery_score: 0.3,
    difficulty_bonus: 0.2,
    consistency_score: 0.15,
  },
  difficulty_weights: {
    easy: 1,
    medium: 1.5,
    hard: 2.5,
    expert: 4,
  },
  actual_difficulty_rule:
    'Do not accept the task giver\'s declared difficulty as fact. Assess it from scope, acceptance criteria, required skills and levels, autonomy, integration or risk, execution evidence, and any self-assessment. If evidence is insufficient, return unknown rather than guessing.',
  profile_update_rule:
    'An AI assessment never changes a profile by itself. Only a system administrator may approve an assessed difficulty; Suar then recalculates the canonical profile aggregates.',
} as const

export function buildProfileAssessmentContract(input: {
  task: Record<string, unknown> | undefined
  contractVersions: Record<string, unknown>[]
  readinessAssessments: Record<string, unknown>[]
}): Record<string, unknown> {
  const currentContract = [...input.contractVersions]
    .reverse()
    .find((contract) => Object.keys(recordValue(contract['evidence_contract'])).length > 0)
  const evidence = recordValue(currentContract?.['evidence_contract'])
  const resolved = recordValue(currentContract?.['resolved_contract'])
  const resolvedWork = recordValue(resolved['work'])
  const latestReadiness = input.readinessAssessments.at(-1)

  return {
    schema_version: 'suar.profile_assessment_contract.v2',
    source_contract_version_id: stringField(currentContract?.['id']) || null,
    authoring_mode: stringField(evidence['mode']) || 'operational_only',
    profile_eligibility: evidence['profileEligibility'] === true,
    capabilities: recordArray(evidence['capabilities']).map((capability) => ({
      capability_id: stringField(capability['capabilityId']),
      capability_name: stringField(capability['capabilityName']),
      // Mức khai báo là điều kiện nhận Task. AI phải nhận định riêng mức độ
      // khó thực tế của phần việc và mức người thực hiện đã thể hiện.
      minimum_level: capability['minimumLevel'] ?? null,
      declared_minimum_level: capability['minimumLevel'] ?? null,
      rubric_version_id: capability['rubricVersionId'] ?? null,
      observable_behaviours: stringArray(capability['observableBehaviours']),
    })),
    work_claim_basis: {
      action: resolvedWork['action'] ?? input.task?.['task_type'] ?? null,
      object: resolvedWork['object'] ?? input.task?.['title'] ?? null,
      ownership_level: resolvedWork['ownershipLevel'] ?? null,
      desired_outcome: resolvedWork['desiredOutcome'] ?? input.task?.['acceptance_criteria'] ?? null,
    },
    readiness: recordValue(latestReadiness),
    requires_task_difficulty_assessment: true,
    response_contract: {
      profile_assessment_schema_version: 'suar.ai.profile_assessment.v1',
      per_capability: {
        declared_minimum_level:
          'Echo the declared task-entry level exactly; it is not an AI assessment.',
        proposed_task_difficulty_level:
          'Canonical l0-l14 or null when insufficient evidence. This assesses the work itself and may be lower or higher than the declared task-entry level and the Project range.',
        task_difficulty_assessment_status:
          'supported, higher_evidence, lower_evidence, or insufficient_evidence.',
        task_difficulty_evidence_refs:
          'Non-empty references to the authoritative task/review data used for the work-difficulty conclusion.',
        task_difficulty_rationale:
          'Concise explanation of scope, autonomy, integration, risk, and execution signals; do not infer performer ability from this value.',
        proposed_observed_level:
          'Separate canonical l0-l14 assessment of what the person demonstrated.',
      },
    },
    profile_mutation_permitted: false,
    finalization_gate:
      'AI output is advisory. Only the authoritative Task Review Board Done event may queue governed profile projection; a human approval remains required.',
  }
}
