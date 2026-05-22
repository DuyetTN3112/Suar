import { serializeCanonicalFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'

export interface FilterHashGenerator {
  hash(value: string): string
}

export function hashFilterExpression(
  expression: FilterExpression,
  hashGenerator: FilterHashGenerator
): string {
  return hashGenerator.hash(serializeCanonicalFilterExpression(expression))
}
