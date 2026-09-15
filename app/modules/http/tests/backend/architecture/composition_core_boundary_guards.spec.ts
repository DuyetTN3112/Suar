import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

import {
  acquireArchitectureTestLock,
  releaseArchitectureTestLock,
  scanProductionImportSpecifiers,
} from './support/boundary_guard_test_helpers.js'

test.group('Architecture | Composition core boundary guards', (group) => {
  group.setup(acquireArchitectureTestLock)
  group.teardown(releaseArchitectureTestLock)

  test('feature cache invalidation wiring belongs to outer composition', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/cache'],
        [/^#modules\/(organizations|projects|tasks)\//]
      ),
      []
    )

    for (const eliminatedPath of [
      'app/modules/cache/listeners/cache_invalidation_listener.ts',
      'app/modules/organizations/directory/public_contracts/organization_cache_invalidation.ts',
      'app/modules/projects/public_contracts/project_cache_invalidation.ts',
    ]) {
      assert.isFalse(existsSync(eliminatedPath), `${eliminatedPath} must remain eliminated`)
    }
  })

  test('search provider adapters are wired only by outer composition', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/search'],
        [
          /^#modules\/organizations\/public_contracts\/organization_search_indexing$/,
          /^#modules\/projects\/public_contracts\/project_search_indexing$/,
          /^#modules\/skills\/public_contracts\/skill_search_indexing$/,
          /^#modules\/tasks\/public_contracts\/task_search_indexing$/,
          /^#modules\/users\/public_contracts\/user_search_indexing$/,
        ]
      ),
      []
    )

    for (const providerBarrel of [
      'app/modules/organizations/directory/public_contracts/organization_search_indexing.ts',
      'app/modules/projects/public_contracts/project_search_indexing.ts',
      'app/modules/skills/public_contracts/skill_search_indexing.ts',
      'app/modules/tasks/public_contracts/task_search_indexing.ts',
      'app/modules/users/public_contracts/user_search_indexing.ts',
    ]) {
      assert.isFalse(existsSync(providerBarrel), `${providerBarrel} must remain eliminated`)
    }

    assert.isFalse(
      existsSync('app/modules/search/bootstrap/search_application_composition.ts'),
      'Search composition belongs at the application composition boundary'
    )
  })

  test('project detail publishes data only and executes through outer composition', ({
    assert,
  }) => {
    const contract = readFileSync('app/modules/projects/public_contracts/project_detail.ts', 'utf8')
    assert.notMatch(
      contract,
      /#modules\/(http|projects\/actions|projects\/infra|projects\/services)\//
    )
    assert.notMatch(contract, /@adonisjs\/|@vinejs\/|@poppinss\//)

    const outerComposition = readFileSync(
      'app/composition/projects/project-detail/project_detail_composition.ts',
      'utf8'
    )
    assert.include(
      outerComposition,
      '#composition/adapters/projects/project_detail_reader_adapter'
    )
    assert.include(outerComposition, '#modules/projects/public_contracts/project_detail')

    const organizationController = readFileSync(
      'app/modules/organizations/controllers/projects/show_project_controller.ts',
      'utf8'
    )
    assert.include(
      organizationController,
      '#modules/organizations/actions/ports/inbound/projects/organization_project_detail_query_factory'
    )
    assert.notInclude(
      organizationController,
      '#modules/organizations/actions/ports/outbound/projects/'
    )
    assert.notInclude(organizationController, '#composition/')

    for (const projectController of [
      'app/modules/projects/controllers/project-context/show_project_controller.ts',
      'app/modules/projects/controllers/project-context/get_project_detail_api_controller.ts',
    ]) {
      const source = readFileSync(projectController, 'utf8')
      assert.include(source, '#modules/projects/actions/ports/inbound/project_query_factory')
      assert.notInclude(source, '#modules/projects/actions/ports/outbound/')
      assert.notInclude(source, '#composition/')
    }
  })

  test('project external dependencies are runtime ports implemented only by outer adapters', ({
    assert,
  }) => {
    assert.isFalse(
      existsSync('app/modules/projects/actions/ports/project_external_dependencies_impl.ts'),
      'the executable Project dependency default must remain eliminated'
    )
    assert.isFalse(
      existsSync('app/composition/project_switch_composition.ts'),
      'Project switch persistence must remain behind its runtime reader port'
    )
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/projects/actions', 'app/modules/projects/controllers'],
        [/^#composition(?:\/|$)/]
      ),
      []
    )

    const projectExternalPorts = readFileSync(
      'app/modules/projects/actions/ports/outbound/project_external_dependencies.ts',
      'utf8'
    )
    assert.notMatch(
      projectExternalPorts,
      /#modules\/(organizations|tasks|users)\/|PublicApi|DefaultProjectDependencies/
    )

    for (const projectFile of [
      'app/modules/projects/actions/queries/project-context/get_project_detail_query.ts',
      'app/modules/projects/actions/queries/project-members/get_project_member_candidates_query.ts',
      'app/modules/projects/actions/queries/project-members/get_role_staffing_candidates_query.ts',
      'app/modules/projects/actions/queries/marketplace/get_marketplace_project_access_query.ts',
      'app/modules/projects/actions/commands/project-members/transfer_project_ownership_command.ts',
    ]) {
      const source = readFileSync(projectFile, 'utf8')
      assert.notInclude(source, 'DefaultProjectDependencies')
      assert.notInclude(source, 'project_external_dependencies_impl')
      assert.notInclude(source, '#composition/')
    }

    assert.isFalse(
      existsSync('app/modules/projects/actions/services/project_access_resolver.ts'),
      'the complete project-access read use case must remain owned by GetUserProjectAccessQuery'
    )

    for (const candidateQuery of [
      'app/modules/projects/actions/queries/project-context/get_project_detail_query.ts',
      'app/modules/projects/actions/queries/project-members/get_project_member_candidates_query.ts',
    ]) {
      assert.notInclude(readFileSync(candidateQuery, 'utf8'), 'userPublicApi')
    }

    const roleStaffingQuery = readFileSync(
      'app/modules/projects/actions/queries/project-members/get_role_staffing_candidates_query.ts',
      'utf8'
    )
    assert.include(
      roleStaffingQuery,
      '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
    )
    assert.notMatch(
      roleStaffingQuery,
      /@adonisjs\/lucid|#modules\/(skills|users|organizations)\/|(?:skill|user|organization)PublicApi|\.from\(/
    )

    const roleStaffingAdapter = readFileSync(
      'app/composition/adapters/projects/project_role_staffing_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      roleStaffingAdapter,
      '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
    )
    for (const providerApi of [
      '#composition/skills/skill-application/skills_application_composition',
      '#composition/organizations/persistence/organization_persistence_composition',
    ]) {
      assert.include(roleStaffingAdapter, providerApi)
    }
    assert.include(
      roleStaffingAdapter,
      '#modules/users/actions/queries/recruiting/get_user_staffing_candidate_profiles_query'
    )
    assert.notInclude(roleStaffingAdapter, '#modules/users/actions/services/user_public_api')

    const adapterExpectations = [
      [
        'app/composition/adapters/projects/project_organization_reader_adapter.ts',
        '#composition/organizations/persistence/organization_persistence_composition',
      ],
      [
        'app/composition/adapters/projects/project_task_reader_writer_adapter.ts',
        '#modules/tasks/infra/repositories/task-reading/read/aggregate_queries',
      ],
      [
        'app/composition/adapters/projects/project_user_reader_adapter.ts',
        '#composition/users/user-application/user_application_composition',
      ],
    ] as const
    for (const [adapterPath, providerApi] of adapterExpectations) {
      const source = readFileSync(adapterPath, 'utf8')
      assert.include(
        source,
        '#modules/projects/actions/ports/outbound/project_external_dependencies'
      )
      assert.include(source, providerApi)
    }

    const provider = readFileSync(
      'app/composition/projects/project-membership/project_consumer_ports_provider.ts',
      'utf8'
    )
    for (const binding of [
      'ProjectOrganizationReader',
      'ProjectTaskReaderWriter',
      'ProjectUserReader',
      'ProjectDetailReader',
      'OrganizationProjectDetailReader',
      'ProjectListReader',
      'ProjectSwitchTargetReader',
      'ProjectRoleStaffingReader',
    ]) {
      assert.include(provider, binding)
    }
  })

  test('project custom-role shape is a stable public contract, not an unowned types bucket', ({
    assert,
  }) => {
    assert.isFalse(
      existsSync('app/modules/projects/types/custom_role_definition.ts'),
      'the Project custom-role contract must not drift back into a generic types bucket'
    )
    const contract = readFileSync(
      'app/modules/projects/public_contracts/custom_role_definition.ts',
      'utf8'
    )
    assert.notMatch(contract, /^import\s/m)
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/projects'],
        [/^#modules\/projects\/types\/custom_role_definition$/]
      ),
      []
    )
  })

  test('project task and pending-review stats are orchestrated only by outer composition', ({
    assert,
  }) => {
    assert.isFalse(
      existsSync(
        'app/modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader.ts'
      ),
      'the cross-module Project task-stats adapter must remain outside Projects'
    )

    const outerAdapter = readFileSync(
      'app/composition/adapters/projects/project_task_stats_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      outerAdapter,
      '#modules/projects/actions/ports/outbound/project_task_stats_reader'
    )
    assert.include(outerAdapter, 'listAssignmentIdsByProjectIds')
    assert.notInclude(outerAdapter, 'taskPublicApi')
    assert.include(outerAdapter, 'reviewPublicApi.countPendingForTaskAssignmentIds')
    assert.notInclude(outerAdapter, 'countPendingForProject')

    for (const useCasePath of [
      'app/modules/projects/actions/commands/project-context/delete_project_command.ts',
      'app/modules/projects/actions/queries/project-members/get_project_members_query.ts',
      'app/composition/projects/project-search/projects_search_composition.ts',
    ]) {
      const source = readFileSync(useCasePath, 'utf8')
      assert.notInclude(source, 'TasksPublicApiProjectTaskStatsReader')
      assert.notInclude(source, 'tasks_public_api_project_task_stats_reader')
    }

    const provider = readFileSync(
      'app/composition/projects/project-membership/project_consumer_ports_provider.ts',
      'utf8'
    )
    assert.include(provider, 'ProjectTaskStatsReader')
    assert.include(provider, 'ProjectTaskStatsReaderAdapter')
  })

  test('auth session evidence command owns orchestration and adapters own I/O', ({ assert }) => {
    assert.isFalse(
      existsSync('app/modules/user_activity/public_contracts/user_activity_writer.ts'),
      'the executable UserActivity writer public surface must remain eliminated'
    )
    assert.isFalse(
      existsSync('app/modules/user_activity'),
      'the duplicate UserActivity runtime module must remain retired'
    )

    const authListener = readFileSync(
      'app/modules/auth/listeners/on_auth_session_observed.ts',
      'utf8'
    )
    assert.include(
      authListener,
      '#modules/auth/actions/commands/session-management/process_auth_session_observed_command'
    )
    assert.notMatch(authListener, /#modules\/user_activity\//)

    const authCommand = readFileSync(
      'app/modules/auth/actions/commands/session-management/process_auth_session_observed_command.ts',
      'utf8'
    )
    assert.include(
      authCommand,
      '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
    )
    assert.include(authCommand, 'this.dependencies.transactions.run')
    assert.include(authCommand, 'this.dependencies.receipts.claim')
    assert.include(authCommand, 'this.dependencies.audit.write')
    assert.notInclude(authCommand, 'this.dependencies.activity')
    assert.notMatch(authCommand, /#modules\/(audit|user_activity)\//)
    assert.notInclude(authCommand, '@adonisjs/lucid')

    const auditAdapter = readFileSync(
      'app/composition/adapters/audit/audit_auth_session_evidence_writer_adapter.ts',
      'utf8'
    )
    assert.include(
      auditAdapter,
      '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
    )
    assert.include(auditAdapter, '#modules/audit/public_contracts/audit_log_writer')

    assert.isFalse(
      existsSync('app/composition/adapters/user_activity_auth_session_evidence_writer_adapter.ts'),
      'the duplicate UserActivity evidence adapter must remain retired'
    )
    assert.isFalse(
      existsSync('app/composition/user_activity_composition.ts'),
      'the duplicate UserActivity composition root must remain retired'
    )

    const transactionAdapter = readFileSync(
      'app/composition/adapters/auth/session/lucid_auth_session_evidence_transaction_runner.ts',
      'utf8'
    )
    assert.include(
      transactionAdapter,
      '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
    )
    assert.include(transactionAdapter, '@adonisjs/lucid/services/db')

    const eventComposition = readFileSync(
      'app/composition/auth/session/auth_session_observed_composition.ts',
      'utf8'
    )
    assert.include(eventComposition, 'processAuthSessionObservedCommand')
    assert.include(eventComposition, '#modules/auth/listeners/on_auth_session_observed')

    for (const eliminatedFacade of [
      'app/modules/user_activity/actions/public_api.ts',
      'app/modules/user_activity/actions/services/user_activity_public_api.ts',
    ]) {
      assert.isFalse(existsSync(eliminatedFacade), `${eliminatedFacade} must remain eliminated`)
    }
  })
})
