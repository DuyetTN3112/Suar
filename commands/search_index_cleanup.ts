import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import {
  applySearchIndexCleanupCommand,
  previewSearchIndexCleanupQuery,
} from '#composition/search/index-administration/search_index_administration_composition'
import { authorizeSearchIndexOperatorQuery } from '#composition/search/index-administration/search_index_operator_composition'
import { searchAdminConfig, searchConfig } from '#config/search'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { AuthorizedSearchIndexOperator } from '#modules/search/actions/dtos/search_index_operator'
import {
  safeSearchIndexOperationDiagnostic,
  searchIndexOperatorAuditContext,
} from '#modules/search/controllers/mappers/request/index-administration/search_index_operation_mapper'
import { SEARCH_INDEX_CLEANUP_CONFIRMATION } from '#modules/search/domain/index-administration/search_index_administration_policy'

export default class SearchIndexCleanupCommand extends BaseCommand {
  static override commandName = 'search:index-cleanup'
  static override description =
    'Preview or delete old alias-free Search index generations with retention guards'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({
    description: 'Optional exact confirmation of the configured Search admin service principal',
  })
  declare actorId?: string

  @flags.string({
    description: 'Index target: talents, tasks, projects, skills, organizations, users, or all',
  })
  declare index?: string

  @flags.number({ description: 'Newest retired generations retained per target (1-20)' })
  declare retainRetired?: number

  @flags.number({ description: 'Delete only generations older than this many hours (1-8760)' })
  declare olderThanHours?: number

  @flags.boolean({ description: 'Apply deletion; omission performs an audited preview' })
  declare apply: boolean

  @flags.string({ description: 'Required apply reason (10-500 characters)' })
  declare reason?: string

  @flags.string({
    description: `Required exact apply confirmation: ${SEARCH_INDEX_CLEANUP_CONFIRMATION}`,
  })
  declare confirmation?: string

  @flags.string({ description: 'Required apply token emitted by the exact reviewed preview' })
  declare expectedPlanToken?: string

  override async run(): Promise<void> {
    let operator: AuthorizedSearchIndexOperator | null = null
    let runId: string | null = null
    let mutationIntentAudited = false
    try {
      operator = await authorizeSearchIndexOperatorQuery.handle({
        assertedActorId: this.actorId,
      })
      if (!operator) {
        this.logger.error(
          'Configured Search admin service principal is missing, mismatched, inactive, or unauthorized'
        )
        this.exitCode = 1
        return
      }
      if (!searchConfig.enabled) {
        this.logger.error('Search is disabled; index cleanup is unavailable')
        this.exitCode = 1
        return
      }
      if (!searchAdminConfig.enabled) {
        this.logger.error(
          'Search index administration is disabled; set ELASTICSEARCH_ADMIN_ENABLED=true'
        )
        this.exitCode = 1
        return
      }

      runId = randomUUID()
      if (this.apply) {
        await auditPublicApi.write(searchIndexOperatorAuditContext(operator, runId), {
          action: 'search_index_generations.cleanup_requested',
          event_name: 'search.index_generations.cleanup_requested',
          event_family: 'search_operations',
          module: 'search',
          subsystem: 'index_lifecycle',
          workflow: 'search_index_cleanup',
          stage: 'requested',
          severity: 'warn',
          outcome: 'success',
          actor_type: operator.actorType,
          entity_type: 'search_index_cleanup_run',
          entity_id: runId,
          target_type: 'search_index_family',
          target_id: this.index ?? 'all',
          retention_class: 'security',
          critical: true,
          new_values: {
            reason: this.reason?.trim() ?? null,
            retainRetired: this.retainRetired ?? 2,
            olderThanHours: this.olderThanHours ?? 24,
            expectedPlanToken: this.expectedPlanToken ?? null,
          },
        })
        mutationIntentAudited = true
      }
      const commonInput = {
        target: this.index ?? 'all',
        ...(this.retainRetired === undefined ? {} : { retainRetired: this.retainRetired }),
        ...(this.olderThanHours === undefined ? {} : { olderThanHours: this.olderThanHours }),
      }
      const result = this.apply
        ? await applySearchIndexCleanupCommand.handle({
            ...commonInput,
            ...(this.reason === undefined ? {} : { reason: this.reason }),
            ...(this.confirmation === undefined ? {} : { confirmation: this.confirmation }),
            ...(this.expectedPlanToken === undefined
              ? {}
              : { expectedPlanToken: this.expectedPlanToken }),
          })
        : await previewSearchIndexCleanupQuery.handle(commonInput)
      await auditPublicApi.write(searchIndexOperatorAuditContext(operator, runId), {
        action: this.apply
          ? 'search_index_generations.cleaned'
          : 'search_index_generations.cleanup_previewed',
        event_name: this.apply
          ? 'search.index_generations.cleaned'
          : 'search.index_generations.cleanup_previewed',
        event_family: 'search_operations',
        module: 'search',
        subsystem: 'index_lifecycle',
        workflow: 'search_index_cleanup',
        stage: this.apply ? 'completed' : 'preview',
        severity: this.apply ? 'warn' : 'info',
        outcome: 'success',
        actor_type: operator.actorType,
        entity_type: 'search_index_cleanup_run',
        entity_id: runId,
        target_type: 'search_index_family',
        target_id: this.index ?? 'all',
        retention_class: 'security',
        critical: this.apply,
        new_values: {
          mode: result.mode,
          reason: this.apply ? this.reason?.trim() : null,
          retainRetired: result.retainRetired,
          olderThanHours: result.olderThanHours,
          cutoff: result.cutoff,
          planToken: result.planToken,
          candidateIndexNames: result.candidates.map((candidate) => candidate.indexName),
          deletedIndexNames: result.deletedIndexNames,
        },
      })

      this.logger.info(
        JSON.stringify({
          component: 'search_index_cleanup',
          ...result,
        })
      )
      if (!this.apply) {
        this.logger.warning(
          `Preview only. Re-run one exact --index with --apply --reason, ` +
            `--expected-plan-token=${result.planToken}, and ` +
            `--confirmation=${SEARCH_INDEX_CLEANUP_CONFIRMATION}`
        )
      } else {
        this.logger.success(
          `Deleted ${String(result.deletedIndexNames.length)} retired Search index generation(s)`
        )
      }
    } catch (error) {
      const diagnostic = safeSearchIndexOperationDiagnostic(error)
      if (operator && runId && mutationIntentAudited) {
        try {
          await auditPublicApi.write(searchIndexOperatorAuditContext(operator, runId), {
            action: 'search_index_generations.cleanup_failed',
            event_name: 'search.index_generations.cleanup_failed',
            event_family: 'search_operations',
            module: 'search',
            subsystem: 'index_lifecycle',
            workflow: 'search_index_cleanup',
            stage: 'failed',
            severity: 'critical',
            outcome: 'failure',
            actor_type: operator.actorType,
            entity_type: 'search_index_cleanup_run',
            entity_id: runId,
            target_type: 'search_index_family',
            target_id: this.index ?? 'all',
            retention_class: 'security',
            critical: true,
            new_values: {
              mutationOutcome: 'unknown',
              diagnostic,
              expectedPlanToken: this.expectedPlanToken ?? null,
            },
          })
        } catch {
          this.logger.error('Search index cleanup failure audit could not be persisted')
        }
      }
      this.logger.error(`Search index cleanup failed ${diagnostic}`)
      this.exitCode = 1
    }
  }
}
