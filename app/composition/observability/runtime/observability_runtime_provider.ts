import { NodePlatformTraceIdentityProvider } from '#modules/observability/infra/adapters/operational-events/node_platform_trace_identity_provider'
import { registerPlatformTraceIdentityProvider } from '#modules/observability/public_contracts/platform_trace_context'
import '#composition/observability/platform/platform_operational_logger_composition'

export default class ObservabilityRuntimeProvider {
  register(): void {
    registerPlatformTraceIdentityProvider(new NodePlatformTraceIdentityProvider())
  }
}
