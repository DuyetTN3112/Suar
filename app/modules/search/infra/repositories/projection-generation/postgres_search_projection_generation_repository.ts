import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type { SearchProjectionGenerationRecord, SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import type { SearchProjectionGeneration, SearchProjectionGenerationStatus } from '#modules/search/domain/projection-generation/search_projection_generation'

interface GenerationRow {
  id: string
  target: string
  generation: string
  physical_index_name: string
  status: SearchProjectionGenerationStatus
  source_entity_revision: string
  context_version: string
  taxonomy_versions: Readonly<Record<string, number>> | string
  enrichment_version: string
  checkpoint: string | null
  document_count: number | string | null
  completeness_checksum: string | null
  lock_version: number | string
  created_at: Date | string
  updated_at: Date | string
}

function parsed<T>(value: T | string): T { return typeof value === 'string' ? JSON.parse(value) as T : value }
function integer(value: number | string): number { return Number(value) }
function timestamp(value: Date | string): string { return new Date(value).toISOString() }

function mapRow(row: GenerationRow): { generation: SearchProjectionGeneration; lockVersion: number } {
  return {
    lockVersion: integer(row.lock_version),
    generation: {
      id: row.id,
      target: row.target,
      generation: row.generation,
      physicalIndexName: row.physical_index_name,
      status: row.status,
      sourceEntityRevision: row.source_entity_revision,
      contextVersion: row.context_version,
      taxonomyVersions: parsed(row.taxonomy_versions),
      enrichmentVersion: row.enrichment_version,
      checkpoint: row.checkpoint,
      documentCount: row.document_count === null ? null : integer(row.document_count),
      completenessChecksum: row.completeness_checksum,
      createdAt: timestamp(row.created_at),
      updatedAt: timestamp(row.updated_at),
    },
  }
}

export class PostgresSearchProjectionGenerationRepository implements SearchProjectionGenerationRepository {
  constructor(private readonly client?: TransactionClientContract) {}

  private get database(): typeof db | TransactionClientContract {
    return this.client ?? db
  }

  async create(generation: SearchProjectionGeneration): Promise<SearchProjectionGeneration> {
    const [row] = (await this.database.table('search_projection_generations').insert({
      id: generation.id,
      target: generation.target,
      generation: generation.generation,
      physical_index_name: generation.physicalIndexName,
      status: generation.status,
      source_entity_revision: generation.sourceEntityRevision,
      context_version: generation.contextVersion,
      taxonomy_versions: JSON.stringify(generation.taxonomyVersions),
      enrichment_version: generation.enrichmentVersion,
      checkpoint: generation.checkpoint,
      document_count: generation.documentCount,
      completeness_checksum: generation.completenessChecksum,
      lock_version: 1,
      created_at: generation.createdAt,
      updated_at: generation.updatedAt,
    }).returning('*')) as GenerationRow[]
    if (!row) throw new PersistedDataIntegrityException('search_projection_generation_create_failed')
    return mapRow(row).generation
  }

  async findById(id: string): Promise<SearchProjectionGeneration | null> {
    const row = (await this.database.from('search_projection_generations').where('id', id).first()) as GenerationRow | undefined
    return row ? mapRow(row).generation : null
  }

  async listByTarget(target: string): Promise<readonly SearchProjectionGenerationRecord[]> {
    const rows = (await this.database.from('search_projection_generations').where('target', target).orderBy('updated_at', 'desc').orderBy('id', 'asc')) as GenerationRow[]
    return rows.map(mapRow)
  }

  async withTargetLock<T>(target: string, callback: (repository: SearchProjectionGenerationRepository) => Promise<T>): Promise<T> {
    return db.transaction(async (trx) => {
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [target])
      return callback(new PostgresSearchProjectionGenerationRepository(trx))
    })
  }

  async transition(input: { id: string; expectedLockVersion: number; status: SearchProjectionGenerationStatus; sourceEntityRevision: string; checkpoint: string | null; documentCount: number | null; completenessChecksum: string | null; updatedAt: string }): Promise<{ generation: SearchProjectionGeneration; lockVersion: number } | null> {
    const [row] = (await this.database.from('search_projection_generations').where('id', input.id).where('lock_version', input.expectedLockVersion).update({ status: input.status, source_entity_revision: input.sourceEntityRevision, checkpoint: input.checkpoint, document_count: input.documentCount, completeness_checksum: input.completenessChecksum, lock_version: input.expectedLockVersion + 1, updated_at: input.updatedAt }, ['*'])) as GenerationRow[]
    return row ? mapRow(row) : null
  }
}
