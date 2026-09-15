import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

import {
  acquireArchitectureTestLock,
  releaseArchitectureTestLock,
  scanProductionImportSpecifiers,
} from './support/boundary_guard_test_helpers.js'

test.group('Architecture | Composition domain boundary guards', (group) => {
  group.setup(acquireArchitectureTestLock)
  group.teardown(releaseArchitectureTestLock)

  test('organization project lifecycle crosses a consumer-owned port', ({ assert }) => {
    assert.isFalse(
      existsSync('app/modules/organizations/projects/actions/command/create_project_command.ts'),
      'the forwarding Organizations create-project command must remain eliminated'
    )

    const deleteCommand = readFileSync(
      'app/modules/organizations/actions/commands/directory/delete_organization_command.ts',
      'utf8'
    )
    assert.include(
      deleteCommand,
      '#modules/organizations/actions/ports/outbound/directory/organization_project_lifecycle_reader'
    )
    assert.notMatch(deleteCommand, /#modules\/projects\//)

    const adapter = readFileSync(
      'app/composition/organizations/projects/adapters/organization_project_lifecycle_adapter.ts',
      'utf8'
    )
    assert.include(
      adapter,
      '#modules/organizations/actions/ports/outbound/directory/organization_project_lifecycle_reader'
    )
    assert.include(
      adapter,
      '#modules/projects/infra/repositories/project-context/read/project_model_queries'
    )

    const projectCreatorAdapter = readFileSync(
      'app/composition/organizations/projects/adapters/organization_project_creator_adapter.ts',
      'utf8'
    )
    assert.include(
      projectCreatorAdapter,
      '#modules/organizations/actions/ports/outbound/projects/organization_project_creator'
    )
    assert.include(
      projectCreatorAdapter,
      '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
    )

    for (const organizationPresentationFile of [
      'app/modules/organizations/controllers/projects/create_project_controller.ts',
      'app/modules/organizations/controllers/mappers/request/projects/current_project_request_mapper.ts',
    ]) {
      assert.notMatch(readFileSync(organizationPresentationFile, 'utf8'), /#modules\/projects\//)
    }

    for (const eliminatedProjectFacade of [
      'app/modules/projects/actions/services/project_public_api.ts',
      'app/modules/projects/public_contracts/project_public_api.ts',
    ]) {
      assert.isFalse(
        existsSync(eliminatedProjectFacade),
        `${eliminatedProjectFacade} must remain eliminated`
      )
    }

    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/organizations'],
        [/^#modules\/projects\/public_contracts\/project_public_api$/]
      ),
      []
    )

    assert.isFalse(
      existsSync('app/modules/marketplace/infra/adapters/projects_public_api_project_access.ts'),
      'Marketplace project access must remain an outer adapter'
    )
    const marketplaceProjectAccessAdapter = readFileSync(
      'app/composition/adapters/marketplace/marketplace_project_access_adapter.ts',
      'utf8'
    )
    assert.include(
      marketplaceProjectAccessAdapter,
      '#modules/marketplace/actions/ports/outbound/project_access_port'
    )
    assert.include(
      marketplaceProjectAccessAdapter,
      '#modules/projects/actions/queries/marketplace/get_marketplace_project_access_query'
    )
    assert.notInclude(marketplaceProjectAccessAdapter, 'projectPublicApi')

    const projectConsumerPortsProvider = readFileSync(
      'app/composition/projects/project-membership/project_consumer_ports_provider.ts',
      'utf8'
    )
    for (const binding of [
      'InertiaProjectDirectory',
      'SkillProjectAccessAuthorizer',
      'UserWorkHistoryReader',
    ]) {
      assert.include(projectConsumerPortsProvider, binding)
    }

    const inertiaProjectAdapter = readFileSync(
      'app/composition/adapters/projects/project-context/inertia_project_directory_adapter.ts',
      'utf8'
    )
    assert.include(
      inertiaProjectAdapter,
      '#modules/http/actions/ports/outbound/inertia_project_directory'
    )
    assert.include(
      inertiaProjectAdapter,
      '#modules/projects/infra/repositories/project-context/read/project_model_queries'
    )

    const skillsProjectAdapter = readFileSync(
      'app/composition/adapters/skills/skills_project_access_authorizer_adapter.ts',
      'utf8'
    )
    assert.include(
      skillsProjectAdapter,
      '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'
    )
    assert.include(
      skillsProjectAdapter,
      '#modules/projects/actions/queries/project-members/get_user_project_access_query'
    )

    const reviewProjectAdapter = readFileSync(
      'app/composition/adapters/reviews/review_project_membership_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      reviewProjectAdapter,
      '#modules/reviews/actions/ports/outbound/review_project_membership_reader'
    )
    assert.include(
      reviewProjectAdapter,
      '#modules/projects/infra/repositories/project-members/read/project_member_queries'
    )

    const userWorkHistoryAdapter = readFileSync(
      'app/composition/adapters/users/user_work_history_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      userWorkHistoryAdapter,
      '#modules/users/actions/ports/outbound/user_work_history_reader'
    )
    assert.include(
      userWorkHistoryAdapter,
      '#modules/projects/infra/repositories/project-context/read/project_work_history_queries'
    )
    assert.include(
      userWorkHistoryAdapter,
      '#modules/organizations/infra/repositories/read/members/organization_work_history_queries'
    )
    assert.isFalse(
      existsSync('app/modules/users/actions/ports/user_work_history_reader_impl.ts'),
      'Users work-history concrete default must remain eliminated'
    )

    const organizationExternalDependencies = readFileSync(
      'app/modules/organizations/actions/ports/outbound/directory/organization_external_dependencies.ts',
      'utf8'
    )
    assert.notInclude(organizationExternalDependencies, 'OrganizationProjectTaskReaderWriter')

    for (const outerAdapter of [
      'app/composition/organizations/dashboard/adapters/organization_portfolio_stats_adapter.ts',
      'app/composition/organizations/members/adapters/organization_member_project_offboarding_adapter.ts',
    ]) {
      const source = readFileSync(outerAdapter, 'utf8')
      assert.match(source, /#modules\/organizations\/actions\/ports\//)
      assert.match(source, /#modules\/projects\/infra\/repositories\//)
      assert.match(source, /#modules\/tasks\/infra\/repositories\//)
    }
  })

  test('task project notification audience is resolved by an outer adapter', ({ assert }) => {
    const revokeCommand = readFileSync(
      'app/modules/tasks/actions/commands/task-assignment/revoke_task_access_command.ts',
      'utf8'
    )
    assert.include(
      revokeCommand,
      '#modules/tasks/actions/ports/outbound/task_project_notification_audience_reader'
    )
    assert.notMatch(revokeCommand, /#modules\/projects\//)

    const outerAdapter = readFileSync(
      'app/composition/adapters/tasks/task_project_notification_audience_adapter.ts',
      'utf8'
    )
    assert.include(
      outerAdapter,
      '#modules/tasks/actions/ports/outbound/task_project_notification_audience_reader'
    )
    assert.include(
      outerAdapter,
      '#modules/projects/infra/repositories/project-members/read/project_member_queries'
    )

    const taskFactory = readFileSync(
      'app/composition/tasks/task-factories/task_action_factory.ts',
      'utf8'
    )
    assert.notInclude(taskFactory, 'makeRevokeTaskAccessCommand')
  })

  test('task provider dependencies are wired only by outer adapters', ({ assert }) => {
    for (const eliminatedPath of [
      'app/modules/tasks/bootstrap/adapters/monolith_task_project_reader.ts',
      'app/modules/tasks/bootstrap/adapters/monolith_task_permission_reader.ts',
      'app/modules/tasks/bootstrap/adapters/monolith_task_org_reader.ts',
      'app/modules/tasks/bootstrap/adapters/monolith_task_review_reader.ts',
      'app/modules/tasks/bootstrap/adapters/monolith_task_skill_reader.ts',
      'app/modules/tasks/bootstrap/adapters/monolith_task_user_reader.ts',
      'app/modules/tasks/bootstrap/task_action_factory.ts',
      'app/modules/tasks/bootstrap/task_composition_root.ts',
      'app/modules/tasks/bootstrap/task_query_factory.ts',
    ]) {
      assert.isFalse(existsSync(eliminatedPath), `${eliminatedPath} must remain eliminated`)
    }

    const taskDependencyFactory = readFileSync(
      'app/composition/tasks/task-authoring/create_task_external_dependencies.ts',
      'utf8'
    )
    assert.notMatch(
      taskDependencyFactory,
      /#modules\/(projects|organizations|users|skills|reviews)\//
    )

    const projectAdapter = readFileSync(
      'app/composition/adapters/tasks/task_project_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      projectAdapter,
      '#modules/tasks/actions/ports/outbound/task_external_dependencies'
    )
    assert.include(
      projectAdapter,
      '#modules/projects/infra/repositories/project-context/read/project_model_queries'
    )

    const permissionAdapter = readFileSync(
      'app/composition/adapters/tasks/task_permission_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      permissionAdapter,
      '#modules/tasks/actions/ports/outbound/task_external_dependencies'
    )
    assert.include(
      permissionAdapter,
      '#modules/organizations/infra/repositories/members/organization_user_repository/'
    )
    assert.include(
      permissionAdapter,
      '#modules/projects/infra/repositories/project-members/read/project_member_queries'
    )
    assert.notInclude(permissionAdapter, '#modules/users/')

    for (const [outerAdapter, providerComposition] of [
      [
        'app/composition/adapters/tasks/task_organization_reader_adapter.ts',
        '#composition/organizations/persistence/organization_persistence_composition',
      ],
      [
        'app/composition/adapters/tasks/task_skill_reader_adapter.ts',
        '#composition/skills/skill-application/skills_application_composition',
      ],
      [
        'app/composition/adapters/tasks/task_user_reader_adapter.ts',
        '#composition/users/user-application/user_application_composition',
      ],
    ] as const) {
      const source = readFileSync(outerAdapter, 'utf8')
      assert.include(source, '#modules/tasks/actions/ports/outbound/task_external_dependencies')
      assert.include(source, providerComposition)
      assert.notMatch(source, /#modules\/(organizations|skills|users)\//)
    }

    const reviewAdapter = readFileSync(
      'app/composition/adapters/tasks/task_review_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      reviewAdapter,
      '#modules/tasks/actions/ports/outbound/task_external_dependencies'
    )
    assert.include(reviewAdapter, '#composition/reviews/public-api/review_public_api_composition')
    assert.include(
      reviewAdapter,
      '#modules/tasks/actions/queries/task-applications/review_assignment_context_v1_query'
    )
    assert.notInclude(reviewAdapter, 'taskPublicApi')
    assert.notInclude(reviewAdapter, '#modules/reviews/infra/repositories/')

    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/tasks'],
        [/^#modules\/projects\/(?:actions\/services|public_contracts)\/project_public_api$/]
      ),
      []
    )
  })

  test('task and project audit reads are coordinated by consumer-owned outer adapters', ({
    assert,
  }) => {
    for (const consumerQuery of [
      'app/modules/tasks/actions/queries/task-authoring/get_task_audit_logs_query.ts',
      'app/modules/tasks/actions/queries/task-reading/get_task_detail_query.ts',
      'app/modules/projects/actions/queries/project-context/get_project_detail_query.ts',
      'app/modules/projects/actions/queries/project-members/get_project_members_query.ts',
    ]) {
      const source = readFileSync(consumerQuery, 'utf8')
      assert.notMatch(source, /#modules\/audit\//)
      assert.notInclude(source, 'auditPublicApi')
    }

    const taskAdapter = readFileSync(
      'app/composition/adapters/tasks/task_audit_trail_reader_adapter.ts',
      'utf8'
    )
    assert.include(taskAdapter, '#modules/tasks/actions/ports/outbound/task_audit_trail_reader')
    assert.include(taskAdapter, '#composition/admin/audit/audit_read_composition')
    assert.include(taskAdapter, '#composition/users/user-application/user_application_composition')

    const projectAdapter = readFileSync(
      'app/composition/adapters/projects/project_audit_activity_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      projectAdapter,
      '#modules/projects/actions/ports/outbound/project_audit_activity_reader'
    )
    assert.include(projectAdapter, '#composition/admin/audit/audit_read_composition')
    assert.include(
      projectAdapter,
      '#composition/users/user-application/user_application_composition'
    )

    const auditReadRepository = readFileSync(
      'app/modules/audit/infra/repositories/read/audit_log_read_repository.ts',
      'utf8'
    )
    assert.notMatch(auditReadRepository, /#modules\/users\//)

    const auditReadQueries = [
      'app/modules/audit/actions/queries/audit-log/list_audit_logs_by_entity_query.ts',
      'app/modules/audit/actions/queries/audit-log/list_admin_audit_logs_query.ts',
      'app/modules/audit/actions/queries/audit-log/get_last_audit_activity_by_users_query.ts',
    ].map((path) => readFileSync(path, 'utf8'))
    for (const query of auditReadQueries) {
      assert.include(query, '#modules/audit/actions/ports/outbound/audit_log_read_repository')
      assert.notMatch(query, /#modules\/(projects|tasks|users)\//)
      assert.notInclude(query, '@adonisjs/lucid')
    }

    const auditReadComposition = readFileSync(
      'app/composition/admin/audit/audit_read_composition.ts',
      'utf8'
    )
    assert.include(auditReadComposition, '#modules/audit/actions/queries/')
    assert.include(auditReadComposition, '#modules/audit/domain/audit-log/audit_change_formatter')
    assert.include(
      auditReadComposition,
      '#modules/audit/infra/repositories/read/audit_log_read_repository'
    )
  })

  test('admin audit reads keep cross-domain search projections outside Audit and Admin actions', ({
    assert,
  }) => {
    assert.isFalse(
      existsSync('app/modules/admin/infra/repositories/read/admin_audit_log_queries.ts'),
      'the cross-schema Admin repository must remain eliminated'
    )

    const adminEventPort = readFileSync(
      'app/modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader.ts',
      'utf8'
    )
    const adminProjectionPort = readFileSync(
      'app/modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader.ts',
      'utf8'
    )
    const adminQuery = readFileSync(
      'app/modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query.ts',
      'utf8'
    )
    const auditReadRepository = readFileSync(
      'app/modules/audit/infra/repositories/read/audit_log_read_repository.ts',
      'utf8'
    )
    const auditReadQueries = [
      'app/modules/audit/actions/queries/audit-log/list_audit_logs_by_entity_query.ts',
      'app/modules/audit/actions/queries/audit-log/list_admin_audit_logs_query.ts',
      'app/modules/audit/actions/queries/audit-log/get_last_audit_activity_by_users_query.ts',
    ].map((path) => readFileSync(path, 'utf8'))
    const auditReadComposition = readFileSync(
      'app/composition/admin/audit/audit_read_composition.ts',
      'utf8'
    )
    const eventAdapter = readFileSync(
      'app/composition/adapters/admin/audit/admin_audit_event_reader_adapter.ts',
      'utf8'
    )
    const projectionAdapter = readFileSync(
      'app/composition/adapters/admin/audit/admin_audit_projection_reader_adapter.ts',
      'utf8'
    )

    for (const port of [adminEventPort, adminProjectionPort]) {
      assert.notMatch(port, /#modules\/(audit|organizations|projects|tasks|users)\//)
      assert.notInclude(port, '@adonisjs/lucid')
    }
    assert.notMatch(adminQuery, /#modules\/(audit|organizations|projects|tasks|users)\//)
    assert.notInclude(adminQuery, '@adonisjs/lucid')
    assert.deepEqual(
      scanProductionImportSpecifiers(
        [
          'app/modules/admin/audit_logs/actions',
          'app/modules/admin/audit_logs/controllers',
          'app/modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader.ts',
          'app/modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader.ts',
        ],
        [/^#composition(?:\/|$)/]
      ),
      []
    )

    for (const table of ['organizations', 'projects', 'tasks']) {
      assert.notInclude(auditReadRepository, `.from('${table}')`)
    }
    assert.notInclude(auditReadRepository, 'name ilike')
    assert.notInclude(auditReadRepository, 'title ilike')
    assert.isFalse(
      existsSync('app/modules/audit/actions/services/audit_public_api.ts'),
      'the Audit action-service facade must remain eliminated'
    )
    assert.isFalse(
      existsSync('app/modules/audit/actions/read_audit_logs.ts'),
      'the multi-operation AuditLogReadService facade must remain eliminated'
    )
    for (const query of auditReadQueries) {
      assert.include(query, '#modules/audit/actions/ports/outbound/audit_log_read_repository')
      assert.notInclude(query, '@adonisjs/lucid')
    }
    assert.include(
      auditReadComposition,
      '#modules/audit/infra/repositories/read/audit_log_read_repository'
    )
    for (const queryName of [
      'ListAuditLogsByEntityQuery',
      'ListAdminAuditLogsQuery',
      'GetLastAuditActivityByUsersQuery',
    ]) {
      assert.include(auditReadComposition, queryName)
    }

    assert.include(
      eventAdapter,
      '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
    )
    assert.include(eventAdapter, '#composition/admin/audit/audit_read_composition')
    assert.notMatch(eventAdapter, /#modules\/audit\/(actions|infra)\//)
    assert.include(
      projectionAdapter,
      '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader'
    )
    assert.notInclude(projectionAdapter, '@adonisjs/lucid')
    for (const table of ['organizations', 'projects', 'tasks']) {
      assert.notInclude(projectionAdapter, `.from('${table}')`)
    }
    assert.include(
      projectionAdapter,
      '#modules/organizations/infra/repositories/read/directory/organization_audit_target_queries'
    )
    assert.include(
      projectionAdapter,
      '#modules/projects/infra/repositories/project-context/read/project_audit_target_queries'
    )
    assert.include(
      projectionAdapter,
      '#modules/tasks/infra/repositories/task-reading/read/task_audit_target_queries'
    )
  })
})

