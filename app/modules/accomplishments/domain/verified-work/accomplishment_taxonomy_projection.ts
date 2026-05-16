import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export interface AccomplishmentTaxonomyProjection {
  readonly taskType: string | null
  readonly businessDomain: string | null
  readonly problemCategory: string | null
  readonly technology: readonly string[]
  readonly complexity: {
    readonly summary: string | null
    readonly factors: readonly string[]
    readonly novelty: string | null
    readonly risk: 'low' | 'medium' | 'high' | 'critical' | null
  }
}

function termsForNamespace(snapshot: TaskAssignmentSnapshotV1, namespace: string): string[] {
  const taskId = snapshot.taskId
  return [
    ...new Set(
      (snapshot.taxonomyMetadata?.assignments ?? [])
        .filter(
          (assignment) =>
            assignment.resource === 'task' &&
            assignment.entityId === taskId &&
            assignment.term.namespace === namespace
        )
        .map((assignment) => assignment.term.termId)
    ),
  ].sort()
}

function firstTerm(snapshot: TaskAssignmentSnapshotV1, namespace: string): string | null {
  return termsForNamespace(snapshot, namespace)[0] ?? null
}

export function projectAccomplishmentTaxonomy(
  snapshot: TaskAssignmentSnapshotV1,
  complexityContext: TvaJsonObject = {}
): AccomplishmentTaxonomyProjection {
  const summary =
    typeof complexityContext['summary'] === 'string'
      ? complexityContext['summary']
      : typeof complexityContext['description'] === 'string'
        ? complexityContext['description']
        : null
  const factors = Array.isArray(complexityContext['factors'])
    ? complexityContext['factors'].filter((value): value is string => typeof value === 'string')
    : []
  const novelty =
    typeof complexityContext['novelty'] === 'string' ? complexityContext['novelty'] : null
  const riskValue = complexityContext['risk']
  const risk =
    typeof riskValue === 'string' && ['low', 'medium', 'high', 'critical'].includes(riskValue)
      ? (riskValue as 'low' | 'medium' | 'high' | 'critical')
    : null
  return {
    taskType: firstTerm(snapshot, 'task-types'),
    businessDomain: firstTerm(snapshot, 'business-domains'),
    problemCategory: firstTerm(snapshot, 'problem-categories'),
    technology: termsForNamespace(snapshot, 'technologies'),
    complexity: { summary, factors, novelty, risk },
  }
}
