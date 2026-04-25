import { coordinateTaxonomyFilterConsumers } from '#composition/filtering/filter-runtime/filtering_composition'
import { ApplyTaxonomyChangeCommand } from '#modules/taxonomy/actions/commands/taxonomy-governance/apply_taxonomy_change_command'
import { TaxonomyGovernanceCommand } from '#modules/taxonomy/actions/commands/taxonomy-governance/taxonomy_governance_command'
import { TaxonomyGovernanceActionFactory } from '#modules/taxonomy/actions/ports/inbound/taxonomy-governance/taxonomy_governance_action_factory'
import type { TaxonomyConsumerCoordinator } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_consumer_coordinator'
import { PreviewTaxonomyChangeQuery } from '#modules/taxonomy/actions/queries/taxonomy-governance/preview_taxonomy_change_query'
import { LucidTaxonomyVersionReader } from '#modules/taxonomy/infra/adapters/taxonomy-governance/lucid_taxonomy_version_reader'
import { NodeTaxonomyMigrationIdGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_id_generator'
import { NodeTaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_plan_token_generator'
import { PostgresTaxonomyConsumerImpactReader } from '#modules/taxonomy/infra/adapters/taxonomy-governance/postgres_taxonomy_consumer_impact_reader'
import { PostgresTaxonomyMigrationRepository } from '#modules/taxonomy/infra/repositories/taxonomy-governance/postgres_taxonomy_migration_repository'

const migrationRepository = new PostgresTaxonomyMigrationRepository()

const filterConsumerCoordinator: TaxonomyConsumerCoordinator = {
  async coordinate({ run, limit, now }) {
    const result = await coordinateTaxonomyFilterConsumers.handle({
      planToken: run.plan.planToken,
      limit,
      now,
    })
    return {
      status: result.status,
      nextCursor: result.nextCursor ?? null,
      lockVersion: result.lockVersion,
    }
  },
}

const taxonomyGovernance = new TaxonomyGovernanceCommand(
  new LucidTaxonomyVersionReader(),
  new PostgresTaxonomyConsumerImpactReader(),
  migrationRepository,
  new PreviewTaxonomyChangeQuery(new NodeTaxonomyMigrationPlanTokenGenerator()),
  new ApplyTaxonomyChangeCommand(migrationRepository),
  new NodeTaxonomyMigrationIdGenerator(),
  filterConsumerCoordinator
)

class ComposedTaxonomyGovernanceActionFactory extends TaxonomyGovernanceActionFactory {
  readonly governance = taxonomyGovernance
}

export const taxonomyGovernanceActionFactory = new ComposedTaxonomyGovernanceActionFactory()
