import type { AccomplishmentPublicProjectionReader } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'
import type { TalentPublicAccomplishmentReader } from '#modules/users/actions/ports/outbound/talent_public_accomplishment_reader'

export class TalentPublicAccomplishmentReaderAdapter
  implements TalentPublicAccomplishmentReader
{
  constructor(private readonly reader: AccomplishmentPublicProjectionReader) {}

  async listForUser(userId: string) {
    const page = await this.reader.listActiveForUser({ userId, limit: 100 })
    return page.items.map((projection) => ({
      title: projection.title,
      conciseStatement: projection.conciseStatement,
      action: projection.action,
      object: projection.object,
      taskType: projection.taskType,
      businessDomain: projection.businessDomain,
      problemCategory: projection.problemCategory,
      role: projection.role,
      ownershipLevel: projection.ownershipLevel,
      verificationStatus: projection.verification.status,
      confidenceBand: projection.verification.confidenceBand,
      publishedAt: projection.publishedAt,
      technology: projection.technology,
      deliverableSummaries: projection.deliverableSummaries,
      outcomeSummaries: projection.outcomeSummaries,
      capabilityLabels: projection.capabilities.map((capability) => capability.label),
    }))
  }
}
