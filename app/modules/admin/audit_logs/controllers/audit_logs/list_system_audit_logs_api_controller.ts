import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { auditLogFilterProps, loadAuditLogs } from './audit_log_surface_presenter.js'
import {
  mapAdminAuditLogResponse,
  wrapAdminCollectionResponse,
} from '../mappers/response/audit_logs/admin_api_response_mapper.js'

import { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/audit_logs/admin_audit_log_action_factory'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'

@inject()
export default class ListSystemAuditLogsApiController {
  constructor(private readonly actions: AdminAuditLogActionFactory) {}

  async handle(ctx: HttpContext) {
    const { result, filters } = await loadAuditLogs(ctx, this.actions, 'system')

    ctx.response.status(HttpStatus.OK).json(
      wrapAdminCollectionResponse(result.data.map(mapAdminAuditLogResponse), result.meta, {
        filters: auditLogFilterProps(filters, 'system'),
      })
    )
  }
}
