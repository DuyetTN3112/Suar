export type SearchFilterTotal =
  | { relation: 'eq'; value: number }
  | { relation: 'gte'; value: number }
  | { relation: 'unknown'; value?: number }

export type SearchFilterQualityInput = {
  expectedIds: readonly string[]
  actualIds: readonly string[]
  expectedFacets: Readonly<Record<string, number>>
  actualFacets: Readonly<Record<string, number>>
  expectedSecondaryLabelIds: readonly string[]
  actualSecondaryLabelIds: readonly string[]
  leakedIds: readonly string[]
  expectedTotal: SearchFilterTotal
  actualTotal: SearchFilterTotal
}

export type SearchFilterQualityMetrics = {
  eligibleIdsEqual: boolean
  exactFacetsEqual: boolean
  secondaryLabelRecall: number
  permissionLeakageViolations: number
  approximateTotalRelationValid: boolean
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort()
}

function setsEqual(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = uniqueSorted(left)
  const normalizedRight = uniqueSorted(right)
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

function recordsEqual(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>
): boolean {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
  )
}

function secondaryLabelRecall(
  expectedIds: readonly string[],
  actualIds: readonly string[]
): number {
  const expected = uniqueSorted(expectedIds)
  if (expected.length === 0) return 1
  const actual = new Set(actualIds)
  return expected.filter((id) => actual.has(id)).length / expected.length
}

function totalRelationIsValid(expected: SearchFilterTotal, actual: SearchFilterTotal): boolean {
  if (expected.relation === 'unknown') return actual.relation === 'unknown'
  if (actual.relation === 'unknown') return false
  if (expected.relation === 'eq' && actual.relation === 'eq') return actual.value === expected.value
  if (actual.relation === 'eq') return actual.value >= expected.value
  return actual.value >= expected.value
}

export function compareSearchFilterQuality(
  input: SearchFilterQualityInput
): SearchFilterQualityMetrics {
  const unexpectedIds = input.actualIds.filter((id) => !new Set(input.expectedIds).has(id))
  const leakage = uniqueSorted([...input.leakedIds, ...unexpectedIds])

  return {
    eligibleIdsEqual: setsEqual(input.expectedIds, input.actualIds),
    exactFacetsEqual: recordsEqual(input.expectedFacets, input.actualFacets),
    secondaryLabelRecall: secondaryLabelRecall(
      input.expectedSecondaryLabelIds,
      input.actualSecondaryLabelIds
    ),
    permissionLeakageViolations: leakage.length,
    approximateTotalRelationValid: totalRelationIsValid(input.expectedTotal, input.actualTotal),
  }
}
