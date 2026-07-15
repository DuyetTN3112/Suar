import type { estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type {
  TaskSearchDocument,
  TaskSearchHit,
} from '#modules/search/domain/entity-search/task_search_document'
import {
  buildTaskSearchIndexName,
  buildTaskSearchPhysicalIndexName,
  isOwnedSearchPhysicalIndex,
} from '#modules/search/infra/adapters/index-administration/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'
import { bulkIndexSearchDocuments } from '#modules/search/infra/adapters/projection-generation/search_bulk_indexer'
import { searchClient } from '#platform/search/elasticsearch_client'

interface TaskEngineSearchInput {
  q: string
  limit: number
  organizationId?: string
  publicOnly?: boolean
}

interface TaskSearchSource {
  task_id: string
}

type MappingProperties = NonNullable<estypes.MappingTypeMapping['properties']>
type MappingProperty = MappingProperties[string]

export const TASK_SEARCH_INDEX_MAPPINGS: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    task_id: { type: 'keyword' },
    organization_id: { type: 'keyword' },
    creator_id: { type: 'keyword' },
    project_id: { type: 'keyword' },
    title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    description: { type: 'text' },
    acceptance_criteria: { type: 'text' },
    context_background: { type: 'text' },
    required_skill_ids: { type: 'keyword' },
    required_skill_ids_known: { type: 'boolean' },
    required_skill_ids_count: { type: 'long' },
    required_skill_category_codes: { type: 'keyword' },
    required_skill_category_codes_known: { type: 'boolean' },
    required_skill_category_codes_count: { type: 'long' },
    required_skills_text: { type: 'text' },
    business_domains: { type: 'keyword', fields: { text: { type: 'text' } } },
    business_domains_coverage: { type: 'keyword' },
    business_domains_known: { type: 'boolean' },
    business_domains_count: { type: 'long' },
    problem_categories: { type: 'keyword', fields: { text: { type: 'text' } } },
    problem_categories_coverage: { type: 'keyword' },
    problem_categories_known: { type: 'boolean' },
    problem_categories_count: { type: 'long' },
    task_types: { type: 'keyword', fields: { text: { type: 'text' } } },
    task_types_coverage: { type: 'keyword' },
    task_types_known: { type: 'boolean' },
    task_types_count: { type: 'long' },
    difficulty: { type: 'keyword' },
    status: { type: 'keyword' },
    label: { type: 'keyword' },
    priority: { type: 'keyword' },
    task_visibility: { type: 'keyword' },
    is_public: { type: 'boolean' },
    is_deleted: { type: 'boolean' },
    marketplace_visible: { type: 'boolean' },
    application_eligible: { type: 'boolean' },
    member_visible: { type: 'boolean' },
    assigned_to: { type: 'keyword' },
    verification_method: { type: 'keyword', fields: { text: { type: 'text' } } },
    tech_stack: { type: 'keyword', fields: { text: { type: 'text' } } },
    tech_stack_known: { type: 'boolean' },
    tech_stack_count: { type: 'long' },
    domain_tags: { type: 'keyword', fields: { text: { type: 'text' } } },
    domain_tags_known: { type: 'boolean' },
    domain_tags_count: { type: 'long' },
    learning_objectives: { type: 'text' },
    learning_objectives_known: { type: 'boolean' },
    learning_objectives_count: { type: 'long' },
    canonical_term_ids: { type: 'keyword' },
    canonical_term_ids_known: { type: 'boolean' },
    canonical_term_ids_count: { type: 'long' },
    canonical_term_ids_by_namespace: { type: 'object', dynamic: false },
    assignment_provenance: { type: 'keyword' },
    assignment_review_states: { type: 'keyword' },
    taxonomy_versions: { type: 'keyword' },
    taxonomy_versions_by_namespace: { type: 'object', dynamic: false },
    taxonomy_completeness: { type: 'keyword' },
    taxonomy_completeness_by_namespace: { type: 'object', dynamic: false },
    metadata_assignment_schema_version: { type: 'long' },
    metadata_source_revisions: { type: 'keyword' },
    metadata_enrichment_versions_by_namespace: { type: 'object', dynamic: false },
    role_in_task: { type: 'keyword', fields: { text: { type: 'text' } } },
    autonomy_level: { type: 'keyword', fields: { text: { type: 'text' } } },
    collaboration_type: { type: 'keyword', fields: { text: { type: 'text' } } },
    impact_scope: { type: 'keyword', fields: { text: { type: 'text' } } },
    environment: { type: 'keyword', fields: { text: { type: 'text' } } },
    application_deadline: { type: 'date' },
    due_date: { type: 'date' },
    created_at: { type: 'date' },
    estimated_users_affected: { type: 'long' },
    external_applications_count: { type: 'long' },
    deleted_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
}

