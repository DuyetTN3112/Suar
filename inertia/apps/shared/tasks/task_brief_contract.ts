export interface TaskBriefWorkItem {
  id: string
  affectedArea: string
  requiredChange: string
  resultingBehaviour: string
}

export interface TaskBriefBusinessRule {
  id: string
  actor: string
  condition: string
  permission: string
  systemResult: string
}

export interface TaskBriefDeliverable {
  id: string
  outputType: string
  locationOrRecipient: string
  minimumState: string
}

export interface TaskBriefQualityRequirement {
  id: string
  property: string
  appliesTo: string
  observableCheck: string
}

export interface TaskBriefDependency {
  id: string
  dependency: string
  owner: string
  state: 'available' | 'waiting' | 'blocked'
}

export interface TaskBriefAcceptanceCriterion {
  id: string
  condition: string
  action: string
  observableResult: string
}

export interface TaskBriefLine {
  id: string
  text: string
}

export interface TaskBriefV2 {
  schemaVersion: 'suar.task_brief.v2'
  workItems: TaskBriefWorkItem[]
  currentState: string
  currentStateSituation: string
  affectedParties: string
  impactIfUnresolved: string
  scope: TaskBriefLine[]
  outOfScope: TaskBriefLine[]
  businessRules: TaskBriefBusinessRule[]
  constraints: TaskBriefLine[]
  dependencies: TaskBriefDependency[]
  deliverables: TaskBriefDeliverable[]
  qualityRequirements: TaskBriefQualityRequirement[]
  acceptanceCriteria: TaskBriefAcceptanceCriterion[]
  desiredValue: {
    beneficiary: string
    usefulState: string
  } | null
}

export const createEmptyTaskBrief = (): TaskBriefV2 => ({
  schemaVersion: 'suar.task_brief.v2',
  workItems: [],
  currentState: '',
  currentStateSituation: '',
  affectedParties: '',
  impactIfUnresolved: '',
  scope: [],
  outOfScope: [],
  businessRules: [],
  constraints: [],
  dependencies: [],
  deliverables: [],
  qualityRequirements: [],
  acceptanceCriteria: [],
  desiredValue: null,
})

export function isTaskBriefV2(value: unknown): value is TaskBriefV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<TaskBriefV2>
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  const hasTextFields = (item: unknown, fields: string[]) =>
    isRecord(item) && fields.every((field) => typeof item[field] === 'string')
  const hasIdAndText = (item: unknown) => hasTextFields(item, ['id', 'text'])

  return candidate.schemaVersion === 'suar.task_brief.v2'
    && typeof candidate.currentState === 'string'
    && typeof candidate.currentStateSituation === 'string'
    && typeof candidate.affectedParties === 'string'
    && typeof candidate.impactIfUnresolved === 'string'
    && Array.isArray(candidate.workItems)
    && candidate.workItems.every((item) => hasTextFields(item, ['id', 'affectedArea', 'requiredChange', 'resultingBehaviour']))
    && Array.isArray(candidate.scope)
    && candidate.scope.every(hasIdAndText)
    && Array.isArray(candidate.outOfScope)
    && candidate.outOfScope.every(hasIdAndText)
    && Array.isArray(candidate.businessRules)
    && candidate.businessRules.every((item) => hasTextFields(item, ['id', 'actor', 'condition', 'permission', 'systemResult']))
    && Array.isArray(candidate.constraints)
    && candidate.constraints.every(hasIdAndText)
    && Array.isArray(candidate.dependencies)
    && candidate.dependencies.every((item) =>
      hasTextFields(item, ['id', 'dependency', 'owner']) &&
      (item.state === 'available' || item.state === 'waiting' || item.state === 'blocked')
    )
    && Array.isArray(candidate.deliverables)
    && candidate.deliverables.every((item) => hasTextFields(item, ['id', 'outputType', 'locationOrRecipient', 'minimumState']))
    && Array.isArray(candidate.qualityRequirements)
    && candidate.qualityRequirements.every((item) => hasTextFields(item, ['id', 'property', 'appliesTo', 'observableCheck']))
    && Array.isArray(candidate.acceptanceCriteria)
    && candidate.acceptanceCriteria.every((item) => hasTextFields(item, ['id', 'condition', 'action', 'observableResult']))
    && (candidate.desiredValue === null || hasTextFields(candidate.desiredValue, ['beneficiary', 'usefulState']))
}

export function taskBriefText(...values: Array<string | null | undefined>): string {
  return values
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(' · ')
}

export function taskBriefWorkItemText(item: TaskBriefWorkItem): string {
  return taskBriefText(item.affectedArea, item.requiredChange, item.resultingBehaviour)
}

export function taskBriefRuleText(item: TaskBriefBusinessRule): string {
  return taskBriefText(item.actor, item.condition, item.permission, item.systemResult)
}

export function taskBriefDeliverableText(item: TaskBriefDeliverable): string {
  return taskBriefText(item.outputType, item.locationOrRecipient, item.minimumState)
}

export function taskBriefQualityText(item: TaskBriefQualityRequirement): string {
  return taskBriefText(item.property, item.appliesTo, item.observableCheck)
}

export function taskBriefAcceptanceText(item: TaskBriefAcceptanceCriterion): string {
  return taskBriefText(item.condition, item.action, item.observableResult)
}

export function taskBriefCurrentStateText(brief: TaskBriefV2): string {
  return [
    brief.currentState && `Hiện trạng: ${brief.currentState.trim()}`,
    brief.currentStateSituation && `Nơi/tình huống: ${brief.currentStateSituation.trim()}`,
    brief.affectedParties && `Bị ảnh hưởng: ${brief.affectedParties.trim()}`,
    brief.impactIfUnresolved && `Hậu quả: ${brief.impactIfUnresolved.trim()}`,
  ].filter((value): value is string => Boolean(value)).join('\n')
}

export function taskBriefPlainText(brief: TaskBriefV2): string {
  const sections: Array<[string, string[]]> = [
    ['Phần việc', brief.workItems.map(taskBriefWorkItemText).filter(Boolean)],
    ['Hiện trạng và ảnh hưởng', [taskBriefCurrentStateText(brief)].filter(Boolean)],
    ['Phạm vi', brief.scope.map((item) => item.text.trim()).filter(Boolean)],
    ['Ngoài phạm vi', brief.outOfScope.map((item) => item.text.trim()).filter(Boolean)],
    ['Quy tắc nghiệp vụ', brief.businessRules.map(taskBriefRuleText).filter(Boolean)],
    ['Giới hạn', brief.constraints.map((item) => item.text.trim()).filter(Boolean)],
    ['Phụ thuộc', brief.dependencies.map((item) => taskBriefText(item.dependency, item.owner, item.state)).filter(Boolean)],
    ['Đầu ra bàn giao', brief.deliverables.map(taskBriefDeliverableText).filter(Boolean)],
    ['Yêu cầu chất lượng', brief.qualityRequirements.map(taskBriefQualityText).filter(Boolean)],
    ['Tiêu chí nghiệm thu', brief.acceptanceCriteria.map(taskBriefAcceptanceText).filter(Boolean)],
    ['Giá trị mong muốn', brief.desiredValue ? [taskBriefText(brief.desiredValue.beneficiary, brief.desiredValue.usefulState)] : []],
  ]

  return sections
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => `${title}\n${lines.map((line) => `- ${line}`).join('\n')}`)
    .join('\n\n')
}
