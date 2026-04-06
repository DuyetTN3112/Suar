import type {
  DomainEvent,
  DomainEventMap,
  EventListener,
  UnsubscribeFromEvent,
} from '#modules/events/domain_event'

interface EventSubscription {
  listener: EventListener<DomainEvent>
}

export class EventListenerTimeoutError extends Error {
  constructor(
    public readonly eventName: string,
    public readonly timeoutMs: number
  ) {
    super(`Listener for "${eventName}" exceeded its ${String(timeoutMs)}ms deadline`)
    this.name = 'EventListenerTimeoutError'
  }
}

export class EventDispatcher<
  TEvents extends { [TEventName in keyof TEvents]: DomainEvent } = DomainEventMap,
> {
  private readonly subscriptions = new Map<string, EventSubscription[]>()

  constructor(private readonly listenerTimeoutMs: number = 10_000) {
    if (!Number.isSafeInteger(listenerTimeoutMs) || listenerTimeoutMs < 1) {
      throw new RangeError('listenerTimeoutMs must be a positive integer')
    }
  }

  on<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>
  ): UnsubscribeFromEvent {
    const subscription = this.createSubscription(listener)
    const subscriptions = this.getOrCreateSubscriptions(eventName)
    subscriptions.push(subscription)

    return () => this.removeSubscription(eventName, subscription)
  }

  async dispatch(event: TEvents[keyof TEvents]): Promise<void> {
    const subscriptions = [...(this.subscriptions.get(event.eventName) ?? [])]
    const errors: unknown[] = []

    for (const subscription of subscriptions) {
      try {
        await this.invokeWithDeadline(event, subscription.listener)
      } catch (error) {
        errors.push(error)
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `${String(errors.length)} listener(s) failed for "${event.eventName}"`
      )
    }
  }

  private async invokeWithDeadline(
    event: DomainEvent,
    listener: EventListener<DomainEvent>
  ): Promise<void> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new EventListenerTimeoutError(event.eventName, this.listenerTimeoutMs))
      }, this.listenerTimeoutMs)
      timeoutHandle.unref()
    })

    try {
      await Promise.race([Promise.resolve().then(() => listener(event)), timeout])
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }

  private createSubscription<TEvent extends DomainEvent>(
    listener: EventListener<TEvent>
  ): EventSubscription {
    return { listener: listener as EventListener<DomainEvent> }
  }

  private getOrCreateSubscriptions(eventName: string): EventSubscription[] {
    const existingSubscriptions = this.subscriptions.get(eventName)
    if (existingSubscriptions) {
      return existingSubscriptions
    }

    const subscriptions: EventSubscription[] = []
    this.subscriptions.set(eventName, subscriptions)
    return subscriptions
  }

  private removeSubscription(eventName: string, subscription: EventSubscription): void {
    const subscriptions = this.subscriptions.get(eventName)
    if (!subscriptions) {
      return
    }

    const subscriptionIndex = subscriptions.indexOf(subscription)
    if (subscriptionIndex === -1) {
      return
    }

    subscriptions.splice(subscriptionIndex, 1)
    if (subscriptions.length === 0) {
      this.subscriptions.delete(eventName)
    }
  }
}
