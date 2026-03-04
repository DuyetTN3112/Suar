import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRow, SeedWhereValue } from './types.js'

export interface SeedRuntime {
  uuid(): string
  isoDaysAgo(daysAgo: number, hour?: number): string
  isoDaysAhead(daysAhead: number, hour?: number): string
  toJson(value: unknown): string
  requireValue<T>(value: T | undefined, label: string): T
  seedPullRequestUrl(seedKey: string): string
  findRow<T extends SeedRow = SeedRow>(
    trx: TransactionClientContract,
    table: string,
    where: Record<string, SeedWhereValue>
  ): Promise<T | null>
  applyWhere(
    query: ReturnType<TransactionClientContract['from']>,
    where: Record<string, SeedWhereValue>
  ): ReturnType<TransactionClientContract['from']>
}
