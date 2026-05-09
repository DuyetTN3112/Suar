import { PlatformAuditLoggerAdapter } from '#modules/observability/infra/adapters/operational-events/platform_audit_logger'
import { PlatformOperationalLoggerAdapter } from '#modules/observability/infra/adapters/operational-events/platform_operational_logger'
import { PlatformWorkflowLoggerAdapter } from '#modules/observability/infra/adapters/operational-events/platform_workflow_logger'
import { registerPlatformAuditLogger } from '#modules/observability/public_contracts/platform_audit_logger'
import { registerPlatformOperationalLogger } from '#modules/observability/public_contracts/platform_operational_logger'
import { registerPlatformWorkflowLogger } from '#modules/observability/public_contracts/platform_workflow_logger'

const operationalLogger = new PlatformOperationalLoggerAdapter()
const auditLogger = new PlatformAuditLoggerAdapter()
const workflowLogger = new PlatformWorkflowLoggerAdapter(operationalLogger, auditLogger)

registerPlatformOperationalLogger(operationalLogger)
registerPlatformAuditLogger(auditLogger)
registerPlatformWorkflowLogger(workflowLogger)

export { auditLogger, operationalLogger, workflowLogger }
export { platformOperationalLogger } from '#modules/observability/public_contracts/platform_operational_logger'
