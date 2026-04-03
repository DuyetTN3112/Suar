import { privateCacheKeyDigest } from '#modules/cache/public_contracts/cache_contract'

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

const GENERATION_NAMESPACE_PATTERN = /^[a-z][a-z0-9._:-]{0,127}$/
const CACHE_ORGANIZATION_ID_PATTERN = /^[a-z0-9_-]{1,64}$/
const TASK_LIST_ORGANIZATION_PATTERN = /^tasks:list:v2:org:([a-z0-9_-]{1,64}):\*$/
const ORGANIZATION_SCOPED_PATTERNS = [
  {
    pattern: /^task:user:\*:org:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
  },
  {
    pattern: /^tasks:grouped:org:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
  },
  {
    pattern: /^tasks:timeline:org:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
  },
  {
    pattern: /^task:stats:org:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
  },
  {
    pattern: /^task:metadata:\*:org:([a-z0-9_-]{1,64})(?::)?\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata,
  },
  {
    pattern: /^org:detail:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.organizationDetail,
  },
  {
    pattern: /^org:members:org:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers,
  },
] as const
const ENTITY_SCOPED_PATTERNS = [
  {
    pattern: /^task:user:user:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
    scope: 'user',
  },
  {
    pattern: /^tasks:grouped:\*:user:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
    scope: 'user',
  },
  {
    pattern: /^tasks:timeline:\*:user:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
    scope: 'user',
  },
  {
    pattern: /^task:stats:\*:user:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
    scope: 'user',
  },
  {
    pattern: /^task:audit:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
    scope: 'task',
  },
  {
    pattern: /^task:applications:\*:taskId:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
    scope: 'task',
  },
  {
    pattern: /^user:applications:\*:userId:([a-z0-9_-]{1,64})(?::)?\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications,
    scope: 'user',
  },
  {
    pattern: /^users:work_history:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
    scope: 'user',
  },
  {
    pattern: /^orgs:list:user:([a-z0-9_-]{1,64}):\*$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.organizationList,
    scope: 'user',
  },
  {
    pattern: /^user:pending_reviews:\*:userId:([a-z0-9_-]{1,64})(?::)?\*?$/,
    namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
    scope: 'user',
  },
] as const
const GLOBAL_GENERATION_NAMESPACE_BY_PATTERN = new Map<string, string>([
  ['tasks:list:*', TASK_LIST_CACHE_GENERATION_NAMESPACE],
  ['tasks:public:*', CACHE_COLLECTION_GENERATION_NAMESPACES.publicTasks],
  ['task:user:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks],
  ['tasks:grouped:*', CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks],
  ['tasks:timeline:*', CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks],
  ['task:stats:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics],
  ['task:metadata:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata],
  ['task:audit:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit],
  ['task:applications:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications],
  ['user:applications:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications],
  ['users:work_history:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory],
  ['orgs:list:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationList],
  ['org:detail:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationDetail],
  ['org:members:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers],
  ['user:pending_reviews:*', CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews],
])

export function assertCacheGenerationNamespace(namespace: string): void {
  if (!GENERATION_NAMESPACE_PATTERN.test(namespace)) {
    throw new TypeError(
      'Cache generation namespace must contain 1 to 128 lowercase letters, digits, dots, underscores, colons, or hyphens'
    )
  }
}

export function cacheGenerationControlKey(namespace: string): string {
  assertCacheGenerationNamespace(namespace)
  return `generation:control:${privateCacheKeyDigest(namespace)}`
}

export function buildGenerationScopedCacheKey(
  logicalKey: string,
  generationTokens: string | readonly string[]
): string {
  const tokens =
    typeof generationTokens === 'string' ? generationTokens : generationTokens.join('.')
  return `${logicalKey}:generation:${tokens}`
}

export function taskListOrganizationCacheGenerationNamespace(organizationId: string): string {
  return scopedCacheGenerationNamespace(TASK_LIST_CACHE_GENERATION_NAMESPACE, 'org', organizationId)
}

export function scopedCacheGenerationNamespace(
  namespace: string,
  scope: 'org' | 'task' | 'user',
  identifier: string
): string {
  assertCacheGenerationNamespace(namespace)
  if (!CACHE_ORGANIZATION_ID_PATTERN.test(identifier)) {
    throw new TypeError('Scoped cache generation requires a safe identifier')
  }
  return `${namespace}:${scope}:${identifier}`
}

/**
 * Compatibility router for durable outbox payloads and existing invalidators.
 * Recognized collection patterns rotate one collision-resistant generation
 * token instead of scanning the complete cache keyspace.
 */
export function cacheGenerationNamespaceForPattern(pattern: string): string | null {
  const globalNamespace = GLOBAL_GENERATION_NAMESPACE_BY_PATTERN.get(pattern)
  if (globalNamespace) {
    return globalNamespace
  }

  const organizationMatch = pattern.match(TASK_LIST_ORGANIZATION_PATTERN)
  if (organizationMatch?.[1]) {
    return taskListOrganizationCacheGenerationNamespace(organizationMatch[1])
  }

  for (const definition of ORGANIZATION_SCOPED_PATTERNS) {
    const match = pattern.match(definition.pattern)
    if (match?.[1]) {
      return scopedCacheGenerationNamespace(definition.namespace, 'org', match[1])
    }
  }

  for (const definition of ENTITY_SCOPED_PATTERNS) {
    const match = pattern.match(definition.pattern)
    if (match?.[1]) {
      return scopedCacheGenerationNamespace(definition.namespace, definition.scope, match[1])
    }
  }

  return null
}
