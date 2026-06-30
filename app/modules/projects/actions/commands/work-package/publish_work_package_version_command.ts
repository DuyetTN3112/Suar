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
import type { ProjectContextContentHasher } from '#modules/projects/actions/ports/outbound/project-context/project_context_content_hasher'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { WorkPackageChangeStager } from '#modules/projects/actions/ports/outbound/work_package_change_stager'
import type {
  WorkPackageRecord,
  WorkPackageRepository,
  WorkPackageScopeRecord,
} from '#modules/projects/actions/ports/outbound/work_package_repository'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import {
  decideWorkPackagePublication,
  PROJECT_CONTEXT_RULE_CODES,
} from '#modules/projects/domain/project-context/project_context_rules'
import {
  WORK_PACKAGE_CHANGED_SCHEMA_V1,
  type WorkPackageChangedV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

export interface PublishWorkPackageVersionInput {
  projectId: string
  workPackageId: string | null
  expectedActiveVersionId: string | null
  projectContextVersionId: string | null
  key: string
  title: string
  summary: string
  plainTextProjection: string
  richContent: TvaJsonValue
  structuredOverrides: TvaJsonObject
  confirmed: boolean
  changeClass: TvaChangeClass
  changeReason: string | null
  privacyClassification: TvaPrivacyClassification
  sourceProvenance: TvaSourceProvenanceV1
}

export interface PublishedWorkPackageVersion {
  workPackageId: string
  versionId: string
  projectId: string
  organizationId: string
  versionNumber: number
  versionToken: string
  contentHash: TvaSha256
  createdAt: string
}

type Clock = () => string

function scopeFromCreated(record: WorkPackageRecord): WorkPackageScopeRecord {
  return {
    id: record.id,
    projectId: record.projectId,
    organizationId: record.organizationId,
    key: record.key,
    title: record.title,
    summary: record.summary,
    state: record.state,
    activeVersionId: record.activeVersionId,
    activeVersionNumber: 0,
    archivedAt: record.archivedAt,
  }
}

export default class PublishWorkPackageVersionCommand extends BaseCommand<
  PublishWorkPackageVersionInput,
  PublishedWorkPackageVersion
> {
  constructor(
    context: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly repository: WorkPackageRepository,
    private readonly authorizationReader: ProjectContextAuthorizationReader,
    private readonly changeStager: WorkPackageChangeStager,
    private readonly cacheInvalidator: ProjectContextCacheInvalidator,
    private readonly contentHasher: ProjectContextContentHasher,
    private readonly clock: Clock = () => new Date().toISOString()
  ) {
    super(context, transactionRunner)
  }

  async handle(input: PublishWorkPackageVersionInput): Promise<PublishedWorkPackageVersion> {
    const actorId = this.getCurrentUserId()
    const occurredAt = this.clock()

    const result = await this.executeInTransaction(async (transaction) => {
      const [projectScope, authorization] = await Promise.all([
        this.repository.findProjectScopeForUpdate(input.projectId, transaction),
        this.authorizationReader.findContextAuthorization(
          { projectId: input.projectId, actorId },
          transaction
        ),
      ])
      if (
        authorization.actorId !== actorId ||
        authorization.projectId !== projectScope.projectId ||
        authorization.organizationId !== projectScope.organizationId
      ) {
        throw new InvariantViolationException('Work Package authorization scope mismatch')
      }

      const existingScope = input.workPackageId
        ? await this.repository.findPackageScopeForUpdate(input.workPackageId, transaction)
        : null
      const candidateScope: WorkPackageScopeRecord = existingScope ?? {
        id: 'pending',
        projectId: projectScope.projectId,
        organizationId: projectScope.organizationId,
        key: input.key,
        title: input.title,
        summary: input.summary,
        state: 'active',
        activeVersionId: null,
        activeVersionNumber: 0,
        archivedAt: null,
      }
      const projectContextVersionValid = input.projectContextVersionId
        ? await this.repository.isProjectContextVersionVisible(
            {
              versionId: input.projectContextVersionId,
              projectId: projectScope.projectId,
              organizationId: projectScope.organizationId,
            },
            transaction
          )
        : true
      const decision = decideWorkPackagePublication({
        authorization: {
          ...authorization,
          projectArchived: projectScope.projectArchived,
        },
        workPackage: candidateScope,
        expectedActiveVersionId: input.expectedActiveVersionId,
        projectContextVersionId: input.projectContextVersionId,
        projectContextVersionValid,
        draft: {
          projectId: projectScope.projectId,
          organizationId: projectScope.organizationId,
          key: input.key,
          title: input.title,
          summary: input.summary,
        },
        localCriticalContent: input.plainTextProjection,
        richContent: input.richContent,
        confirmed: input.confirmed,
      })
      if (!decision.allowed) {
        const details = { ruleCode: decision.code, field: decision.field }
        if (decision.code === PROJECT_CONTEXT_RULE_CODES.workPackageVersionConflict) {
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
        throw new InvariantViolationException('Denied Work Package policy unexpectedly returned')
      }

      const workPackage = existingScope
        ? existingScope
        : scopeFromCreated(
            await this.repository.createPackage(
              {
                projectId: projectScope.projectId,
                organizationId: projectScope.organizationId,
                key: decision.value.key,
                title: decision.value.title,
                summary: decision.value.summary,
                createdBy: actorId,
              },
              transaction
            )
          )
      const versionToken = `${projectScope.projectId}:work-package:${workPackage.id}:${decision.nextVersionNumber}`
      const contentHash = this.contentHasher.hash({
        workPackageId: workPackage.id,
        projectContextVersionId: input.projectContextVersionId,
        title: decision.value.title,
        summary: decision.value.summary,
        richContent: decision.sanitizedRichContent,
        plainTextProjection: input.plainTextProjection.trim(),
        structuredOverrides: input.structuredOverrides,
        privacyClassification: input.privacyClassification,
      })
      const created = await this.repository.createVersion(
        {
          workPackageId: workPackage.id,
          projectId: projectScope.projectId,
          projectContextVersionId: input.projectContextVersionId,
          versionNumber: decision.nextVersionNumber,
          title: decision.value.title,
          summary: decision.value.summary,
          richContent: decision.sanitizedRichContent,
          plainTextProjection: input.plainTextProjection.trim(),
          structuredOverrides: input.structuredOverrides,
          authorId: actorId,
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
          workPackageId: workPackage.id,
          expectedActiveVersionId: input.expectedActiveVersionId,
          nextVersionId: created.id,
          title: decision.value.title,
          summary: decision.value.summary,
        },
        transaction
      )
      if (!activated) {
        throw new ConflictException(
          'The active Work Package changed during publication. Reload and retry.',
          { ruleCode: PROJECT_CONTEXT_RULE_CODES.workPackageVersionConflict }
        )
      }

      const fact: WorkPackageChangedV1 = {
        schemaVersion: WORK_PACKAGE_CHANGED_SCHEMA_V1,
        projectId: projectScope.projectId,
        organizationId: projectScope.organizationId,
        workPackageId: workPackage.id,
        activeVersionId: created.id,
        activeVersionNumber: created.versionNumber,
        versionToken,
        changeType: 'version_published',
        actorId,
        occurredAt,
      }
      await this.changeStager.stageWorkPackageChanged(fact, transaction)

      return {
        workPackageId: workPackage.id,
        versionId: created.id,
        projectId: projectScope.projectId,
        organizationId: projectScope.organizationId,
        versionNumber: created.versionNumber,
        versionToken,
        contentHash,
        createdAt: created.createdAt,
      }
    })

    await this.settlePostCommitEffect(
      'work_package.resolved_task_cache.invalidated',
      () =>
        this.cacheInvalidator.invalidateResolvedTaskContext(result.projectId, result.versionToken),
      { projectId: result.projectId, actorId }
    )
    return result
  }
}
