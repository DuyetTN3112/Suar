import { BaseCommand } from '../../base_command.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type {
  TvaChangeClass,
  TvaJsonObject,
  TvaJsonValue,
  TvaPrivacyClassification,
  TvaSha256,
  TvaSourceProvenanceV1,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { ProjectContextAuthorizationReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_authorization_reader'
import type { ProjectContextCacheInvalidator } from '#modules/projects/actions/ports/outbound/project-context/project_context_cache_invalidator'
import type { ProjectContextChangeStager } from '#modules/projects/actions/ports/outbound/project-context/project_context_change_stager'
import type { ProjectContextContentHasher } from '#modules/projects/actions/ports/outbound/project-context/project_context_content_hasher'
import type { ProjectContextVersionRepository } from '#modules/projects/actions/ports/outbound/project-context/project_context_version_repository'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import {
  decideProjectContextPublication,
  PROJECT_CONTEXT_RULE_CODES,
} from '#modules/projects/domain/project-context/project_context_rules'
import {
  PROJECT_CONTEXT_CHANGED_SCHEMA_V1,
  type ProjectContextChangedV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

export interface PublishProjectContextVersionInput {
  projectId: string
  expectedActiveVersionId: string | null
  title: string
  summary: string
  plainTextProjection: string
  richContent: TvaJsonValue
  structuredDefaults: TvaJsonObject
  supportingReferences: ReadonlyArray<{
    url: string
    access: 'public' | 'authenticated' | 'restricted' | 'unknown'
  }>
  confirmed: boolean
  changeClass: TvaChangeClass
  changeReason: string | null
  privacyClassification: TvaPrivacyClassification
  sourceProvenance: TvaSourceProvenanceV1
}

export interface PublishedProjectContextVersion {
  id: string
  projectId: string
  organizationId: string
  versionNumber: number
  versionToken: string
  contentHash: TvaSha256
  createdAt: string
}

type Clock = () => string

export default class PublishProjectContextVersionCommand extends BaseCommand<
  PublishProjectContextVersionInput,
  PublishedProjectContextVersion
> {
  constructor(
    context: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly repository: ProjectContextVersionRepository,
    private readonly authorizationReader: ProjectContextAuthorizationReader,
    private readonly changeStager: ProjectContextChangeStager,
    private readonly cacheInvalidator: ProjectContextCacheInvalidator,
    private readonly contentHasher: ProjectContextContentHasher,
    private readonly clock: Clock = () => new Date().toISOString()
  ) {
    super(context, transactionRunner)
  }

  async handle(input: PublishProjectContextVersionInput): Promise<PublishedProjectContextVersion> {
    const actorId = this.getCurrentUserId()
    const occurredAt = this.clock()

    const result = await this.executeInTransaction(async (transaction) => {
      const [scope, authorization] = await Promise.all([
        this.repository.findScopeForUpdate(input.projectId, transaction),
        this.authorizationReader.findContextAuthorization(
          { projectId: input.projectId, actorId },
          transaction
        ),
      ])

      if (
        authorization.actorId !== actorId ||
        authorization.projectId !== scope.projectId ||
        authorization.organizationId !== scope.organizationId
      ) {
        throw new InvariantViolationException('Project Context authorization scope mismatch')
      }

      const decision = decideProjectContextPublication({
        authorization: {
          ...authorization,
          projectArchived: scope.projectArchived,
        },
        current: {
          activeVersionId: scope.activeVersionId,
          activeVersionNumber: scope.activeVersionNumber,
        },
        expectedActiveVersionId: input.expectedActiveVersionId,
        title: input.title,
        summary: input.summary,
        localCriticalContent: input.plainTextProjection,
        richContent: input.richContent,
        confirmed: input.confirmed,
        supportingReferences: input.supportingReferences,
      })

      if (!decision.allowed) {
        const details = { ruleCode: decision.code, field: decision.field }
        if (decision.code === PROJECT_CONTEXT_RULE_CODES.versionConflict) {
          throw new ConflictException(decision.message, details)
        }
        enforcePolicy({
          allowed: false,
          reason: decision.message,
          code:
            decision.code === PROJECT_CONTEXT_RULE_CODES.editForbidden
              ? 'FORBIDDEN'
              : 'BUSINESS_RULE',
        })
        throw new InvariantViolationException('Denied Project Context policy unexpectedly returned')
      }

      const contentHash = this.contentHasher.hash({
        title: input.title.trim(),
        summary: input.summary.trim(),
        richContent: decision.sanitizedRichContent,
        plainTextProjection: input.plainTextProjection.trim(),
        structuredDefaults: input.structuredDefaults,
        privacyClassification: input.privacyClassification,
      })
      const created = await this.repository.createVersion(
        {
          projectId: scope.projectId,
          organizationId: scope.organizationId,
          versionNumber: decision.nextVersionNumber,
          title: input.title.trim(),
          summary: input.summary.trim(),
          richContent: decision.sanitizedRichContent,
          plainTextProjection: input.plainTextProjection.trim(),
          structuredDefaults: input.structuredDefaults,
          activeFrom: occurredAt,
          createdBy: actorId,
          confirmedBy: input.confirmed ? actorId : null,
          changeClass: input.changeClass,
          changeReason: input.changeReason,
          privacyClassification: input.privacyClassification,
          contentHash,
          sourceProvenance: input.sourceProvenance,
        },
        transaction
      )

      const activated = await this.repository.activateVersion(
        {
          projectId: scope.projectId,
          expectedActiveVersionId: input.expectedActiveVersionId,
          nextVersionId: created.id,
        },
        transaction
      )
      if (!activated) {
        throw new ConflictException(
          'The active Project Context changed during publication. Reload and retry.',
          { ruleCode: PROJECT_CONTEXT_RULE_CODES.versionConflict }
        )
      }

      const changedFact: ProjectContextChangedV1 = {
        schemaVersion: PROJECT_CONTEXT_CHANGED_SCHEMA_V1,
        projectId: scope.projectId,
        organizationId: scope.organizationId,
        previousVersionId: scope.activeVersionId,
        activeVersionId: created.id,
        activeVersionNumber: created.versionNumber,
        versionToken: decision.versionToken,
        actorId,
        occurredAt,
      }
      await this.changeStager.stageProjectContextChanged(changedFact, transaction)

      return {
        id: created.id,
        projectId: created.projectId,
        organizationId: created.organizationId,
        versionNumber: created.versionNumber,
        versionToken: decision.versionToken,
        contentHash,
        createdAt: created.createdAt,
      }
    })

    await this.settlePostCommitEffect(
      'project_context.resolved_task_cache.invalidated',
      () =>
        this.cacheInvalidator.invalidateResolvedTaskContext(result.projectId, result.versionToken),
      { projectId: result.projectId, actorId }
    )
    return result
  }
}
