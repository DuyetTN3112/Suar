import type { TaskReadinessResultV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

/**
 * Produces the finding codes that occurred in immutable authoring assessments
 * but are absent from the assessment used to freeze the Assignment Contract.
 * A present code is never considered resolved, regardless of whether it moved
 * between blocker and warning severity.
 */
export function deriveResolvedReadinessFindingCodes(input: {
  readonly historical: readonly TaskReadinessResultV1[]
  readonly current: TaskReadinessResultV1
}): readonly string[] {
  const currentCodes = new Set([
    ...input.current.blockers.map((finding) => finding.code),
    ...input.current.warnings.map((finding) => finding.code),
  ])
  const historicalCodes = new Set<string>()

  for (const assessment of input.historical) {
    for (const finding of [...assessment.blockers, ...assessment.warnings]) {
      historicalCodes.add(finding.code)
    }
  }

  return [...historicalCodes].filter((code) => !currentCodes.has(code)).sort()
}
