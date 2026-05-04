import type { ApplicationService } from '@adonisjs/core/types'

import AccomplishmentPublicationAuditWriterAdapter from '#composition/adapters/accomplishments/publication/accomplishment_publication_audit_writer'
import AccomplishmentPublicationCacheInvalidatorAdapter from '#composition/adapters/accomplishments/publication/accomplishment_publication_cache_invalidator'
import AccomplishmentPublicationSearchReindexStagerAdapter from '#composition/adapters/accomplishments/publication/accomplishment_publication_search_reindex_stager'
import CanonicalVisibilityAccomplishmentDisclosurePolicy from '#composition/adapters/accomplishments/publication/canonical_visibility_accomplishment_disclosure_policy'
import { PrepareAccomplishmentPublicationCommand } from '#modules/accomplishments/actions/commands/publication/prepare_accomplishment_publication_command'
import {
  PublishAccomplishmentPublicProjectionCommand,
  UnpublishAccomplishmentPublicProjectionCommand,
} from '#modules/accomplishments/actions/commands/publication/publish_accomplishment_public_projection_command'
import { AccomplishmentPublicationFactory } from '#modules/accomplishments/actions/ports/inbound/publication/accomplishment_publication_factory'
import LucidAccomplishmentPublicationFactsStore from '#modules/accomplishments/infra/adapters/publication/lucid_accomplishment_publication_facts_store'
import { LucidAccomplishmentTransactionRunner } from '#modules/accomplishments/infra/adapters/verified-work/lucid_accomplishment_transaction_runner'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { accomplishmentPublicProjectionRepository } from '#modules/accomplishments/infra/repositories/publication/accomplishment_public_projection_repository'

const hasher = new NodeAccomplishmentContentHasher()
const facts = new LucidAccomplishmentPublicationFactsStore(hasher)
const disclosurePolicy = new CanonicalVisibilityAccomplishmentDisclosurePolicy()
const auditWriter = new AccomplishmentPublicationAuditWriterAdapter()
const cacheInvalidator = new AccomplishmentPublicationCacheInvalidatorAdapter()
const searchReindexStager = new AccomplishmentPublicationSearchReindexStagerAdapter()
const transactions = new LucidAccomplishmentTransactionRunner()

const prepare = new PrepareAccomplishmentPublicationCommand({ facts, hasher, disclosurePolicy })
const publish = new PublishAccomplishmentPublicProjectionCommand({
  sources: facts,
  writer: accomplishmentPublicProjectionRepository,
  hasher,
  auditWriter,
  cacheInvalidator,
  transactions,
  searchReindexStager,
})
const unpublish = new UnpublishAccomplishmentPublicProjectionCommand({
  sources: facts,
  writer: accomplishmentPublicProjectionRepository,
  auditWriter,
  cacheInvalidator,
  transactions,
  searchReindexStager,
})

class ComposedAccomplishmentPublicationFactory extends AccomplishmentPublicationFactory {
  async publish(input: Parameters<AccomplishmentPublicationFactory['publish']>[0]) {
    const prepared = await prepare.execute(input)
    return publish.execute({
      accomplishmentId: input.accomplishmentId,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      expectedSourceCanonicalHash: input.expectedSourceCanonicalHash,
      expectedLifecycleRevisionId: input.expectedLifecycleRevisionId,
      expectedDisclosureDecisionHash: prepared.decision.decisionHash,
      expectedDisclosurePolicyVersion: prepared.decision.policyVersion,
      consentFactId: prepared.consent.consentFactId,
      consentFactHash: prepared.consent.consentFactHash,
      auditContext: input.auditContext,
    })
  }

  async unpublish(input: Parameters<AccomplishmentPublicationFactory['unpublish']>[0]) {
    return unpublish.execute(input)
  }
}

export const accomplishmentPublicationFactory = new ComposedAccomplishmentPublicationFactory()

export default class AccomplishmentApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      AccomplishmentPublicationFactory,
      () => accomplishmentPublicationFactory
    )
  }
}
