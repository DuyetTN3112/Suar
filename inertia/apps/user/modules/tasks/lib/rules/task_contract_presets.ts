export interface TaskContractPreset {
  taskType: string
  label: string
  verificationMethod: string
  acceptanceCriteria: string
  contextBackground: string
  domainTags: string[]
  learningObjectives: string[]
}

export type TaskTranslator = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

interface TaskContractPresetTemplate extends TaskContractPreset {
  labelKey: string
  acceptanceCriteriaKey: string
  contextBackgroundKey: string
  learningObjectiveKeys: string[]
}

const TASK_CONTRACT_PRESET_TEMPLATES: TaskContractPresetTemplate[] = [
  {
    taskType: 'feature_development',
    label: 'Feature launch',
    labelKey: 'task.contract_presets.feature_development.label',
    verificationMethod: 'code_review',
    acceptanceCriteria:
      'Flow completes end-to-end, core regressions stay intact, and reviewers can verify output with clear evidence.',
    acceptanceCriteriaKey: 'task.contract_presets.feature_development.acceptance_criteria',
    contextBackground:
      'Describe the user/problem, affected screens or APIs, and dependencies to watch during implementation.',
    contextBackgroundKey: 'task.contract_presets.feature_development.context_background',
    domainTags: ['delivery', 'feature'],
    learningObjectives: ['Observe execution quality', 'Assess autonomy while shipping a feature'],
    learningObjectiveKeys: [
      'task.contract_presets.feature_development.learning_objectives.0',
      'task.contract_presets.feature_development.learning_objectives.1',
    ],
  },
  {
    taskType: 'bug_fix',
    label: 'Bug fix',
    labelKey: 'task.contract_presets.bug_fix.label',
    verificationMethod: 'manual_qa',
    acceptanceCriteria:
      'Bug is reproduced before the fix, no longer reproduces after the fix, and nearby regression checks are documented.',
    acceptanceCriteriaKey: 'task.contract_presets.bug_fix.acceptance_criteria',
    contextBackground:
      'Describe symptoms, user or operational impact, reproduction steps, and suspected code or flow area.',
    contextBackgroundKey: 'task.contract_presets.bug_fix.context_background',
    domainTags: ['stability', 'bugfix'],
    learningObjectives: ['Assess debugging skill', 'Track quality of root-cause verification'],
    learningObjectiveKeys: [
      'task.contract_presets.bug_fix.learning_objectives.0',
      'task.contract_presets.bug_fix.learning_objectives.1',
    ],
  },
  {
    taskType: 'code_review',
    label: 'Review package',
    labelKey: 'task.contract_presets.code_review.label',
    verificationMethod: 'peer_review',
    acceptanceCriteria:
      'Review identifies important issues, separates must-fix items from suggestions, and leaves actionable rationale.',
    acceptanceCriteriaKey: 'task.contract_presets.code_review.acceptance_criteria',
    contextBackground:
      'Describe review scope, primary risks, expected checklist, and the criteria that matter most in this review round.',
    contextBackgroundKey: 'task.contract_presets.code_review.context_background',
    domainTags: ['review', 'quality'],
    learningObjectives: ['Assess review judgment', 'Observe fair and clear critique'],
    learningObjectiveKeys: [
      'task.contract_presets.code_review.learning_objectives.0',
      'task.contract_presets.code_review.learning_objectives.1',
    ],
  },
  {
    taskType: 'qa_testing',
    label: 'QA pass',
    labelKey: 'task.contract_presets.qa_testing.label',
    verificationMethod: 'manual_qa',
    acceptanceCriteria:
      'Test checklist is completed, bugs or edge cases are recorded clearly, and results show whether the flow is releasable.',
    acceptanceCriteriaKey: 'task.contract_presets.qa_testing.acceptance_criteria',
    contextBackground:
      'Describe test environment, regression scope, related features, and priority risks to verify.',
    contextBackgroundKey: 'task.contract_presets.qa_testing.context_background',
    domainTags: ['qa', 'verification'],
    learningObjectives: ['Assess test coverage depth', 'Observe evidence quality during verification'],
    learningObjectiveKeys: [
      'task.contract_presets.qa_testing.learning_objectives.0',
      'task.contract_presets.qa_testing.learning_objectives.1',
    ],
  },
  {
    taskType: 'test_automation',
    label: 'Automation coverage',
    labelKey: 'task.contract_presets.test_automation.label',
    verificationMethod: 'automated_test',
    acceptanceCriteria:
      'Automated test runs reliably, targets the main risk, and provides pass/fail signal reviewers can trust.',
    acceptanceCriteriaKey: 'task.contract_presets.test_automation.acceptance_criteria',
    contextBackground:
      'Describe the flow or risk to automate, expected test type, and conditions that could make the test flaky.',
    contextBackgroundKey: 'task.contract_presets.test_automation.context_background',
    domainTags: ['testing', 'automation'],
    learningObjectives: ['Assess automation design', 'Observe ability to turn tests into reliable signal'],
    learningObjectiveKeys: [
      'task.contract_presets.test_automation.learning_objectives.0',
      'task.contract_presets.test_automation.learning_objectives.1',
    ],
  },
  {
    taskType: 'architecture_design',
    label: 'Architecture decision',
    labelKey: 'task.contract_presets.architecture_design.label',
    verificationMethod: 'manager_approval',
    acceptanceCriteria:
      'Proposal explains trade-offs, blast radius, recommended decision, and next implementation steps.',
    acceptanceCriteriaKey: 'task.contract_presets.architecture_design.acceptance_criteria',
    contextBackground:
      'Describe the architecture problem, current constraints, options under consideration, and risk of no change.',
    contextBackgroundKey: 'task.contract_presets.architecture_design.context_background',
    domainTags: ['architecture', 'design'],
    learningObjectives: ['Assess system design skill', 'Observe trade-off reasoning and decision communication'],
    learningObjectiveKeys: [
      'task.contract_presets.architecture_design.learning_objectives.0',
      'task.contract_presets.architecture_design.learning_objectives.1',
    ],
  },
]

