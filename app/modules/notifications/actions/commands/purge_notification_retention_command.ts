import {
  requireNotificationRetentionServicePrincipalIdentity,
  type NotificationRetentionServicePrincipalIdentity,
} from '#modules/authorization/public_contracts/notification_retention_service_principal'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationProjectionAliases,
  NotificationProjectionWriter,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import type { NotificationRetentionRepository } from '#modules/notifications/actions/ports/outbound/notification_retention_repository'
import { NOTIFICATION_PROCESSED_WORK_RETENTION_MS } from '#modules/notifications/domain/notification_retention_policy'

export interface NotificationRetentionResult {
  expiredNotifications: number
  purgedProcessedOutbox: number
  purgedCompletedFanoutJobs: number
  purgedTombstones: number
  purgedAcceptanceLedger: number
  retiredProjectionTargets: number
  purgedRetiredProjectionIndices: number
}

export interface NotificationRetentionExecution {
  userId: string | null
  operatorIdentity: NotificationRetentionServicePrincipalIdentity
}

type NotificationTombstoneSearchPurger = Pick<NotificationProjectionWriter, 'purgeMany'>

interface NotificationProjectionIndexLifecycle {
  aliasIndices(alias: string): Promise<string[]>
  deletePhysicalIndex(index: string): Promise<void>
}

const uncomposedRetentionRepository: NotificationRetentionRepository = {
  operationalStatus: () => Promise.reject(new Error('Notification retention is not composed')),
  expireCanonicalBatch: () => Promise.reject(new Error('Notification retention is not composed')),
  purgeProcessedOutbox: () => Promise.reject(new Error('Notification retention is not composed')),
  purgeCompletedFanoutJobs: () =>
    Promise.reject(new Error('Notification retention is not composed')),
  tombstonePurgePlan: () => Promise.reject(new Error('Notification retention is not composed')),
  confirmTombstonePurge: () => Promise.reject(new Error('Notification retention is not composed')),
  retireExpiredProjectionTargets: () =>
    Promise.reject(new Error('Notification retention is not composed')),
  retiredProjectionIndexPlan: () =>
    Promise.reject(new Error('Notification retention is not composed')),
  confirmRetiredProjectionIndexDeletion: () =>
    Promise.reject(new Error('Notification retention is not composed')),
  purgeTerminalLedger: () => Promise.reject(new Error('Notification retention is not composed')),
}

const uncomposedSearchPurger: NotificationTombstoneSearchPurger = {
  purgeMany: () => Promise.reject(new Error('Notification retention search is not composed')),
}

const uncomposedIndexLifecycle: NotificationProjectionIndexLifecycle = {
  aliasIndices: () =>
    Promise.reject(new Error('Notification retention index lifecycle is not composed')),
  deletePhysicalIndex: () =>
    Promise.reject(new Error('Notification retention index lifecycle is not composed')),
}

const legacyTestAliases: NotificationProjectionAliases = {
  readAlias: 'suar_notifications_read',
  writeAlias: 'suar_notifications_write',
}

interface PurgeNotificationRetentionCommandOptions {
  repository: NotificationRetentionRepository
  search: NotificationTombstoneSearchPurger
  indexLifecycle: NotificationProjectionIndexLifecycle
  aliases: NotificationProjectionAliases
}

export class PurgeNotificationRetentionCommand {
  private readonly repository: NotificationRetentionRepository
  private readonly search: NotificationTombstoneSearchPurger
  private readonly indexLifecycle: NotificationProjectionIndexLifecycle
  private readonly aliases: NotificationProjectionAliases

  constructor()
  constructor(options: PurgeNotificationRetentionCommandOptions)
  constructor(
    repository: NotificationRetentionRepository,
    search?: NotificationTombstoneSearchPurger,
    indexLifecycle?: NotificationProjectionIndexLifecycle
  )
  constructor(
    optionsOrRepository:
      | PurgeNotificationRetentionCommandOptions
      | NotificationRetentionRepository = uncomposedRetentionRepository,
    search: NotificationTombstoneSearchPurger = uncomposedSearchPurger,
    indexLifecycle: NotificationProjectionIndexLifecycle = uncomposedIndexLifecycle
  ) {
    if ('repository' in optionsOrRepository) {
      this.repository = optionsOrRepository.repository
      this.search = optionsOrRepository.search
      this.indexLifecycle = optionsOrRepository.indexLifecycle
      this.aliases = optionsOrRepository.aliases
      return
    }

    this.repository = optionsOrRepository
    this.search = search
    this.indexLifecycle = indexLifecycle
    this.aliases = legacyTestAliases
  }

