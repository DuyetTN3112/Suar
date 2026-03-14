import emitter from '@adonisjs/core/services/emitter'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type {
  AuthSessionObservedOutboxPayload,
  DisputeResolvedOutboxPayload,
  ProjectLifecycleChangedOutboxPayload,
  DurableDomainEventDispatcher,
  DurableDomainEventName,
  DurableDomainEventPayloadByName,
  ReviewSubmittedOutboxPayload,
  TalentExplainabilityProjectionChangedOutboxPayload,
  ReviewConfirmedOutboxPayload,
  TalentReindexRequestedOutboxPayload,
  TaskAssignmentCompletedOutboxPayload,
  UserAccountLifecycleChangedOutboxPayload,
  UserProfileChangedOutboxPayload,
} from '#modules/events/domain/domain_event_outbox'
import type { DurableDomainEventDeliveryContext } from '#modules/events/public_contracts/domain_event_outbox'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type {
  ProjectCreatedEvent,
  ProjectDeletedEvent,
  ProjectUpdatedEvent,
} from '#modules/projects/public_contracts/project_events'

type ProjectCompatibilityEvent =
  | { eventName: 'project:created'; payload: ProjectCreatedEvent }
  | { eventName: 'project:updated'; payload: ProjectUpdatedEvent }
  | { eventName: 'project:deleted'; payload: ProjectDeletedEvent }

export interface ProjectLifecycleDispatchDependencies {
  emitStrict(
    event: ProjectLifecycleChangedOutboxPayload & {
      deliveryContext: DurableDomainEventDeliveryContext
    }
  ): Promise<void>
  emitCompatibility(event: ProjectCompatibilityEvent): Promise<void>
  reportCompatibilityFailure(event: ProjectLifecycleChangedOutboxPayload, error: unknown): void
}

const projectLifecycleDispatchDependencies: ProjectLifecycleDispatchDependencies = {
  emitStrict: (event) => emitter.emit('project:lifecycle:changed:v1', event),
  emitCompatibility: async (event) => {
    if (event.eventName === 'project:created') {
      await emitter.emit(event.eventName, event.payload)
    } else if (event.eventName === 'project:updated') {
      await emitter.emit(event.eventName, event.payload)
    } else {
      await emitter.emit(event.eventName, event.payload)
    }
  },
  reportCompatibilityFailure: (event, error) => {
    loggerService.warn(
      'Durable project lifecycle delivered; best-effort compatibility listeners failed',
      {
        eventId: event.eventId,
        action: event.action,
        projectId: event.projectId,
        error: serializeObservabilityError(error),
      }
    )
  },
}

export async function dispatchProjectLifecycleChanged(
  projectEvent: ProjectLifecycleChangedOutboxPayload,
  context: DurableDomainEventDeliveryContext,
  dependencies: ProjectLifecycleDispatchDependencies = projectLifecycleDispatchDependencies
): Promise<void> {
  context.signal.throwIfAborted()
  await dependencies.emitStrict({
    ...projectEvent,
    deliveryContext: context,
  })
  context.signal.throwIfAborted()

  const compatibilityEvent: ProjectCompatibilityEvent =
    projectEvent.action === 'created'
      ? {
          eventName: 'project:created',
          payload: {
            projectId: projectEvent.projectId,
            creatorId: projectEvent.actorId,
            organizationId: projectEvent.organizationId,
            name: projectEvent.projectName ?? '',
          },
        }
      : projectEvent.action === 'updated'
        ? {
            eventName: 'project:updated',
            payload: {
              projectId: projectEvent.projectId,
              updatedBy: projectEvent.actorId,
              changes: {},
            },
          }
        : {
            eventName: 'project:deleted',
            payload: {
              projectId: projectEvent.projectId,
              organizationId: projectEvent.organizationId,
              deletedBy: projectEvent.actorId,
            },
          }

  try {
    await dependencies.emitCompatibility(compatibilityEvent)
  } catch (error) {
    dependencies.reportCompatibilityFailure(projectEvent, error)
  }
}

