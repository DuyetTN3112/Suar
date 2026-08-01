import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export const CACHE_MAX_TTL_SECONDS = 86_400
export const CACHE_MAX_KEY_BYTES = 512
export const CACHE_MAX_VALUE_BYTES = 1_048_576
export const CACHE_REDIS_KEY_PREFIX = 'suar:cache:'

export type PrivateCacheKeyDigestEncoding = 'base64url' | 'hex'

export interface PrivateCacheKeyDigestProvider {
  digest(value: string, encoding?: PrivateCacheKeyDigestEncoding): string
}

let privateKeyDigestProvider: PrivateCacheKeyDigestProvider | null = null

export function registerPrivateCacheKeyDigestProvider(
  implementation: PrivateCacheKeyDigestProvider
): void {
  privateKeyDigestProvider = implementation
}

export function privateCacheKeyDigest(
  value: string,
  encoding: PrivateCacheKeyDigestEncoding = 'hex'
): string {
  if (!privateKeyDigestProvider) {
    throw new InvariantViolationException(
      'Private cache key digest provider has not been registered'
    )
  }
  return privateKeyDigestProvider.digest(value, encoding)
}

export interface CacheRememberOptions {
  /**
   * Maximum time a contending process waits for the current owner to publish a
   * value. After this budget it computes from source to preserve availability.
   */
  waitTimeoutMs?: number
}

/** Canonical generation namespace used by task-list cache readers. */
export const TASK_LIST_CACHE_GENERATION_NAMESPACE = 'tasks:list'
export const CACHE_COLLECTION_GENERATION_NAMESPACES = {
  publicTasks: 'tasks:public',
  userTasks: 'task:user',
  groupedTasks: 'tasks:grouped',
  timelineTasks: 'tasks:timeline',
  taskStatistics: 'task:stats',
  taskMetadata: 'task:metadata',
  taskAudit: 'task:audit',
  taskApplications: 'task:applications',
  userApplications: 'user:applications',
  userWorkHistory: 'users:work_history',
  organizationList: 'orgs:list',
  organizationDetail: 'org:detail',
  organizationMembers: 'org:members',
  pendingReviews: 'user:pending_reviews',
} as const

export type CacheCollectionGenerationNamespace =
  (typeof CACHE_COLLECTION_GENERATION_NAMESPACES)[keyof typeof CACHE_COLLECTION_GENERATION_NAMESPACES]

const CACHE_ORGANIZATION_ID_PATTERN = /^[a-z0-9_-]{1,64}$/

function assertSafeCacheScopeIdentifier(identifier: string): void {
  if (!CACHE_ORGANIZATION_ID_PATTERN.test(identifier)) {
    throw new TypeError('Scoped cache generation requires a safe identifier')
  }
}

export function globalCacheGenerationNamespaces(
  namespace: CacheCollectionGenerationNamespace
): readonly [CacheCollectionGenerationNamespace] {
  return [namespace]
}

export function organizationCacheGenerationNamespaces(
  namespace: CacheCollectionGenerationNamespace,
  organizationId: string
): readonly [CacheCollectionGenerationNamespace, string] {
  assertSafeCacheScopeIdentifier(organizationId)
  return [namespace, `${namespace}:org:${organizationId}`]
}

export function organizationUserCacheGenerationNamespaces(
  namespace: CacheCollectionGenerationNamespace,
  organizationId: string,
  userId: string
): readonly [CacheCollectionGenerationNamespace, string, string] {
  assertSafeCacheScopeIdentifier(organizationId)
  assertSafeCacheScopeIdentifier(userId)
  return [namespace, `${namespace}:org:${organizationId}`, `${namespace}:user:${userId}`]
}

export function entityCacheGenerationNamespaces(
  namespace: CacheCollectionGenerationNamespace,
  scope: 'task' | 'user',
  identifier: string
): readonly [CacheCollectionGenerationNamespace, string] {
  assertSafeCacheScopeIdentifier(identifier)
  return [namespace, `${namespace}:${scope}:${identifier}`]
}

/**
 * Task-list readers depend on both a global fallback epoch and one tenant
 * epoch. Normal mutations rotate only the tenant epoch; legacy/global
 * invalidations can still invalidate every reader without scanning Redis.
 */
export function taskListCacheGenerationNamespaces(
  organizationId: string
): readonly [string, string] {
  assertSafeCacheScopeIdentifier(organizationId)

  return [
    TASK_LIST_CACHE_GENERATION_NAMESPACE,
    `${TASK_LIST_CACHE_GENERATION_NAMESPACE}:org:${organizationId}`,
  ]
}

export function taskListCacheInvalidationPattern(organizationId: string): string {
  assertSafeCacheScopeIdentifier(organizationId)
  return `tasks:list:v2:org:${organizationId}:*`
}

export function taskMetadataCacheInvalidationPattern(organizationId: string): string {
  assertSafeCacheScopeIdentifier(organizationId)
  return `task:metadata:*:org:${organizationId}*`
}

/**
 * Canonical review-session projection key. Readers and every synchronous or
 * durable invalidator must use the same versioned contract.
 */
export function reviewSessionCacheKey(reviewSessionId: string): string {
  assertSafeCacheScopeIdentifier(reviewSessionId)
  return `review:session:v4:sessionId:${reviewSessionId}`
}

export function safeCacheLogContext(identifier: string): {
  cacheNamespace: string
  cacheIdentifierHash: string
} {
  const rawNamespace = identifier.split(':', 1)[0] ?? 'unknown'
  const cacheNamespace = /^[A-Za-z0-9_-]{1,32}$/.test(rawNamespace) ? rawNamespace : 'unknown'

  return {
    cacheNamespace,
    cacheIdentifierHash: privateCacheKeyDigest(identifier).slice(0, 16),
  }
}
