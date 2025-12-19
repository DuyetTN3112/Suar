export interface TaskWorkAreaStarter {
  key: string
  label: string
  description: string
  suggestedTaskType?: string
  contextBackground: string
  acceptanceCriteria: string
  domainTags: string[]
  learningObjectives: string[]
}

export type TaskTranslator = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

interface TaskWorkAreaStarterTemplate extends TaskWorkAreaStarter {
  labelKey: string
  descriptionKey: string
  contextBackgroundKey: string
  acceptanceCriteriaKey: string
  learningObjectiveKeys: string[]
}

const TASK_WORK_AREA_STARTER_TEMPLATES: TaskWorkAreaStarterTemplate[] = [
  {
    key: 'authentication',
    label: 'Authentication',
    labelKey: 'task.work_area_starters.authentication.label',
    description: 'Login, sessions, access rights, route protection, and identity flow.',
    descriptionKey: 'task.work_area_starters.authentication.description',
    suggestedTaskType: 'feature_development',
    contextBackground:
      'Task belongs to identity/auth. Describe system entry/exit flow, affected roles, and related guards or token/session behavior.',
    contextBackgroundKey: 'task.work_area_starters.authentication.context_background',
    acceptanceCriteria:
      'Authentication/authorization flow works for happy paths and error paths, does not open permission gaps, and reviewers can prove behavior with clear checks.',
    acceptanceCriteriaKey: 'task.work_area_starters.authentication.acceptance_criteria',
    domainTags: ['auth', 'identity', 'access-control'],
    learningObjectives: ['Observe boundary and permission thinking', 'Assess authentication flow robustness'],
    learningObjectiveKeys: [
      'task.work_area_starters.authentication.learning_objectives.0',
      'task.work_area_starters.authentication.learning_objectives.1',
    ],
  },
  {
    key: 'marketplace',
    label: 'Marketplace',
    labelKey: 'task.work_area_starters.marketplace.label',
    description: 'Discovery, task visibility, application flow, public/internal opportunity surface.',
    descriptionKey: 'task.work_area_starters.marketplace.description',
    suggestedTaskType: 'feature_development',
    contextBackground:
      'Task belongs to marketplace. Describe who sees what, eligibility conditions, and impact on application/discovery journey.',
    contextBackgroundKey: 'task.work_area_starters.marketplace.context_background',
    acceptanceCriteria:
      'Correct users find correct opportunities, private tasks are not exposed, and apply/visibility flow is verified with clear scenarios.',
    acceptanceCriteriaKey: 'task.work_area_starters.marketplace.acceptance_criteria',
    domainTags: ['marketplace', 'discovery', 'application'],
    learningObjectives: ['Assess user-facing flow thinking', 'Observe privacy protection when opening data'],
    learningObjectiveKeys: [
      'task.work_area_starters.marketplace.learning_objectives.0',
      'task.work_area_starters.marketplace.learning_objectives.1',
    ],
  },
  {
    key: 'review_dispute',
    label: 'Review & Dispute',
    labelKey: 'task.work_area_starters.review_dispute.label',
    description: 'Review session, fairness, evidence quality, dispute-safe workflow.',
    descriptionKey: 'task.work_area_starters.review_dispute.description',
    suggestedTaskType: 'qa_testing',
    contextBackground:
      'Task belongs to review/dispute. Describe which evidence is considered, who reviews it, and where fairness/governance risk sits.',
    contextBackgroundKey: 'task.work_area_starters.review_dispute.context_background',
    acceptanceCriteria:
      'Review/dispute flow has clear evidence, status transitions are correct, and profile/governance side effects happen only under valid conditions.',
    acceptanceCriteriaKey: 'task.work_area_starters.review_dispute.acceptance_criteria',
    domainTags: ['review', 'dispute', 'governance'],
    learningObjectives: ['Observe fairness thinking', 'Assess evidence handling and state transitions'],
    learningObjectiveKeys: [
      'task.work_area_starters.review_dispute.learning_objectives.0',
      'task.work_area_starters.review_dispute.learning_objectives.1',
    ],
  },
  {
    key: 'admin_console',
    label: 'Admin Console',
    labelKey: 'task.work_area_starters.admin_console.label',
    description: 'Moderation, support, platform governance, safety, inspection screens.',
    descriptionKey: 'task.work_area_starters.admin_console.description',
    suggestedTaskType: 'architecture_design',
    contextBackground:
      'Task belongs to admin console. Clarify whether this is platform-wide governance or moderation, not org/project delivery flow.',
    contextBackgroundKey: 'task.work_area_starters.admin_console.context_background',
    acceptanceCriteria:
      'Admins see only correct platform-level data/actions, do not confuse them with org workspace, and action logs/guards are clearly explained.',
    acceptanceCriteriaKey: 'task.work_area_starters.admin_console.acceptance_criteria',
    domainTags: ['admin', 'moderation', 'platform-governance'],
    learningObjectives: ['Assess workspace separation', 'Observe safety and moderation boundary thinking'],
    learningObjectiveKeys: [
      'task.work_area_starters.admin_console.learning_objectives.0',
      'task.work_area_starters.admin_console.learning_objectives.1',
    ],
  },
  {
    key: 'audit_logging',
    label: 'Audit Logging',
    labelKey: 'task.work_area_starters.audit_logging.label',
    description: 'Auditability, traceability, actor-action-object history, governance evidence.',
    descriptionKey: 'task.work_area_starters.audit_logging.description',
    suggestedTaskType: 'documentation',
    contextBackground:
      'Task belongs to audit/logging. Describe which events must be recorded, who needs lookup, and which governance flow depends on this log.',
    contextBackgroundKey: 'task.work_area_starters.audit_logging.context_background',
    acceptanceCriteria:
      'Important events record enough actor/action/object/time data, can be searched in the correct context, and do not leak unnecessary sensitive data.',
    acceptanceCriteriaKey: 'task.work_area_starters.audit_logging.acceptance_criteria',
    domainTags: ['audit', 'traceability', 'governance'],
    learningObjectives: ['Observe auditability thinking', 'Assess ability to turn actions into traceable evidence'],
    learningObjectiveKeys: [
      'task.work_area_starters.audit_logging.learning_objectives.0',
      'task.work_area_starters.audit_logging.learning_objectives.1',
    ],
  },
  {
    key: 'quality_control',
    label: 'Quality Control',
    labelKey: 'task.work_area_starters.quality_control.label',
    description: 'Quality gates, release readiness, verification discipline, risk checks.',
    descriptionKey: 'task.work_area_starters.quality_control.description',
    suggestedTaskType: 'qa_testing',
    contextBackground:
      'Task belongs to quality control. Describe which gate is protected, the main risk, and who uses the verification result.',
    contextBackgroundKey: 'task.work_area_starters.quality_control.context_background',
    acceptanceCriteria:
      'Quality gate is described clearly, verification steps are enough for pass/fail decisions, and results help managers/reviewers decide.',
    acceptanceCriteriaKey: 'task.work_area_starters.quality_control.acceptance_criteria',
    domainTags: ['quality', 'verification', 'release-readiness'],
    learningObjectives: ['Assess quality gate thinking', 'Observe how checks become operational decisions'],
    learningObjectiveKeys: [
      'task.work_area_starters.quality_control.learning_objectives.0',
      'task.work_area_starters.quality_control.learning_objectives.1',
    ],
  },
]

