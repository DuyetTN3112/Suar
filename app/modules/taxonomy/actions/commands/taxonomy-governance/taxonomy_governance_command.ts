import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/taxonomy/actions/base_command'
import { type ApplyTaxonomyChangeCommand } from '#modules/taxonomy/actions/commands/taxonomy-governance/apply_taxonomy_change_command'
import type { TaxonomyConsumerCoordinator } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_consumer_coordinator'
import type { TaxonomyConsumerImpactReader } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_consumer_impact_reader'
import type { TaxonomyMigrationIdGenerator } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_id_generator'
import type { TaxonomyMigrationRepository } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_repository'
import type { TaxonomyVersionReader } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_version_reader'
import { type PreviewTaxonomyChangeQuery } from '#modules/taxonomy/actions/queries/taxonomy-governance/preview_taxonomy_change_query'
import type { TaxonomyMigrationPlan } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'
import type { TaxonomyChange } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

const SUPPORTED_COORDINATED_CONSUMER_IMPACT_KINDS = new Set(['savedViews', 'alerts'])

export interface TaxonomyGovernancePreview {
  readonly plan: TaxonomyMigrationPlan
  readonly impactVisibility: 'aggregate'
}

export class TaxonomyGovernanceCommand extends BaseCommand {
  constructor(
    private readonly versionReader: TaxonomyVersionReader,
    private readonly impactReader: TaxonomyConsumerImpactReader,
    private readonly repository: TaxonomyMigrationRepository,
    private readonly previewQuery: PreviewTaxonomyChangeQuery,
    private readonly applyCommand: ApplyTaxonomyChangeCommand,
    private readonly idGenerator: TaxonomyMigrationIdGenerator,
    private readonly consumerCoordinator?: TaxonomyConsumerCoordinator
  ) {
    super()
  }

  previewAndWrap(input: {
    readonly namespace: string
    readonly expectedVersion: number
    readonly changes: readonly TaxonomyChange[]
  }) {
    return this.wrap(() => this.preview(input))
  }

  previewAndStartAndWrap(
    input: Parameters<TaxonomyGovernanceCommand['preview']>[0],
    now: string
  ) {
    return this.wrap(async () => {
      const preview = await this.preview(input)
      const run = await this.start(preview.plan, now)
      return { preview, run }
    })
  }

  startAndWrap(plan: TaxonomyMigrationPlan, now: string) {
    return this.wrap(() => this.start(plan, now))
  }

  statusAndWrap(planToken: string) {
    return this.wrap(() => this.status(planToken))
  }

  applyAndWrap(input: Parameters<TaxonomyGovernanceCommand['apply']>[0]) {
    return this.wrap(() => this.apply(input))
  }

  async preview(input: {
    readonly namespace: string
    readonly expectedVersion: number
    readonly changes: readonly TaxonomyChange[]
  }): Promise<TaxonomyGovernancePreview> {
    const currentVersion = await this.versionReader.getVersion(input.namespace)
    const impact = await this.impactReader.estimate({
      namespace: input.namespace,
      currentVersion,
      changes: input.changes,
    })
    return {
      plan: this.previewQuery.execute({
        namespace: input.namespace,
        currentVersion,
        expectedVersion: input.expectedVersion,
        changes: input.changes,
        impact,
      }),
      // Detailed records never cross this boundary. Consumers own privacy and
      // return only bounded aggregates through the port above.
      impactVisibility: 'aggregate',
    }
  }

  async start(plan: TaxonomyMigrationPlan, now: string): Promise<{
    readonly id: string
    readonly status: 'planned'
    readonly lockVersion: number
  }> {
    const run = await this.repository.create({ id: this.idGenerator.generate(), plan, now })
    return { id: run.id, status: 'planned', lockVersion: run.lockVersion }
  }

  async apply(input: {
    readonly planToken: string
    readonly expectedLockVersion: number
    readonly publishedVersion: number
    readonly items: Parameters<ApplyTaxonomyChangeCommand['handle']>[0]['items']
    readonly limit: number
    readonly now: string
  }) {
    const run = await this.repository.findByPlanToken(input.planToken)
    if (run === null) throw new ConflictException('stale_taxonomy_migration_plan')
    if (run.lockVersion !== input.expectedLockVersion) {
      throw new ConflictException('stale_taxonomy_migration_plan')
    }
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'requires_repair') {
      throw new ConflictException('stale_taxonomy_migration_plan')
    }
    const impactedConsumers = Object.values(run.plan.impact).some((count) => count > 0)
    if (impactedConsumers) {
      const unsupportedImpact = Object.entries(run.plan.impact).some(
        ([kind, count]) => count > 0 && !SUPPORTED_COORDINATED_CONSUMER_IMPACT_KINDS.has(kind)
      )
      if (unsupportedImpact || this.consumerCoordinator === undefined) {
        throw new ValidationException(
          'taxonomy_consumer_coordination_required: an approved consumer coordinator is required before publication'
        )
      }
    }
    const currentVersion = await this.versionReader.getVersion(run.plan.namespace)
    if (currentVersion !== run.plan.fromVersion || input.publishedVersion > currentVersion) {
      throw new ConflictException('stale_taxonomy_migration_plan')
    }
    if (impactedConsumers && this.consumerCoordinator !== undefined) {
      const coordination = await this.consumerCoordinator.coordinate({ run, limit: input.limit, now: input.now })
      if (coordination.status === 'requires_repair') {
        throw new ValidationException('taxonomy_consumer_repair_required: repair affected consumers before publication')
      }
      if (coordination.status !== 'completed') {
        throw new ValidationException('taxonomy_consumer_coordination_pending: retry after the consumer checkpoint advances')
      }
    }
    return this.applyCommand.handle({
      ...input,
      items: impactedConsumers ? [] : input.items,
      currentVersion,
    })
  }

  status(planToken: string) {
    return this.repository.findByPlanToken(planToken)
  }
}