  async execute(input: {
    now?: Date
    batchSize?: number
    reason: string
    confirmation: string
    execution: NotificationRetentionExecution
  }): Promise<NotificationRetentionResult> {
    requireNotificationRetentionServicePrincipalIdentity(
      input.execution.operatorIdentity,
      input.execution.userId
    )
    const reason = input.reason.trim()
    if (reason.length < 10 || reason.length > 500) {
      throw new RangeError('Notification retention reason must contain 10 to 500 characters')
    }
    if (input.confirmation !== 'PURGE') {
      throw new RangeError('Notification retention confirmation must be PURGE')
    }
    const now = input.now ?? new Date()
    const batchSize = input.batchSize ?? 100
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
      throw new RangeError('Notification retention batchSize must be between 1 and 1000')
    }
    const processedBefore = new Date(now.getTime() - NOTIFICATION_PROCESSED_WORK_RETENTION_MS)

    const retiredProjectionTargets = await this.repository.retireExpiredProjectionTargets(
      now,
      batchSize
    )
    const expiredNotifications = await this.repository.expireCanonicalBatch(now, batchSize)
    const purgedProcessedOutbox = await this.repository.purgeProcessedOutbox(
      processedBefore,
      batchSize
    )
    const tombstonePlan = await this.repository.tombstonePurgePlan(now, batchSize)
    let purgedTombstones = 0
    if (tombstonePlan.tombstones.length > 0) {
      const notificationIds = tombstonePlan.tombstones.map((tombstone) => tombstone.notificationId)
      for (const target of tombstonePlan.targets) {
        const result = await this.search.purgeMany(target.physicalIndex, notificationIds)
        const appliedIds = new Set(result.appliedIds)
        const incomplete = notificationIds.some((notificationId) => !appliedIds.has(notificationId))
        if (result.failures.length > 0 || incomplete) {
          const first = result.failures[0]
          throw new InvariantViolationException(
            `notification_tombstone_purge_failed:${
              first?.errorClass ?? (incomplete ? 'incomplete_purge_result' : 'unknown')
            }`
          )
        }
      }
      purgedTombstones = await this.repository.confirmTombstonePurge({
        now,
        notificationIds,
        targetIds: tombstonePlan.targets.map((target) => target.id),
      })
    }
    let purgedRetiredProjectionIndices = 0
    const retiredIndexPlan = await this.repository.retiredProjectionIndexPlan(now, batchSize)
    for (const target of retiredIndexPlan) {
      const [readIndices, writeIndices] = await Promise.all([
        this.indexLifecycle.aliasIndices(this.aliases.readAlias),
        this.indexLifecycle.aliasIndices(this.aliases.writeAlias),
      ])
      if (
        readIndices.includes(target.physicalIndex) ||
        writeIndices.includes(target.physicalIndex)
      ) {
        throw new InvariantViolationException(
          `notification_retired_index_still_aliased:${target.id}`
        )
      }
      await this.indexLifecycle.deletePhysicalIndex(target.physicalIndex)
      const confirmed = await this.repository.confirmRetiredProjectionIndexDeletion({
        now,
        targetId: target.id,
        physicalIndex: target.physicalIndex,
      })
      if (confirmed) {
        purgedRetiredProjectionIndices += 1
      }
    }
    const purgedAcceptanceLedger = await this.repository.purgeTerminalLedger(
      new Date(now.getTime() - 180 * 24 * 60 * 60 * 1_000),
      batchSize
    )
    const purgedCompletedFanoutJobs = await this.repository.purgeCompletedFanoutJobs(
      processedBefore,
      batchSize
    )

    return {
      expiredNotifications,
      purgedProcessedOutbox,
      purgedCompletedFanoutJobs,
      purgedTombstones,
      purgedAcceptanceLedger,
      retiredProjectionTargets,
      purgedRetiredProjectionIndices,
    }
  }
}
