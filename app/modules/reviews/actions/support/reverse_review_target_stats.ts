import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type ReverseReviewTargetType = 'peer' | 'manager' | 'project' | 'organization'

const queryClient = (trx?: TransactionClientContract) => trx ?? db

export interface ReverseReviewTargetStatsRecord {
  target_type: ReverseReviewTargetType
  target_id: string
  total_reviews: number
  average_rating: number | null
  anonymous_reviews: number
  last_review_at: string | null
}

export interface ReverseReviewPersonSummary {
  total_reviews: number
  average_rating: number | null
  peer_reviews: number
  manager_reviews: number
  anonymous_reviews: number
  last_review_at: string | null
}

type UserReverseReviewSummaryRow = {
  target_type?: string | null
  total_reviews?: number | string | null
  average_rating?: number | string | null
  anonymous_reviews?: number | string | null
  last_review_at?: string | null
}

export async function recalculateReverseReviewTargetStats(
  targetType: ReverseReviewTargetType,
  targetId: string,
  trx?: TransactionClientContract
): Promise<ReverseReviewTargetStatsRecord> {
  const client = queryClient(trx)
  const aggregateResult: unknown = await client.rawQuery(
    `
      select
        count(*)::int as total_reviews,
        avg(rating)::numeric(10,2) as average_rating,
        count(*) filter (where is_anonymous = true)::int as anonymous_reviews,
        max(created_at) as last_review_at
      from (
        select rating, is_anonymous, created_at
        from reverse_reviews
        where target_type = ? and target_id = ?
        union all
        select rating, is_anonymous_to_target as is_anonymous, created_at
        from sprint_manager_reviews
        where ? = 'manager' and target_user_id = ?
        union all
        select rating, is_anonymous_publicly as is_anonymous, created_at
        from sprint_environment_reviews
        where target_type = ? and target_id = ?
      ) combined_reviews
    `,
    [targetType, targetId, targetType, targetId, targetType, targetId]
  )
  const aggregate = aggregateResult as {
    rows?: Array<
      | {
          total_reviews?: number | string
          average_rating?: number | string | null
          anonymous_reviews?: number | string
          last_review_at?: string | null
        }
      | undefined
    >
  }
  const row = aggregate.rows?.[0]
  const totalReviews = Number(row?.total_reviews ?? 0)
  const averageRating =
    row?.average_rating === null || row?.average_rating === undefined
      ? null
      : Number(row.average_rating)
  const anonymousReviews = Number(row?.anonymous_reviews ?? 0)
  const lastReviewAt = row?.last_review_at ?? null

  await client
    .table('public.reverse_review_target_stats')
    .insert({
      target_type: targetType,
      target_id: targetId,
      total_reviews: totalReviews,
      average_rating: averageRating,
      anonymous_reviews: anonymousReviews,
      last_review_at: lastReviewAt,
      created_at: client.raw('NOW()'),
      updated_at: client.raw('NOW()'),
    })
    .onConflict(['target_type', 'target_id'])
    .merge({
      total_reviews: totalReviews,
      average_rating: averageRating,
      anonymous_reviews: anonymousReviews,
      last_review_at: lastReviewAt,
      updated_at: client.raw('NOW()'),
    })

  return {
    target_type: targetType,
    target_id: targetId,
    total_reviews: totalReviews,
    average_rating: averageRating,
    anonymous_reviews: anonymousReviews,
    last_review_at: lastReviewAt,
  }
}

