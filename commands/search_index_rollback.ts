import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import {
  applySearchIndexRollbackCommand,
  previewSearchIndexRollbackQuery,
} from '#composition/search_index_administration_composition'
import { authorizeSearchIndexOperatorQuery } from '#composition/search_index_operator_composition'
import { searchAdminConfig, searchConfig } from '#config/search'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { AuthorizedSearchIndexOperator } from '#modules/search/actions/dtos/search_index_operator'
import {
  safeSearchIndexOperationDiagnostic,
  searchIndexOperatorAuditContext,
} from '#modules/search/controllers/mappers/search_index_operation_mapper'
import { SEARCH_INDEX_ROLLBACK_CONFIRMATION } from '#modules/search/domain/search_index_administration_policy'

export default class SearchIndexRollbackCommand extends BaseCommand {
  static override commandName = 'search:index-rollback'
  static override description =
    'Preview or atomically roll a stable Search alias back to an owned retired generation'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({
    description: 'Optional exact confirmation of the configured Search admin service principal',
  })
  declare actorId?: string

  @flags.string({ description: 'Exact Search index target group' })
  declare index?: string

  @flags.string({ description: 'Exact active physical index confirmation' })
  declare expectedCurrentIndex?: string

  @flags.string({ description: 'Exact retired physical index rollback target' })
  declare rollbackTargetIndex?: string

  @flags.boolean({ description: 'Apply rollback; omission performs an audited preview' })
  declare apply: boolean

  @flags.boolean({ description: 'Explicitly allow rollback from non-empty to empty target' })
  declare allowEmpty: boolean

  @flags.string({ description: 'Required apply incident/change reason (10-500 characters)' })
  declare reason?: string

  @flags.string({
    description: `Required exact apply confirmation: ${SEARCH_INDEX_ROLLBACK_CONFIRMATION}`,
  })
  declare confirmation?: string

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
      if (!this.index || !this.expectedCurrentIndex || !this.rollbackTargetIndex) {
        this.logger.error(
          '--index, --expected-current-index, and --rollback-target-index are required'
        )
        this.exitCode = 1
        return
      }
      if (!searchConfig.enabled) {
        this.logger.error('Search is disabled; index rollback is unavailable')
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
          action: 'search_index_alias.rollback_requested',
          event_name: 'search.index_alias.rollback_requested',
          event_family: 'search_operations',
          module: 'search',
          subsystem: 'index_lifecycle',
          workflow: 'search_index_rollback',
          stage: 'requested',
          severity: 'critical',
          outcome: 'success',
          actor_type: operator.actorType,
          entity_type: 'search_index_alias',
          entity_id: this.index,
          target_type: 'search_physical_index',
          target_id: this.rollbackTargetIndex,
          retention_class: 'security',
          critical: true,
          new_values: {
            reason: this.reason?.trim() ?? null,
            expectedCurrentIndexName: this.expectedCurrentIndex,
            rollbackIndexName: this.rollbackTargetIndex,
            allowEmpty: this.allowEmpty,
          },
        })
        mutationIntentAudited = true
      }
      const commonInput = {
        target: this.index,
        expectedCurrentIndexName: this.expectedCurrentIndex,
        rollbackIndexName: this.rollbackTargetIndex,
        allowEmpty: this.allowEmpty,
      }
      const result = this.apply
        ? await applySearchIndexRollbackCommand.handle({
            ...commonInput,
            ...(this.reason === undefined ? {} : { reason: this.reason }),
            ...(this.confirmation === undefined ? {} : { confirmation: this.confirmation }),
          })
        : await previewSearchIndexRollbackQuery.handle(commonInput)
      await auditPublicApi.write(searchIndexOperatorAuditContext(operator, runId), {
        action: this.apply
          ? 'search_index_alias.rolled_back'
          : 'search_index_alias.rollback_previewed',
        event_name: this.apply
          ? 'search.index_alias.rolled_back'
          : 'search.index_alias.rollback_previewed',
        event_family: 'search_operations',
        module: 'search',
        subsystem: 'index_lifecycle',
        workflow: 'search_index_rollback',
        stage: this.apply ? 'completed' : 'preview',
        severity: this.apply ? 'critical' : 'info',
        outcome: 'success',
        actor_type: operator.actorType,
        entity_type: 'search_index_alias',
        entity_id: result.aliasName,
        target_type: 'search_physical_index',
        target_id: result.rollbackIndexName,
        retention_class: 'security',
        critical: this.apply,
        new_values: {
          mode: result.mode,
          reason: this.apply ? this.reason?.trim() : null,
          previousIndexName: result.previousIndexName,
          rollbackIndexName: result.rollbackIndexName,
          previousDocumentCount: result.previousDocumentCount,
          rollbackDocumentCount: result.rollbackDocumentCount,
          allowEmpty: this.allowEmpty,
        },
      })

      this.logger.info(
        JSON.stringify({
          component: 'search_index_rollback',
          ...result,
        })
      )
      if (!this.apply) {
        this.logger.warning(
          `Preview only. Re-run with --apply --reason and --confirmation=${SEARCH_INDEX_ROLLBACK_CONFIRMATION}`
        )
      } else {
        this.logger.success(
          `Search alias ${result.aliasName} rolled back from ${result.previousIndexName} to ${result.rollbackIndexName}`
        )
      }
    } catch (error) {
      const diagnostic = safeSearchIndexOperationDiagnostic(error)
      if (operator && runId && mutationIntentAudited) {
        try {
          await auditPublicApi.write(searchIndexOperatorAuditContext(operator, runId), {
            action: 'search_index_alias.rollback_failed',
            event_name: 'search.index_alias.rollback_failed',
            event_family: 'search_operations',
            module: 'search',
            subsystem: 'index_lifecycle',
            workflow: 'search_index_rollback',
            stage: 'failed',
            severity: 'critical',
            outcome: 'failure',
            actor_type: operator.actorType,
            entity_type: 'search_index_alias',
            entity_id: this.index ?? 'unknown',
            target_type: 'search_physical_index',
            target_id: this.rollbackTargetIndex ?? 'unknown',
            retention_class: 'security',
            critical: true,
            new_values: {
              mutationOutcome: 'unknown',
              diagnostic,
              expectedCurrentIndexName: this.expectedCurrentIndex ?? null,
              rollbackIndexName: this.rollbackTargetIndex ?? null,
            },
          })
        } catch {
          this.logger.error('Search index rollback failure audit could not be persisted')
        }
      }
      this.logger.error(`Search index rollback failed ${diagnostic}`)
      this.exitCode = 1
    }
  }
}
