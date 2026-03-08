import { NodePlatformTraceIdentityProvider } from '#modules/observability/infra/adapters/node_platform_trace_identity_provider'
import { registerPlatformTraceIdentityProvider } from '#modules/observability/public_contracts/platform_trace_context'

export default class ObservabilityRuntimeProvider {
  register(): void {
    registerPlatformTraceIdentityProvider(new NodePlatformTraceIdentityProvider())
  }
}
