import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from '#composition/organizations/persistence/organization_persistence_composition'
import {
  makeSystemAdminActionContext,
  type AdminActionContext,
} from '#modules/admin/audit_logs/actions/action_context'
import { AdminAuditEventReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
import { AdminAuditProjectionReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader'
import ListAuditLogsQuery from '#modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query'
import { mapOrganizationAuditActivityResponse } from '#modules/admin/audit_logs/controllers/mappers/response/audit_logs/audit_log_surface_response_mapper'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { platformAuditLogger } from '#modules/observability/public_contracts/platform_audit_logger'
import UpdateCustomRolesCommand from '#modules/organizations/actions/commands/access/update_custom_roles_command'
import UpdateOrganizationSettingsCommand from '#modules/organizations/actions/commands/settings/update_organization_settings_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ProjectFactory, TaskFactory } from '#tests/helpers/factories/project_task'
import { OrganizationFactory, OrganizationUserFactory } from '#tests/helpers/factories/user_org'

export {
  AdminActionContext,
  AdminAuditEventReader,
  AdminAuditProjectionReader,
  auditPublicApi,
  cleanupTestData,
  db,
  ListAuditLogsQuery,
  makeSystemAdminActionContext,
  mapOrganizationAuditActivityResponse,
  OrganizationFactory,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  OrganizationUserFactory,
  organizationWriter,
  platformAuditLogger,
  ProjectFactory,
  randomUUID,
  setupApp,
  TaskFactory,
  teardownApp,
  UpdateCustomRolesCommand,
  UpdateOrganizationSettingsCommand,
  UserFactory,
}

export interface AuditLogsTestContext {
  adminAuditEventReader: AdminAuditEventReader
  adminAuditProjectionReader: AdminAuditProjectionReader
  makeQuery: (execCtx: AdminActionContext) => ListAuditLogsQuery
}

export function configureAuditLogsTestGroup(group: {
  setup: (fn: () => Promise<void>) => void
  teardown: (fn: () => Promise<void>) => void
  each: { teardown: (fn: () => Promise<void>) => void }
}): AuditLogsTestContext {
  const ctx: AuditLogsTestContext = {
    adminAuditEventReader: null as unknown as AdminAuditEventReader,
    adminAuditProjectionReader: null as unknown as AdminAuditProjectionReader,
    makeQuery: (execCtx: AdminActionContext) =>
      new ListAuditLogsQuery(execCtx, ctx.adminAuditEventReader, ctx.adminAuditProjectionReader),
  }

  group.setup(async () => {
    const app = await setupApp()
    ctx.adminAuditEventReader = await app.container.make(AdminAuditEventReader)
    ctx.adminAuditProjectionReader = await app.container.make(AdminAuditProjectionReader)
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  return ctx
}

export async function countAuditEvents(action: string): Promise<number> {
  const result = (await db.from('audit_events').where('action', action).count('* as count')) as {
    count: number | string
  }[]

  return Number(result[0]?.count ?? 0)
}
