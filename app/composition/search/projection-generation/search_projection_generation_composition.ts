import { ApplySearchIndexActivationCommand } from '#modules/search/actions/commands/index-administration/apply_search_index_activation_command'
import { ReconcileSearchProjectionGenerationCommand } from '#modules/search/actions/commands/projection-generation/reconcile_search_projection_generation_command'
import type { SearchIndexDescriptor } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import { PreviewSearchIndexActivationQuery } from '#modules/search/actions/queries/index-administration/preview_search_index_activation_query'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import { NodeSearchIndexPlanTokenGenerator } from '#modules/search/infra/adapters/index-administration/node_search_index_plan_token_generator'
import { PostgresSearchIndexCutoverFence } from '#modules/search/infra/adapters/index-administration/postgres_search_index_cutover_fence'
import { searchIndexAdminClient } from '#modules/search/infra/adapters/index-administration/elasticsearch_search_index_admin_client'
import { PostgresSearchProjectionGenerationRepository } from '#modules/search/infra/repositories/projection-generation/postgres_search_projection_generation_repository'
import { buildSearchIndexDescriptors } from '#modules/search/infra/adapters/index-administration/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'

type ActivationInput = { readonly id: string }

const repository = new PostgresSearchProjectionGenerationRepository()
const tokenGenerator = new NodeSearchIndexPlanTokenGenerator()
const fence = new PostgresSearchIndexCutoverFence()
const descriptors = buildSearchIndexDescriptors()
const lifecycles = new Map(
  descriptors.map((descriptor) => [descriptor.target, createLifecycle(descriptor)])
)

function createLifecycle(descriptor: SearchIndexDescriptor): VersionedSearchIndexLifecycle {
  return new VersionedSearchIndexLifecycle(
    searchIndexAdminClient,
    descriptor.aliasName,
    descriptor.initialPhysicalIndexName,
    fence
  )
}

function lifecycleFor(generation: SearchProjectionGeneration): VersionedSearchIndexLifecycle {
  const lifecycle = lifecycleForTarget(generation.target)
  if (!lifecycle) throw new Error('Search projection target is not supported')
  return lifecycle
}

function lifecycleForTarget(target: string): VersionedSearchIndexLifecycle | undefined {
  return lifecycles.get(target as SearchIndexDescriptor['target'])
}

export const previewSearchIndexActivationQuery = {
  async handle(input: ActivationInput) {
    const generation = await repository.findById(input.id)
    const routing = generation
      ? lifecycleFor(generation)
      : { getBackingIndices: () => Promise.resolve([] as string[]) }
    return new PreviewSearchIndexActivationQuery(repository, routing, tokenGenerator).handle(input)
  },
}

export const applySearchIndexActivationCommand = {
  async handle(input: {
    readonly id: string
    readonly expectedLockVersion: number
    readonly expectedCurrentIndexNames?: readonly string[]
    readonly expectedStateToken: string
    readonly now: string
  }) {
    const generation = await repository.findById(input.id)
    const routing = generation
      ? lifecycleFor(generation)
      : {
          getBackingIndices: () => Promise.resolve([] as string[]),
          activateGeneration: () => Promise.reject(new Error('Search projection generation is missing')),
        }
    return new ApplySearchIndexActivationCommand(repository, routing, tokenGenerator).handle(input)
  },
}

export const reconcileSearchProjectionGenerationCommand = {
  async handle(input: { readonly target: string }) {
    const lifecycle = lifecycleForTarget(input.target)
    if (!lifecycle) throw new Error('Search projection target is not supported')
    return new ReconcileSearchProjectionGenerationCommand(repository, lifecycle).handle(input)
  },
}
