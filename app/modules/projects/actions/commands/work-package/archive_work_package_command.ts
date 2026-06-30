import { BaseCommand } from '../../base_command.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { ProjectContextAuthorizationReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_authorization_reader'
import type { ProjectContextCacheInvalidator } from '#modules/projects/actions/ports/outbound/project-context/project_context_cache_invalidator'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { WorkPackageChangeStager } from '#modules/projects/actions/ports/outbound/work_package_change_stager'
import type { WorkPackageRepository } from '#modules/projects/actions/ports/outbound/work_package_repository'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import {
  WORK_PACKAGE_CHANGED_SCHEMA_V1,
  type WorkPackageChangedV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

export interface ArchiveWorkPackageInput {
  projectId: string
  workPackageId: string
  expectedActiveVersionId: string | null
}

export interface ArchivedWorkPackageResult {
  workPackageId: string
  projectId: string
  archivedAt: string
  versionToken: string
}

type Clock = () => string

export default class ArchiveWorkPackageCommand extends BaseCommand<
  ArchiveWorkPackageInput,
  ArchivedWorkPackageResult
> {
  constructor(
    context: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly repository: WorkPackageRepository,
    private readonly authorizationReader: ProjectContextAuthorizationReader,
    private readonly changeStager: WorkPackageChangeStager,
    private readonly cacheInvalidator: ProjectContextCacheInvalidator,
    private readonly clock: Clock = () => new Date().toISOString()
  ) {
    super(context, transactionRunner)
  }

  override async handle(input: ArchiveWorkPackageInput): Promise<ArchivedWorkPackageResult> {
    const actorId = this.getCurrentUserId()
    const archivedAt = this.clock()
    const result = await this.executeInTransaction(async (transaction) => {
      const [projectScope, packageScope, authorization] = await Promise.all([
        this.repository.findProjectScopeForUpdate(input.projectId, transaction),
        this.repository.findPackageScopeForUpdate(input.workPackageId, transaction),
        this.authorizationReader.findContextAuthorization(
          { projectId: input.projectId, actorId },
          transaction
        ),
      ])
      if (
        authorization.actorId !== actorId ||
        authorization.projectId !== projectScope.projectId ||
        authorization.organizationId !== projectScope.organizationId ||
        packageScope.projectId !== projectScope.projectId ||
        packageScope.organizationId !== projectScope.organizationId
      ) {
        throw new InvariantViolationException('Work Package archive scope mismatch')
      }
      if (!authorization.canManageContext || projectScope.projectArchived) {
        enforcePolicy({
          allowed: false,
          reason: 'Actor may not archive this Work Package.',
          code: authorization.canManageContext ? 'BUSINESS_RULE' : 'FORBIDDEN',
        })
      }
      if (packageScope.activeVersionId !== input.expectedActiveVersionId) {
        throw new ConflictException('The active Work Package changed before archive.')
      }
      if (packageScope.state === 'archived') {
        return {
          workPackageId: packageScope.id,
          projectId: packageScope.projectId,
          archivedAt: packageScope.archivedAt ?? archivedAt,
          versionToken: `${packageScope.projectId}:work-package:${packageScope.id}:${packageScope.activeVersionNumber}:archived`,
        }
      }

      const archived = await this.repository.archive(
        {
          workPackageId: packageScope.id,
          expectedActiveVersionId: input.expectedActiveVersionId,
          archivedAt,
        },
        transaction
      )
      if (!archived) {
        throw new ConflictException('The Work Package changed during archive. Reload and retry.')
      }
      if (!packageScope.activeVersionId) {
        throw new InvariantViolationException(
          'Cannot archive a Work Package without an active version'
        )
      }
      const versionToken = `${packageScope.projectId}:work-package:${packageScope.id}:${packageScope.activeVersionNumber}:archived`
      const fact: WorkPackageChangedV1 = {
        schemaVersion: WORK_PACKAGE_CHANGED_SCHEMA_V1,
        projectId: packageScope.projectId,
        organizationId: packageScope.organizationId,
        workPackageId: packageScope.id,
        activeVersionId: packageScope.activeVersionId,
        activeVersionNumber: packageScope.activeVersionNumber,
        versionToken,
        changeType: 'archived',
        actorId,
        occurredAt: archivedAt,
      }
      await this.changeStager.stageWorkPackageChanged(fact, transaction)
      return {
        workPackageId: packageScope.id,
        projectId: packageScope.projectId,
        archivedAt,
        versionToken,
      }
    })

    await this.settlePostCommitEffect(
      'work_package.archive.resolved_task_cache.invalidated',
      () =>
        this.cacheInvalidator.invalidateResolvedTaskContext(result.projectId, result.versionToken),
      { projectId: result.projectId, actorId }
    )
    return result
  }
}
