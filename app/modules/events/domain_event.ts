export interface DomainEvent {
  readonly eventName: string
}

export type DomainEventMap = Record<string, DomainEvent>

export type EventListener<TEvent extends DomainEvent> = (event: TEvent) => void | Promise<void>

export type UnsubscribeFromEvent = () => void
