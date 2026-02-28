import { NodeDomainEventIdentityProvider } from '#modules/events/infra/adapters/node_domain_event_identity_provider'
import { registerDomainEventCryptographyProvider } from '#modules/events/public_contracts/domain_event_identity'

export default class EventsRuntimeProvider {
  register(): void {
    registerDomainEventCryptographyProvider(new NodeDomainEventIdentityProvider())
  }
}