export async function recalculateSprintReviewTargetStatsForSprint(
  sprintId: string,
  trx?: TransactionClientContract
): Promise<ReverseReviewTargetStatsRecord[]> {
  const client = queryClient(trx)
  const managerTargets = (await client
    .from('sprint_manager_reviews as smr')
    .innerJoin('sprint_review_packages as srp', 'srp.id', 'smr.package_id')
    .where('srp.sprint_id', sprintId)
    .select('smr.target_user_id')) as { target_user_id: string }[]
  const environmentTargets = (await client
    .from('sprint_environment_reviews as ser')
    .innerJoin('sprint_review_packages as srp', 'srp.id', 'ser.package_id')
    .where('srp.sprint_id', sprintId)
    .select('ser.target_type', 'ser.target_id')) as {
    target_type: ReverseReviewTargetType
    target_id: string
  }[]

  const targetKeys = new Map<string, { targetType: ReverseReviewTargetType; targetId: string }>()
  for (const target of managerTargets) {
    targetKeys.set(`manager:${target.target_user_id}`, {
      targetType: 'manager',
      targetId: target.target_user_id,
    })
  }
  for (const target of environmentTargets) {
    if (target.target_type !== 'project' && target.target_type !== 'organization') {
      continue
    }
    targetKeys.set(`${target.target_type}:${target.target_id}`, {
      targetType: target.target_type,
      targetId: target.target_id,
    })
  }

  const results: ReverseReviewTargetStatsRecord[] = []
  for (const target of targetKeys.values()) {
    results.push(await recalculateReverseReviewTargetStats(target.targetType, target.targetId, trx))
  }

  return results
}

export async function loadReverseReviewTargetStats(
  targetType: ReverseReviewTargetType,
  targetId: string,
  trx?: TransactionClientContract
): Promise<ReverseReviewTargetStatsRecord | null> {
  const client = queryClient(trx)
  const row = (await client
    .from('public.reverse_review_target_stats')
    .where('target_type', targetType)
    .where('target_id', targetId)
    .first()) as ReverseReviewTargetStatsRecord | undefined

  return row ?? null
}

export async function loadUserReverseReviewSummary(
  userId: string,
  trx?: TransactionClientContract
): Promise<ReverseReviewPersonSummary | null> {
  const client = queryClient(trx)
  let rows = (await client
    .from('public.reverse_review_target_stats')
    .where('target_id', userId)
    .whereIn('target_type', ['peer', 'manager'])
    .select(
      'target_type',
      'total_reviews',
      'average_rating',
      'anonymous_reviews',
      'last_review_at'
    )) as UserReverseReviewSummaryRow[]

  if (rows.length === 0) {
    rows = (await client
      .from('reverse_reviews')
      .where('target_id', userId)
      .whereIn('target_type', ['peer', 'manager'])
      .select(
        'target_type',
        client.raw('COUNT(*)::int as total_reviews'),
        client.raw('AVG(rating)::numeric(10,2) as average_rating'),
        client.raw('COUNT(*) FILTER (WHERE is_anonymous = true)::int as anonymous_reviews'),
        client.raw('MAX(created_at) as last_review_at')
      )
      .groupBy('target_type')) as typeof rows
  }

  if (rows.length === 0) {
    return null
  }

  let totalReviews = 0
  let weightedAverage = 0
  let anonymousReviews = 0
  let peerReviews = 0
  let managerReviews = 0
  let lastReviewAt: string | null = null

  for (const row of rows) {
    const rowTotal = Number(row.total_reviews ?? 0)
    const rowAverage =
      row.average_rating === null || row.average_rating === undefined
        ? null
        : Number(row.average_rating)
    const rowAnonymous = Number(row.anonymous_reviews ?? 0)

    totalReviews += rowTotal
    anonymousReviews += rowAnonymous
    if (rowAverage !== null) {
      weightedAverage += rowAverage * rowTotal
    }
    if (row.target_type === 'peer') {
      peerReviews += rowTotal
    } else if (row.target_type === 'manager') {
      managerReviews += rowTotal
    }
    const rowLastReviewAt = row.last_review_at ?? null
    if (rowLastReviewAt !== null && (!lastReviewAt || rowLastReviewAt > lastReviewAt)) {
      lastReviewAt = rowLastReviewAt
    }
  }

  return {
    total_reviews: totalReviews,
    average_rating: totalReviews > 0 ? Number((weightedAverage / totalReviews).toFixed(1)) : null,
    peer_reviews: peerReviews,
    manager_reviews: managerReviews,
    anonymous_reviews: anonymousReviews,
    last_review_at: lastReviewAt,
  }
}
