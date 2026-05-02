import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import type {
  ProjectLifecycleChangedEvent,
  TalentReindexRequestedEvent,
  UserAccountLifecycleChangedEvent,
  UserProfileChangedEvent,
} from '#modules/events/public_contracts/domain_event_outbox'

export interface TalentReindexRequestedDependencies {
  isSearchEnabled?(): boolean
  reindexTalentDocument(userId: string, signal?: AbortSignal): Promise<void>
  reindexTalentDocumentFenced?(
    userId: string,
    context: {
      signal?: AbortSignal
      externalVersion?: number
      tombstoneAt?: string
    }
  ): Promise<void>
}

function searchStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }
  const directStatus = 'statusCode' in error ? error.statusCode : undefined
  if (typeof directStatus === 'number') return directStatus
  const meta = 'meta' in error ? error.meta : undefined
  if (typeof meta !== 'object' || meta === null || !('statusCode' in meta)) {
    return undefined
  }
  return typeof meta.statusCode === 'number' ? meta.statusCode : undefined
}

function isExternalVersionConflict(error: unknown): boolean {
  if (searchStatusCode(error) !== 409 || typeof error !== 'object' || error === null) {
    return false
  }
  const meta = 'meta' in error ? error.meta : undefined
  if (typeof meta !== 'object' || meta === null || !('body' in meta)) {
    return false
  }
  const body = meta.body
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return false
  }
  const bodyError = body.error
  return (
    typeof bodyError === 'object' &&
    bodyError !== null &&
    'type' in bodyError &&
    bodyError.type === 'version_conflict_engine_exception'
  )
}

export function classifySearchProjectionError(
  error: unknown
): DomainEventDeliveryError {
  if (error instanceof DomainEventDeliveryError) {
    return error
  }
  const statusCode = searchStatusCode(error)
  if (statusCode === 401 || statusCode === 403) {
    return new DomainEventDeliveryError(
      'SEARCH_PROJECTION_AUTHORIZATION_REJECTED',
      false,
      { cause: error }
    )
  }
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return new DomainEventDeliveryError('SEARCH_PROJECTION_REQUEST_REJECTED', false, {
      cause: error,
    })
  }
  return new DomainEventDeliveryError('SEARCH_PROJECTION_TRANSIENT_FAILURE', true, {
    cause: error,
  })
}

export async function handleTalentReindexRequested(
  event: TalentReindexRequestedEvent,
  dependencies: TalentReindexRequestedDependencies
): Promise<void> {
  event.deliveryContext?.signal.throwIfAborted()
  if (dependencies.isSearchEnabled?.() === false) {
    return
  }
  try {
    if (event.deliveryContext) {
      if (!dependencies.reindexTalentDocumentFenced) {
        throw new DomainEventDeliveryError(
          'TALENT_SEARCH_FENCED_DELIVERY_UNAVAILABLE',
          false
        )
      }
      await dependencies.reindexTalentDocumentFenced(event.userId, {
        signal: event.deliveryContext.signal,
        externalVersion: event.deliveryContext.sequence,
        tombstoneAt: new Date(0).toISOString(),
      })
    } else {
      await dependencies.reindexTalentDocument(event.userId)
    }
  } catch (error) {
    if (isExternalVersionConflict(error)) {
      return
    }
    throw classifySearchProjectionError(error)
  }
  event.deliveryContext?.signal.throwIfAborted()
}

export interface UserLifecycleSearchDependencies {
  isSearchEnabled?(): boolean
  reindexUserDirectoryDocumentFenced(
    userId: string,
    context: {
      signal?: AbortSignal
      externalVersion?: number
      tombstoneAt?: string
    }
  ): Promise<void>
  reindexTalentDocumentFenced(
    userId: string,
    context: {
      signal?: AbortSignal
      externalVersion?: number
      tombstoneAt?: string
    }
  ): Promise<void>
}

async function deliverUserSearchProjection(
  event: UserAccountLifecycleChangedEvent | UserProfileChangedEvent,
  dependencies: UserLifecycleSearchDependencies
): Promise<void> {
  event.deliveryContext?.signal.throwIfAborted()
  if (dependencies.isSearchEnabled?.() === false) {
    return
  }
  if (!event.deliveryContext) {
    throw new DomainEventDeliveryError(
      'USER_SEARCH_PROJECTION_DELIVERY_CONTEXT_MISSING',
      false
    )
  }
  const context = {
    signal: event.deliveryContext.signal,
    externalVersion: event.deliveryContext.sequence,
    tombstoneAt: event.occurredAt,
  }
  try {
    await dependencies.reindexUserDirectoryDocumentFenced(event.userId, context)
    context.signal.throwIfAborted()
    await dependencies.reindexTalentDocumentFenced(event.userId, context)
  } catch (error) {
    if (isExternalVersionConflict(error)) {
      return
    }
    throw classifySearchProjectionError(error)
  }
  context.signal.throwIfAborted()
}

export function handleUserAccountLifecycleChanged(
  event: UserAccountLifecycleChangedEvent,
  dependencies: UserLifecycleSearchDependencies
): Promise<void> {
  return deliverUserSearchProjection(event, dependencies)
}

export function handleUserProfileChanged(
  event: UserProfileChangedEvent,
  dependencies: UserLifecycleSearchDependencies
): Promise<void> {
  return deliverUserSearchProjection(event, dependencies)
}

export interface ProjectLifecycleSearchDependencies {
  isSearchEnabled?(): boolean
  reindexProjectDocument(
    projectId: string,
    context?: {
      signal?: AbortSignal
      externalVersion?: number
      tombstoneAt?: string
    }
  ): Promise<void>
  removeProjectDocument(
    projectId: string,
    context?: {
      signal?: AbortSignal
      externalVersion?: number
      tombstoneAt?: string
    }
  ): Promise<void>
}

export async function handleProjectLifecycleChanged(
  event: ProjectLifecycleChangedEvent,
  dependencies: ProjectLifecycleSearchDependencies
): Promise<void> {
  event.deliveryContext?.signal.throwIfAborted()
  if (dependencies.isSearchEnabled?.() === false) {
    return
  }
  const context = event.deliveryContext
    ? {
        signal: event.deliveryContext.signal,
        externalVersion: event.deliveryContext.sequence,
      }
    : undefined
  try {
    if (event.action === 'deleted') {
      await dependencies.removeProjectDocument(
        event.projectId,
        context
          ? {
              ...context,
              tombstoneAt: event.occurredAt,
            }
          : undefined
      )
    } else {
      await dependencies.reindexProjectDocument(event.projectId, context)
    }
  } catch (error) {
    if (isExternalVersionConflict(error)) {
      return
    }
    throw classifySearchProjectionError(error)
  }
  event.deliveryContext?.signal.throwIfAborted()
}
