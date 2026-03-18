/**
 * Stable, persistence-agnostic skill identity for cross-module reads.
 *
 * Consumers must not depend on the Skills Lucid model or repository return types.
 */
export interface SkillSummaryFact {
  id: string
  name: string
}