export class AdonisDomainEventDispatcher implements DurableDomainEventDispatcher {
  async dispatch<TEventName extends DurableDomainEventName>(
    eventName: TEventName,
    payload: DurableDomainEventPayloadByName[TEventName],
    context: DurableDomainEventDeliveryContext
  ): Promise<void> {
    context.signal.throwIfAborted()
    switch (eventName) {
      case 'auth:session:observed:v1':
        await emitter.emit('auth:session:observed:v1', {
          ...(payload as AuthSessionObservedOutboxPayload),
          deliveryContext: context,
        })
        return
      case 'task:assignment:completed':
        await emitter.emit('task:assignment:completed', {
          ...(payload as TaskAssignmentCompletedOutboxPayload),
          deliveryContext: context,
        })
        return
      case 'project:lifecycle:changed:v1': {
        const projectEvent = payload as ProjectLifecycleChangedOutboxPayload
        await dispatchProjectLifecycleChanged(projectEvent, context)
        return
      }
      case 'user:account:lifecycle:changed:v1': {
        const userEvent = payload as UserAccountLifecycleChangedOutboxPayload
        await emitter.emit('user:account:lifecycle:changed:v1', {
          ...userEvent,
          deliveryContext: context,
        })
        context.signal.throwIfAborted()
        try {
          if (userEvent.action === 'registered') {
            await emitter.emit('user:registered', { userId: userEvent.userId })
          } else if (userEvent.action === 'deactivated') {
            await emitter.emit('user:deactivated', {
              userId: userEvent.userId,
              deactivatedBy: userEvent.actorId,
            })
          }
        } catch (error) {
          loggerService.warn(
            'Durable user account lifecycle delivered; best-effort compatibility listeners failed',
            {
              eventId: userEvent.eventId,
              action: userEvent.action,
              userId: userEvent.userId,
              error: serializeObservabilityError(error),
            }
          )
        }
        return
      }
      case 'user:profile:changed:v1': {
        const userEvent = payload as UserProfileChangedOutboxPayload
        await emitter.emit('user:profile:changed:v1', {
          ...userEvent,
          deliveryContext: context,
        })
        context.signal.throwIfAborted()
        try {
          await emitter.emit('user:profile:updated', {
            userId: userEvent.userId,
            changes: Object.fromEntries(userEvent.changedFields.map((field) => [field, true])),
          })
        } catch (error) {
          loggerService.warn(
            'Durable user profile change delivered; best-effort compatibility listeners failed',
            {
              eventId: userEvent.eventId,
              userId: userEvent.userId,
              error: serializeObservabilityError(error),
            }
          )
        }
        return
      }
      case 'review:submitted':
        await emitter.emit('review:submitted', {
          ...(payload as ReviewSubmittedOutboxPayload),
          deliveryContext: context,
        })
        return
      case 'review:confirmed':
        await emitter.emit('review:confirmed', {
          ...(payload as ReviewConfirmedOutboxPayload),
          deliveryContext: context,
        })
        return
      case 'dispute:resolved':
        await emitter.emit('dispute:resolved', {
          ...(payload as DisputeResolvedOutboxPayload),
          deliveryContext: context,
        })
        return
      case 'reviews:talent-explainability-projection:changed:v1':
        await emitter.emit('reviews:talent-explainability-projection:changed:v1', {
          ...(payload as TalentExplainabilityProjectionChangedOutboxPayload),
          deliveryContext: context,
        })
        return
      case 'search:talent-reindex-requested':
        await emitter.emit('search:talent-reindex-requested', {
          ...(payload as TalentReindexRequestedOutboxPayload),
          deliveryContext: context,
        })
        return
      default:
        return assertNever(eventName)
    }
  }
}

function assertNever(value: never): never {
  throw new InvariantViolationException(`Unsupported durable domain event: ${String(value)}`)
}
