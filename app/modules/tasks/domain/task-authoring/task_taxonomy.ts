export const CANONICAL_TASK_TYPES = [
  'feature_development',
  'bug_fix',
  'refactoring',
  'architecture_design',
  'code_review',
  'system_integration',
  'ui_ux_design',
  'prototype',
  'api_design',
  'qa_testing',
  'test_automation',
  'performance_testing',
  'devops_deployment',
  'infrastructure',
  'monitoring_setup',
  'data_analysis',
  'data_pipeline',
  'reporting',
  'technical_writing',
  'documentation',
  'knowledge_transfer',
  'research_spike',
  'poc',
  'product_management',
  'mentoring',
] as const

export type CanonicalTaskType = (typeof CANONICAL_TASK_TYPES)[number]

const CANONICAL_TASK_TYPE_SET = new Set<string>(CANONICAL_TASK_TYPES)

export function isCanonicalTaskType(value: string): value is CanonicalTaskType {
  return CANONICAL_TASK_TYPE_SET.has(value)
}