export const TASK_WORK_AREA_STARTERS: TaskWorkAreaStarter[] =
  TASK_WORK_AREA_STARTER_TEMPLATES.map(toTaskWorkAreaStarter)

function toTaskWorkAreaStarter(template: TaskWorkAreaStarterTemplate): TaskWorkAreaStarter {
  return {
    key: template.key,
    label: template.label,
    description: template.description,
    suggestedTaskType: template.suggestedTaskType,
    contextBackground: template.contextBackground,
    acceptanceCriteria: template.acceptanceCriteria,
    domainTags: template.domainTags,
    learningObjectives: template.learningObjectives,
  }
}

export function translateTaskWorkAreaStarter(
  template: TaskWorkAreaStarterTemplate,
  t: TaskTranslator
): TaskWorkAreaStarter {
  return {
    ...toTaskWorkAreaStarter(template),
    label: t(template.labelKey, {}, template.label),
    description: t(template.descriptionKey, {}, template.description),
    contextBackground: t(template.contextBackgroundKey, {}, template.contextBackground),
    acceptanceCriteria: t(template.acceptanceCriteriaKey, {}, template.acceptanceCriteria),
    learningObjectives: template.learningObjectiveKeys.map((key, index) =>
      t(key, {}, template.learningObjectives[index] ?? key)
    ),
  }
}

export function getTaskWorkAreaStarters(t?: TaskTranslator): TaskWorkAreaStarter[] {
  return t
    ? TASK_WORK_AREA_STARTER_TEMPLATES.map((template) => translateTaskWorkAreaStarter(template, t))
    : TASK_WORK_AREA_STARTERS
}

export function getTaskWorkAreaStarter(
  key: string | null | undefined,
  t?: TaskTranslator
): TaskWorkAreaStarter | null {
  if (!key) return null
  const template =
    TASK_WORK_AREA_STARTER_TEMPLATES.find((starter) => starter.key === key) ?? null

  if (!template) return null

  return t ? translateTaskWorkAreaStarter(template, t) : toTaskWorkAreaStarter(template)
}

export function mergeTaskWorkAreaStarter<T extends {
  task_type: string
  context_background: string
  acceptance_criteria: string
  domain_tags_text: string
  learning_objectives_text: string
}>(
  formData: T,
  starter: TaskWorkAreaStarter
): T {
  return {
    ...formData,
    task_type: formData.task_type.trim() || starter.suggestedTaskType || formData.task_type,
    context_background: formData.context_background.trim() || starter.contextBackground,
    acceptance_criteria: formData.acceptance_criteria.trim() || starter.acceptanceCriteria,
    domain_tags_text: formData.domain_tags_text.trim() || starter.domainTags.join(', '),
    learning_objectives_text:
      formData.learning_objectives_text.trim() || starter.learningObjectives.join('\n'),
  }
}
