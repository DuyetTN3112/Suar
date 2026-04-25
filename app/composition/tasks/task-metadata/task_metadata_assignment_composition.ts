import type {
  TaskMetadataCanonicalNamespace,
  TaskMetadataTaxonomyVersionReader,
} from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { LucidTaskMetadataAssignmentSourceReader } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_metadata_assignment_source_reader'
import { TaskMetadataAssignmentProvider } from '#modules/tasks/infra/adapters/task-assignment/task_metadata_assignment_provider'
import { LucidTaxonomyVersionReader } from '#modules/taxonomy/infra/adapters/taxonomy-governance/lucid_taxonomy_version_reader'

/**
 * Production boundary for task metadata versions. Unsupported namespaces are
 * deliberately propagated as unavailable until their source-of-truth tables
 * exist; composition must not invent versions for legacy task fields.
 */
class ProductionTaskMetadataTaxonomyVersionReader
  implements TaskMetadataTaxonomyVersionReader
{
  constructor(private readonly reader = new LucidTaxonomyVersionReader()) {}

  async getVersions(namespaces: readonly TaskMetadataCanonicalNamespace[]) {
    const versions = await Promise.all(
      namespaces.map(async (namespace) => [namespace, await this.reader.getVersion(namespace)] as const)
    )
    return { taxonomyVersions: Object.fromEntries(versions) }
  }
}

export const taskMetadataAssignmentProvider = new TaskMetadataAssignmentProvider(
  new LucidTaskMetadataAssignmentSourceReader(new ProductionTaskMetadataTaxonomyVersionReader())
)
