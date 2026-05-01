import type { AccomplishmentPublicProjectionReader } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'
import {
  ACCOMPLISHMENT_SEARCH_DOCUMENT_SCHEMA_V1,
  ACCOMPLISHMENT_SEARCH_TAXONOMY_VERSION_V1,
  parseAccomplishmentSearchDocumentV1,
  type AccomplishmentSearchDocumentV1,
} from '#modules/accomplishments/public_contracts/accomplishment_search_document_v1'
import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'

function documentId(projection: AccomplishmentPublicProjectionV1): string {
  return `accomplishment:v1:${projection.accomplishmentId}:publication:${projection.publicationVersion}`
}

export class AccomplishmentSearchDocumentBuilder {
  constructor(private readonly reader: AccomplishmentPublicProjectionReader) {}

  build(projection: AccomplishmentPublicProjectionV1): AccomplishmentSearchDocumentV1 {
    return parseAccomplishmentSearchDocumentV1({
      schemaVersion: ACCOMPLISHMENT_SEARCH_DOCUMENT_SCHEMA_V1,
      taxonomyVersion: ACCOMPLISHMENT_SEARCH_TAXONOMY_VERSION_V1,
      documentId: documentId(projection),
      sourceId: projection.id,
      sourceCanonicalHash: projection.sourceCanonicalHash,
      userId: projection.userId,
      title: projection.title,
      conciseStatement: projection.conciseStatement,
      action: projection.action,
      object: projection.object,
      taskType: projection.taskType,
      businessDomain: projection.businessDomain,
      problemCategory: projection.problemCategory,
      role: projection.role,
      ownershipLevel: projection.ownershipLevel,
      scaleSummary: projection.context.scaleSummary,
      deliverableSummaries: projection.deliverableSummaries,
      outcomeSummaries: projection.outcomeSummaries,
      capabilities: projection.capabilities,
      verificationStatus: projection.verification.status,
      confidenceBand: projection.verification.confidenceBand,
      provenanceClass: projection.verification.provenanceClass,
      publishedAt: projection.publishedAt,
      sourceUpdatedAt: projection.sourceUpdatedAt,
      publicationVersion: projection.publicationVersion,
    })
  }

  async findById(id: string): Promise<AccomplishmentSearchDocumentV1 | null> {
    const projection = await this.reader.findActiveById(id)
    return projection ? this.build(projection) : null
  }

  async listForUser(input: {
    readonly userId: string
    readonly limit: number
    readonly cursor?: string
  }): Promise<{ readonly items: readonly AccomplishmentSearchDocumentV1[]; readonly nextCursor: string | null }> {
    const page = await this.reader.listActiveForUser(input)
    return { items: page.items.map((projection) => this.build(projection)), nextCursor: page.nextCursor }
  }
}
