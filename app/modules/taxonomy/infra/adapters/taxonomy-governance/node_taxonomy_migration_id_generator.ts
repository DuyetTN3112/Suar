import { randomUUID } from 'node:crypto'

import type { TaxonomyMigrationIdGenerator } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_id_generator'

export class NodeTaxonomyMigrationIdGenerator implements TaxonomyMigrationIdGenerator {
  generate(): string {
    return randomUUID()
  }
}

export default NodeTaxonomyMigrationIdGenerator