export class TaskSearchIndexMigrationRequiredError extends Error {
  override readonly name = 'TaskSearchIndexMigrationRequiredError'
  readonly code = 'TASK_SEARCH_INDEX_MIGRATION_REQUIRED'

  constructor(readonly issues: string[]) {
    super(
      'Task Search index mapping requires a populated generation rebuild before reads or writes: ' +
        issues.join(', ')
    )
  }
}

function mappingPropertyType(property: MappingProperty | undefined): string | undefined {
  if (!property || typeof property !== 'object' || !('type' in property)) {
    return undefined
  }
  return typeof property.type === 'string' ? property.type : undefined
}

function mappingPropertyFields(property: MappingProperty | undefined): MappingProperties {
  if (!property || typeof property !== 'object' || !('fields' in property)) {
    return {}
  }
  return property.fields
}

function mappingCompatibilityIssues(
  expected: MappingProperties,
  actual: MappingProperties,
  prefix = ''
): string[] {
  const issues: string[] = []
  for (const [field, expectedProperty] of Object.entries(expected)) {
    const path = prefix ? `${prefix}.${field}` : field
    const actualProperty = actual[field]
    const expectedType = mappingPropertyType(expectedProperty)
    const actualType = mappingPropertyType(actualProperty)
    if (!actualProperty) {
      issues.push(`${path}:missing`)
      continue
    }
    if (expectedType !== actualType) {
      issues.push(`${path}:expected_${expectedType ?? 'unknown'}_found_${actualType ?? 'unknown'}`)
      continue
    }

    const expectedFields = mappingPropertyFields(expectedProperty)
    if (Object.keys(expectedFields).length > 0) {
      issues.push(
        ...mappingCompatibilityIssues(expectedFields, mappingPropertyFields(actualProperty), path)
      )
    }
  }
  return issues
}

export class TaskSearchIndexRepository {
  readonly indexName = buildTaskSearchIndexName()
  readonly physicalIndexName = buildTaskSearchPhysicalIndexName()
  private readonly lifecycle: VersionedSearchIndexLifecycle

  constructor(cutoverFence?: SearchIndexCutoverFencePort) {
    this.lifecycle = new VersionedSearchIndexLifecycle(
      searchClient,
      this.indexName,
      this.physicalIndexName,
      cutoverFence
    )
  }

  async ensureIndex(): Promise<void> {
    await this.lifecycle.ensureIndex({
      mappings: TASK_SEARCH_INDEX_MAPPINGS,
    })
    await this.assertActiveMappingCompatible()
  }

  async resetIndex(): Promise<void> {
    await this.lifecycle.resetIndex()
  }

