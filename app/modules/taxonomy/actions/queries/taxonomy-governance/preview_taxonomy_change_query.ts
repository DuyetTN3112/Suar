import { BaseQuery } from '#modules/taxonomy/actions/base_query'
import {
  previewTaxonomyChange,
  type TaxonomyMigrationPlan,
  type TaxonomyMigrationPlanTokenGenerator,
  type TaxonomyMigrationPreviewInput,
} from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'

export class PreviewTaxonomyChangeQuery extends BaseQuery {
  constructor(private readonly tokenGenerator: TaxonomyMigrationPlanTokenGenerator) {
    super()
  }

  execute(input: TaxonomyMigrationPreviewInput): TaxonomyMigrationPlan {
    return previewTaxonomyChange(input, this.tokenGenerator)
  }

  executeAndWrap(input: TaxonomyMigrationPreviewInput) {
    return this.wrap(() => this.execute(input))
  }
}
