import { createHash } from 'node:crypto'

import type { TaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'

export class NodeTaxonomyMigrationPlanTokenGenerator implements TaxonomyMigrationPlanTokenGenerator {
  generate(canonical: string): string {
    return `txm_${createHash('sha256').update(canonical).digest('hex')}`
  }
}

export default NodeTaxonomyMigrationPlanTokenGenerator