  async upsertDocument(document: TaskSearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.task_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: TaskSearchDocument[]): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.ensureIndex()
    await bulkIndexSearchDocuments(searchClient, {
      indexName: this.indexName,
      documents,
      documentId: (document) => document.task_id,
      refresh: true,
    })
  }

  async replaceAllDocuments(documents: TaskSearchDocument[]): Promise<void> {
    await this.lifecycle.ensureIndex({
      mappings: TASK_SEARCH_INDEX_MAPPINGS,
    })
    await this.lifecycle.rebuildIndex(async (physicalIndexName) => {
      await bulkIndexSearchDocuments(searchClient, {
        indexName: physicalIndexName,
        documents,
        documentId: (document) => document.task_id,
      })
      return documents.length
    })
  }

  async resolveActiveIndexTarget(): Promise<{
    physicalIndexName: string
    generation: string
  }> {
    const backingIndices = await this.lifecycle.getBackingIndices()
    const physicalIndexName = backingIndices[0]
    if (backingIndices.length !== 1 || physicalIndexName === undefined) {
      throw new TaskSearchIndexMigrationRequiredError([
        `${this.indexName}:alias_backing_count:expected_1_found_${backingIndices.length}`,
      ])
    }
    if (
      !isOwnedSearchPhysicalIndex(
        {
          aliasName: this.indexName,
          initialPhysicalIndexName: this.physicalIndexName,
        },
        physicalIndexName
      )
    ) {
      throw new TaskSearchIndexMigrationRequiredError([
        `${this.indexName}:alias_backing_unowned:${physicalIndexName}`,
      ])
    }

    return {
      physicalIndexName,
      generation: physicalIndexName,
    }
  }

  private async assertActiveMappingCompatible(): Promise<void> {
    const mappingsByIndex = await searchClient.indices.getMapping({ index: this.indexName })
    const expectedProperties = TASK_SEARCH_INDEX_MAPPINGS.properties ?? {}
    const expectedDynamic = TASK_SEARCH_INDEX_MAPPINGS.dynamic
    const issues = Object.entries(mappingsByIndex).flatMap(([indexName, descriptor]) => {
      const dynamicIssues =
        descriptor.mappings.dynamic === expectedDynamic
          ? []
          : [
              `${indexName}:dynamic:expected_${String(expectedDynamic)}_found_${String(descriptor.mappings.dynamic)}`,
            ]
      return [
        ...dynamicIssues,
        ...mappingCompatibilityIssues(expectedProperties, descriptor.mappings.properties ?? {}).map(
          (issue) => `${indexName}:${issue}`
        ),
      ]
    })
    if (issues.length > 0) {
      throw new TaskSearchIndexMigrationRequiredError(issues)
    }
  }

  async deleteDocument(taskId: string): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.delete(
      {
        index: this.indexName,
        id: taskId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
    )
  }

  async search(input: TaskEngineSearchInput): Promise<TaskSearchHit[]> {
    await this.assertActiveMappingCompatible()

    const filters: estypes.QueryDslQueryContainer[] = []
    const mustNot: estypes.QueryDslQueryContainer[] = [{ exists: { field: 'deleted_at' } }]

    if (input.publicOnly) {
      filters.push({ term: { is_public: true } })
      mustNot.push({ exists: { field: 'assigned_to' } })
    }

    if (input.organizationId) {
      filters.push({ term: { organization_id: input.organizationId } })
    }

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query: input.q,
              fields: [
                'title^5',
                'required_skills_text^4',
                'domain_tags.text^4',
                'tech_stack.text^4',
                'acceptance_criteria^3',
                'business_domains.text^3',
                'problem_categories.text^3',
                'description^2',
                'task_types.text^2',
                'learning_objectives^2',
                'role_in_task.text',
                'verification_method.text',
                'collaboration_type.text',
                'impact_scope.text',
                'environment.text',
                'context_background',
              ],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: [
                'title^5',
                'required_skills_text^4',
                'domain_tags.text^4',
                'tech_stack.text^4',
                'acceptance_criteria^3',
                'business_domains.text^3',
                'problem_categories.text^3',
                'description^2',
                'task_types.text^2',
                'learning_objectives^2',
                'role_in_task.text',
                'verification_method.text',
                'collaboration_type.text',
                'impact_scope.text',
                'environment.text',
                'context_background',
              ],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
        filter: filters,
        must_not: mustNot,
      },
    }

    const response = await searchClient.search<TaskSearchSource>({
      index: this.indexName,
      size: input.limit,
      query,
      _source: ['task_id'],
    })

    return response.hits.hits.flatMap((hit) => {
      const taskId = hit._source?.task_id
      if (!taskId) {
        return []
      }

      return [{ taskId, score: hit._score ?? 0 }]
    })
  }
}
