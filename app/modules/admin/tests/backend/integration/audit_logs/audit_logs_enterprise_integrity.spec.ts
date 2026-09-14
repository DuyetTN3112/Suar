import { test } from '@japa/runner'

import {
  auditPublicApi,
  configureAuditLogsTestGroup,
  countAuditEvents,
  db,
  OrganizationFactory,
  platformAuditLogger,
  ProjectFactory,
  randomUUID,
  TaskFactory,
  UserFactory,
} from './support/audit_logs_test_support.js'

test.group('Admin Audit Logs - Enterprise Integrity and Protection', (group) => {
  configureAuditLogsTestGroup(group)

  test('enterprise audit write persists metadata, scopes, redaction, and hash', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Enterprise Audit Org' },
      { username: 'enterprise_audit_owner' }
    )
    const affectedUser = await UserFactory.create({ username: 'enterprise_audit_member' })
    const action = `enterprise.audit.write.${Date.now()}`

    await auditPublicApi.write(
      {
        userId: owner.id,
        ip: '10.10.10.10',
        userAgent: 'enterprise-integration-test',
        organizationId: org.id,
        actorRoleSurface: 'org_owner',
        requestId: 'req-enterprise-1',
        traceId: 'trace-enterprise-1',
        workflowId: 'task_assignment',
      },
      {
        action,
        entity_type: 'task',
        entity_id: 'task-enterprise-1',
        event_name: 'task.assignment.created',
        event_family: 'workflow',
        module: 'tasks',
        subsystem: 'assignments',
        workflow: 'task_assignment',
        stage: 'completed',
        severity: 'info',
        outcome: 'success',
        target_type: 'task',
        target_id: 'task-enterprise-1',
        target_organization_id: org.id,
        affected_user_ids: [affectedUser.id],
        retention_class: 'security_audit',
        old_values: { status: 'todo', password: 'old-secret' },
        new_values: { status: 'done', refresh_token: 'new-token' },
      }
    )

    const row = (await db.from('audit_events').where('action', action).first()) as
      | Record<string, unknown>
      | undefined
    assert.isDefined(row)
    assert.equal(row?.['event_name'], 'task.assignment.created')
    assert.equal(row?.['module'], 'tasks')
    assert.equal(row?.['actor_user_id'], owner.id)
    assert.equal(row?.['actor_org_id'], org.id)
    assert.equal(row?.['actor_role_surface'], 'org_owner')
    assert.equal(row?.['target_org_id'], org.id)
    assert.equal(row?.['request_id'], 'req-enterprise-1')
    assert.equal(row?.['trace_id'], 'trace-enterprise-1')
    assert.equal(row?.['retention_class'], 'security_audit')
    assert.equal(row?.['redaction_applied'], true)
    const eventHash = row?.['event_hash']
    assert.equal(typeof eventHash, 'string')
    const eventHashText = typeof eventHash === 'string' ? eventHash : ''
    assert.match(eventHashText, /^[a-f0-9]{64}$/)

    const oldValues = row?.['old_values'] as Record<string, unknown>
    const newValues = row?.['new_values'] as Record<string, unknown>
    assert.equal(oldValues['password'], '[REDACTED]')
    assert.equal(newValues['refresh_token'], '[REDACTED]')

    const scopes = await db
      .from('audit_event_scopes')
      .where('event_id', row?.['id'] as string)
      .select('surface', 'user_id', 'organization_id')
      .orderBy('surface', 'asc')
      .orderBy('user_id', 'asc')

    assert.deepInclude(scopes, { surface: 'system', user_id: null, organization_id: null })
    assert.deepInclude(scopes, { surface: 'organization', user_id: null, organization_id: org.id })
    assert.deepInclude(scopes, { surface: 'user', user_id: owner.id, organization_id: null })
    assert.deepInclude(scopes, { surface: 'user', user_id: affectedUser.id, organization_id: null })
  })

  test('concurrent enterprise audit writes keep a single hash chain without forks', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Concurrent Audit Hash Org' },
      { username: 'concurrent_audit_hash_owner' }
    )
    const actionPrefix = `enterprise.concurrent_hash.${Date.now()}`
    const execCtx = {
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId: org.id,
      requestId: 'req-concurrent-audit',
      traceId: 'trace-concurrent-audit',
      workflowId: null,
    }

    await Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        await auditPublicApi.write(execCtx, {
          action: `${actionPrefix}.${index}`,
          entity_type: 'task',
          entity_id: `concurrent-task-${index}`,
          target_type: 'task',
          target_id: `concurrent-task-${index}`,
          target_organization_id: org.id,
          outcome: 'success',
          critical: true,
          new_values: { status: 'done' },
        })
      })
    )

    const rows = (await db
      .from('audit_events')
      .whereLike('action', `${actionPrefix}.%`)
      .select('event_hash', 'prev_hash')) as {
      event_hash: string
      prev_hash: string | null
    }[]
    assert.lengthOf(rows, 8)

    const hashes = new Set(rows.map((row) => row.event_hash))
    const previousHashes = rows.map((row) => row.prev_hash)
    assert.equal(hashes.size, 8)
    assert.equal(new Set(previousHashes).size, 8)
    assert.equal(
      previousHashes.filter(
        (previousHash): previousHash is string => previousHash !== null && hashes.has(previousHash)
      ).length,
      7
    )
  })

  test('system audit API supports forensic filters and returns sealed redacted evidence', async ({
    assert,
    client,
  }) => {
    const systemAdmin = await UserFactory.create({
      username: 'system_audit_operator',
      system_role: 'system_admin',
    })
    const targetOwner = await UserFactory.create({ username: 'system_audit_target_owner' })
    const targetOrganization = await OrganizationFactory.create({
      owner_id: targetOwner.id,
      name: 'System Audit Evidence Org',
    })
    const targetProject = await ProjectFactory.create({
      organization_id: targetOrganization.id,
      creator_id: targetOwner.id,
      owner_id: targetOwner.id,
      name: 'System Audit Evidence Project',
    })
    const targetTask = await TaskFactory.create({
      organization_id: targetOrganization.id,
      project_id: targetProject.id,
      creator_id: targetOwner.id,
      title: 'System Audit Evidence Task',
    })
    const action = `system.audit.forensic.${randomUUID()}`
    const traceId = `trace-system-audit-${randomUUID()}`
    const requestId = `request-system-audit-${randomUUID()}`
    const correlationKey = `correlation-system-audit-${randomUUID()}`

    await auditPublicApi.write(
      {
        userId: systemAdmin.id,
        ip: '198.51.100.88',
        userAgent: 'system-audit-forensic-agent',
        organizationId: null,
        actorRoleSurface: 'system_admin',
        requestId,
        traceId,
        workflowId: 'release_pipeline',
      },
      {
        action,
        entity_type: 'task',
        entity_id: targetTask.id,
        event_name: 'task.release.approval_warning',
        event_family: 'release_governance',
        module: 'tasks',
        subsystem: 'release_controls',
        workflow: 'release_pipeline',
        stage: 'approval',
        severity: 'warn',
        outcome: 'warning',
        actor_type: 'automation',
        actor_role_surface: 'system_admin',
        target_type: 'task',
        target_id: targetTask.id,
        target_organization_id: targetOrganization.id,
        correlation_key: correlationKey,
        retention_class: 'security_audit',
        old_values: {
          status: 'in_review',
          api_token: 'system-secret-before',
        },
        new_values: {
          status: 'blocked',
          client_secret: 'system-secret-after',
        },
      }
    )

    const response = await client.get('/api/admin/audit-logs').loginAs(systemAdmin).qs({
      module: 'tasks',
      workflow: 'release_pipeline',
      severity: 'warn',
      outcome: 'warning',
      actorType: 'automation',
      retentionClass: 'security_audit',
      traceId,
    })

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        action: string
        details: {
          oldValues: Record<string, unknown>
          newValues: Record<string, unknown>
        }
        investigation: {
          eventName: string | null
          module: string | null
          workflow: string | null
          severity: string | null
          outcome: string | null
          initiatorType: string | null
          actorRoleSurface: string | null
          targetLabel: string | null
          requestId: string | null
          traceId: string | null
          correlationKey: string | null
          retentionClass: string | null
          integrity: {
            status: string
            eventHash: string | null
            previousHash: string | null
            schemaVersion: number
            redactionApplied: boolean
            defensiveRedactionApplied: boolean
          }
        }
      }>
      filters: Record<string, unknown>
    }

    assert.lengthOf(body.data, 1)
    const event = body.data[0]
    assert.equal(event?.action, action)
    assert.equal(event?.details.oldValues['api_token'], '[REDACTED]')
    assert.equal(event?.details.newValues['client_secret'], '[REDACTED]')
    assert.deepInclude(event?.investigation, {
      eventName: 'task.release.approval_warning',
      module: 'tasks',
      workflow: 'release_pipeline',
      severity: 'warn',
      outcome: 'warning',
      initiatorType: 'automation',
      actorRoleSurface: 'system_admin',
      targetLabel: targetTask.title,
      requestId,
      traceId,
      correlationKey,
      retentionClass: 'security_audit',
    })
    assert.deepInclude(event?.investigation.integrity, {
      status: 'verified',
      schemaVersion: 2,
      redactionApplied: true,
      defensiveRedactionApplied: false,
    })
    assert.match(event?.investigation.integrity.eventHash ?? '', /^[a-f0-9]{64}$/)
    assert.deepInclude(body.filters, {
      module: 'tasks',
      workflow: 'release_pipeline',
      severity: 'warn',
      outcome: 'warning',
      actorType: 'automation',
      retentionClass: 'security_audit',
      traceId,
    })

    const serializedEvent = JSON.stringify(event)
    assert.notInclude(serializedEvent, 'system-secret-before')
    assert.notInclude(serializedEvent, 'system-secret-after')

    for (const search of [requestId, correlationKey, 'system-audit-forensic-agent']) {
      const searchResponse = await client
        .get('/api/admin/audit-logs')
        .loginAs(systemAdmin)
        .qs({ search, action })

      searchResponse.assertStatus(200)
      const searchBody = searchResponse.body() as {
        data: Array<{ action: string }>
      }
      assert.equal(searchBody.data[0]?.action, action)
    }
  })

  test('system audit API detects persisted evidence tampering and defensively redacts it', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const action = `system.audit.tampered.${randomUUID()}`

    await auditPublicApi.write(
      {
        userId: superadmin.id,
        ip: '203.0.113.44',
        userAgent: 'tamper-detection-agent',
        organizationId: null,
        requestId: 'request-tamper-detection',
        traceId: 'trace-tamper-detection',
      },
      {
        action,
        entity_type: 'system_setting',
        entity_id: 'tamper-target',
        event_name: 'system.setting.updated',
        module: 'system',
        severity: 'error',
        outcome: 'failure',
        retention_class: 'compliance_audit',
        old_values: { enabled: false },
        new_values: { enabled: true },
      }
    )

    await db
      .from('audit_events')
      .where('action', action)
      .update({
        new_values: JSON.stringify({
          enabled: true,
          refresh_token: 'tampered-secret-must-not-leak',
        }),
      })

    const response = await client.get('/api/admin/audit-logs').loginAs(superadmin).qs({ action })

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        details: { newValues: Record<string, unknown> }
        investigation: {
          integrity: {
            status: string
            redactionApplied: boolean
            defensiveRedactionApplied: boolean
          }
        }
      }>
    }
    const event = body.data[0]
    assert.isDefined(event)
    if (!event) return
    assert.equal(event.details.newValues['refresh_token'], '[REDACTED]')
    assert.deepEqual(event.investigation.integrity, {
      ...event.investigation.integrity,
      status: 'mismatch',
      redactionApplied: false,
      defensiveRedactionApplied: true,
    })
    assert.notInclude(JSON.stringify(event), 'tampered-secret-must-not-leak')
  })

  test('platform audit logger preserves the redaction marker after pre-redacting its payload', async ({
    assert,
  }) => {
    const actor = await UserFactory.create({ username: 'platform_audit_redaction_actor' })
    const action = `platform.audit.redaction.${randomUUID()}`

    await platformAuditLogger.record(
      {
        userId: actor.id,
        ip: '192.0.2.61',
        userAgent: 'platform-audit-redaction-agent',
        organizationId: null,
        requestId: 'request-platform-redaction',
        traceId: 'trace-platform-redaction',
        workflowId: 'platform_redaction',
      },
      {
        event_name: action,
        event_family: 'platform.security',
        module: 'observability',
        subsystem: 'audit',
        workflow: 'platform_redaction',
        stage: 'completed',
        severity: 'warn',
        outcome: 'warning',
        occurred_at: new Date().toISOString(),
        actor: {
          initiator_type: 'system',
          user_id: actor.id,
          role_surface: 'system_admin',
        },
        request: {
          id: 'request-platform-redaction',
          ip: '192.0.2.61',
          user_agent: 'platform-audit-redaction-agent',
        },
        trace: {
          id: 'trace-platform-redaction',
          workflow_id: 'platform_redaction',
          correlation_key: 'correlation-platform-redaction',
        },
        target: {
          type: 'system_setting',
          id: 'platform-redaction-target',
        },
        change: {
          api_token: 'platform-secret-must-not-leak',
        },
        runtime: {
          duration_ms: 37,
        },
        error: null,
        compliance: {
          redaction_applied: false,
          retention_class: 'security_audit',
          contains_sensitive_fields: true,
        },
      }
    )

    const row = (await db
      .from('audit_events')
      .where('action', action)
      .select('redaction_applied', 'new_values')
      .first()) as {
      redaction_applied: boolean
      new_values: Record<string, unknown>
    }

    assert.isTrue(row.redaction_applied)
    assert.equal((row.new_values['change'] as Record<string, unknown>)['api_token'], '[REDACTED]')
    assert.notInclude(JSON.stringify(row.new_values), 'platform-secret-must-not-leak')
  })

  test('admin audit log routes deny non-admin and guest access without leaking audit rows', async ({
    assert,
    client,
  }) => {
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const sentinelAction = `forbidden_audit_route_${Date.now()}`

    await db.table('audit_events').insert({
      user_id: regularUser.id,
      action: sentinelAction,
      entity_type: 'task',
      entity_id: 'forbidden-audit-route-task',
      old_values: JSON.stringify({ status: 'todo' }),
      new_values: JSON.stringify({ status: 'done' }),
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      occurred_at: new Date(),
    })

    const viewEventsBefore = await countAuditEvents('admin.audit_log.viewed')

    const regularWebResponse = await client.get('/admin/audit-logs').loginAs(regularUser)
    const regularApiResponse = await client
      .get('/api/admin/audit-logs')
      .header('accept', 'application/json')
      .loginAs(regularUser)
    const guestWebResponse = await client.get('/admin/audit-logs').redirects(0)
    const guestApiResponse = await client
      .get('/api/admin/audit-logs')
      .header('accept', 'application/json')

    regularWebResponse.assertStatus(403)
    regularApiResponse.assertStatus(403)
    guestWebResponse.assertStatus(401)
    guestApiResponse.assertStatus(401)

    for (const response of [
      regularWebResponse,
      regularApiResponse,
      guestWebResponse,
      guestApiResponse,
    ]) {
      assert.notInclude(response.text(), sentinelAction)
      assert.notInclude(response.text(), 'forbidden-audit-route-task')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }
    assert.equal(await countAuditEvents('admin.audit_log.viewed'), viewEventsBefore)
  })
})
