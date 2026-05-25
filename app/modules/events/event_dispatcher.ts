interface DomainEvent {
  eventName: string
}

type EventListener<TEvent extends DomainEvent> = (event: TEvent) => void | Promise<void>

export class EventDispatcher {
  private listeners = new Map<string, EventListener<DomainEvent>[]>()

  on(eventName: string, listener: EventListener<DomainEvent>): void {
    const listeners = this.listeners.get(eventName)
    if (listeners) {
      listeners.push(listener)
      return
    }

    this.listeners.set(eventName, [listener])
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const listeners = this.listeners.get(event.eventName) ?? []
    const errors: unknown[] = []

    for (const listener of listeners) {
      try {
        await listener(event)
      } catch (error) {
        errors.push(error)
      }
    }

    if (errors.length > 0) {
      throw errors[0]
    }
  }
}