export const TASK_CONTRACT_PRESETS: TaskContractPreset[] =
  TASK_CONTRACT_PRESET_TEMPLATES.map(toTaskContractPreset)

function toTaskContractPreset(template: TaskContractPresetTemplate): TaskContractPreset {
  return {
    taskType: template.taskType,
    label: template.label,
    verificationMethod: template.verificationMethod,
    acceptanceCriteria: template.acceptanceCriteria,
    contextBackground: template.contextBackground,
    domainTags: template.domainTags,
    learningObjectives: template.learningObjectives,
  }
}

export function translateTaskContractPreset(
  template: TaskContractPresetTemplate,
  t: TaskTranslator
): TaskContractPreset {
  return {
    ...toTaskContractPreset(template),
    label: t(template.labelKey, {}, template.label),
    acceptanceCriteria: t(template.acceptanceCriteriaKey, {}, template.acceptanceCriteria),
    contextBackground: t(template.contextBackgroundKey, {}, template.contextBackground),
    learningObjectives: template.learningObjectiveKeys.map((key, index) =>
      t(key, {}, template.learningObjectives[index] ?? key)
    ),
  }
}

export function getTaskContractPresets(t?: TaskTranslator): TaskContractPreset[] {
  return t
    ? TASK_CONTRACT_PRESET_TEMPLATES.map((template) => translateTaskContractPreset(template, t))
    : TASK_CONTRACT_PRESETS
}

export function getTaskContractPreset(
  taskType: string | null | undefined,
  t?: TaskTranslator
): TaskContractPreset | null {
  if (!taskType) return null
  const template =
    TASK_CONTRACT_PRESET_TEMPLATES.find((preset) => preset.taskType === taskType) ?? null

  if (!template) return null

  return t ? translateTaskContractPreset(template, t) : toTaskContractPreset(template)
}

export function inferTaskTypeFromRoleCode(roleCode: string | null | undefined): string | null {
  const normalized = roleCode?.trim().toLowerCase() ?? ''
  if (!normalized) return null

  if (normalized.includes('qa') || normalized.includes('test')) {
    return normalized.includes('automation') ? 'test_automation' : 'qa_testing'
  }

  if (normalized.includes('review')) return 'code_review'
  if (normalized.includes('architect')) return 'architecture_design'
  if (normalized.includes('devops') || normalized.includes('ops') || normalized.includes('platform')) {
    return 'infrastructure'
  }
  if (
    normalized.includes('frontend') ||
    normalized.includes('backend') ||
    normalized.includes('fullstack') ||
    normalized.includes('engineer') ||
    normalized.includes('developer')
  ) {
    return 'feature_development'
  }

  return null
}

export function mergeTaskContractPreset<T extends {
  task_type: string
  verification_method: string
  acceptance_criteria: string
  context_background: string
  domain_tags_text: string
  learning_objectives_text: string
}>(
  formData: T,
  preset: TaskContractPreset
): T {
  return {
    ...formData,
    task_type: preset.taskType,
    verification_method: formData.verification_method.trim() || preset.verificationMethod,
    acceptance_criteria: formData.acceptance_criteria.trim() || preset.acceptanceCriteria,
    context_background: formData.context_background.trim() || preset.contextBackground,
    domain_tags_text: formData.domain_tags_text.trim() || preset.domainTags.join(', '),
    learning_objectives_text:
      formData.learning_objectives_text.trim() || preset.learningObjectives.join('\n'),
  }
}
