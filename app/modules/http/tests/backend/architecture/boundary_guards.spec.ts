import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

interface ImportViolation {
  file: string
  line: number
  specifier: string
  reason?: string
}

interface BaselineViolation {
  file: string
  import_path: string
  reason: string
}

function countProductionRgMatches(pattern: string, paths: string[]): number {
  try {
    const output = execFileSync(
      'rg',
      [pattern, ...paths, '--glob', '*.ts', '--glob', '!**/tests/**', '--count'],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .reduce((sum, line) => {
        const count = Number.parseInt(line.split(':').pop() ?? '0', 10)
        return Number.isNaN(count) ? sum : sum + count
      }, 0)
  } catch {
    return 0
  }
}

function readBoundaryBaseline(): Set<string> {
  const path = 'docs/architecture/generated/boundary_violations_baseline.json'
  if (!existsSync(path)) return new Set()

  const content = readFileSync(path, 'utf8')
  const violations = JSON.parse(content) as BaselineViolation[]

  return new Set(violations.map((violation) => `${violation.file}:${violation.import_path}`))
}

function moduleNameFromPath(path: string): string | null {
  const match = /^app\/modules\/([^/]+)\//.exec(path)
  return match?.[1] ?? null
}

function importedModule(specifier: string): string | null {
  const match = /^#modules\/([^/]+)\//.exec(specifier)
  return match?.[1] ?? null
}

function isCompositionPath(path: string): boolean {
  return (
    path.startsWith('start/') ||
    path.startsWith('app/composition/') ||
    /^app\/modules\/[^/]+\/bootstrap\//.test(path) ||
    /^app\/modules\/[^/]+\/infra\/adapters\//.test(path)
  )
}

function scanImportSpecifiers(paths: string[], forbidden: RegExp[]): ImportViolation[] {
  const importPattern =
    "import\\s+(?:type\\s+)?(?:[\\s\\S]*?\\s+from\\s+)?['\\\"]([^'\\\"]+)['\\\"]|export\\s+(?:type\\s+)?[\\s\\S]*?\\s+from\\s+['\\\"]([^'\\\"]+)['\\\"]|import\\(\\s*['\\\"]([^'\\\"]+)['\\\"]\\s*\\)"

  try {
    const output = execFileSync(
      'rg',
      [importPattern, ...paths, '--glob', '*.ts', '--line-number', '--replace', '$path:$line:$1'],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        const [file, lineNumber, specifier] = line.split(':')
        if (!file || !lineNumber || !specifier) return []

        if (!forbidden.some((pattern) => pattern.test(specifier))) return []

        return [
          {
            file,
            line: Number.parseInt(lineNumber, 10),
            specifier,
          },
        ]
      })
  } catch {
    return []
  }
}

function scanProductionImportSpecifiers(paths: string[], forbidden: RegExp[]): ImportViolation[] {
  const importPattern =
    "import\\s+(?:type\\s+)?(?:[\\s\\S]*?\\s+from\\s+)?['\\\"]([^'\\\"]+)['\\\"]|export\\s+(?:type\\s+)?[\\s\\S]*?\\s+from\\s+['\\\"]([^'\\\"]+)['\\\"]|import\\(\\s*['\\\"]([^'\\\"]+)['\\\"]\\s*\\)"

  try {
    const output = execFileSync(
      'rg',
      [
        importPattern,
        ...paths,
        '--glob',
        '*.ts',
        '--glob',
        '!**/tests/**',
        '--line-number',
        '--replace',
        '$path:$line:$1',
      ],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        const [file, lineNumber, specifier] = line.split(':')
        if (!file || !lineNumber || !specifier) return []

        if (!forbidden.some((pattern) => pattern.test(specifier))) return []

        return [
          {
            file,
            line: Number.parseInt(lineNumber, 10),
            specifier,
          },
        ]
      })
  } catch {
    return []
  }
}

function scanBoundaryViolations(): ImportViolation[] {
  const legacyCoreContextSpecifier = ['#modules', 'core', 'types', 'execution_context'].join('/')

  return scanImportSpecifiers(['app', 'start', 'config', 'commands', 'tests'], [
    /^#platform\/dtos(?:\/|$)/,
    /^#types\/database$/,
    new RegExp(`^${legacyCoreContextSpecifier}$`),
    /^#modules\/outbox(?:\/|$)/,
    /^#modules\/[^/]+\/(infra|domain|constants|validators)(?:\/|$)/,
    /^#modules\/[^/]+\/actions\/public_api$/,
    /^#modules\/[^/]+\/(application\/dtos|actions\/dtos|controllers\/mappers)(?:\/|$)/,
  ]).flatMap((violation) => {
    const sourceModule = moduleNameFromPath(violation.file)
    const targetModule = importedModule(violation.specifier)

    if (violation.specifier.startsWith('#modules/outbox')) {
      if (
        violation.file.startsWith('app/modules/outbox/') ||
        violation.file.startsWith('app/composition/') ||
        violation.file.startsWith('start/')
      ) {
        return []
      }

      return [{ ...violation, reason: 'business modules must use local event publisher ports' }]
    }

    if (
      violation.specifier.startsWith('#platform/dtos') ||
      violation.specifier === '#types/database' ||
      violation.specifier === legacyCoreContextSpecifier
    ) {
      return [violation]
    }

    if (!sourceModule || !targetModule || sourceModule === targetModule) return []
    if (isCompositionPath(violation.file)) return []

    if (violation.specifier.endsWith('/actions/public_api')) {
      return violation.file.includes('/actions/') || violation.file.includes('/domain/')
        ? [{ ...violation, reason: 'business code must call local ports, not foreign public_api' }]
        : []
    }

    return [violation]
  })
}

test.group('Architecture boundary guards', () => {
  test('production code does not import from eliminated modules common', ({ assert }) => {
    assert.equal(countProductionRgMatches("from '#modules/common'", ['app']), 0)
  })

  test('protected domain layers do not import cross-module role constants', ({ assert }) => {
    const protectedPaths = [
      'app/modules/authorization',
      'app/modules/tasks/domain',
      'app/modules/projects/domain',
    ]

    for (const pattern of [
      "from '#modules/organizations/constants",
      "from '#modules/projects/constants",
      "from '#modules/users/constants",
    ]) {
      assert.equal(countProductionRgMatches(pattern, protectedPaths), 0)
    }
  })

  test('authorization module does not import user module internals', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(['app/modules/authorization'], [
        /^#modules\/users\/(?!actions\/public_api$)/,
      ]),
      []
    )
  })

  test('actions and modules do not import Lucid model instances from infra', ({ assert }) => {
    const violations = scanImportSpecifiers(['app/modules'], [
      /^#modules\/[^/]+\/infra\/models\//,
    ]).filter((violation) => /\/(actions|controllers)\//.test(violation.file))

    assert.deepEqual(violations, [])
  })

  test('actions and modules do not import the monolithic task repository facade', ({
    assert,
  }) => {
    assert.equal(
      countProductionRgMatches("from '#modules/tasks/infra/repositories/task_repository'", [
        'app/modules',
      ]),
      0
    )
  })

  test('actions do not import the organization user repository facade', ({ assert }) => {
    assert.equal(
      countProductionRgMatches(
        "from '#modules/organizations/infra/repositories/organization_user_repository'",
        ['app/modules']
      ),
      0
    )
  })

  test('source code does not import deprecated layer aliases', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app', 'start', 'config', 'commands', 'tests'], [
      /^#actions\//,
      /^#infra\//,
    ]), [])
  })

  test('core module does not import from business or HTTP modules', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app/modules/core'], [
      /^#modules\/(?!core\/)/,
      /^@adonisjs\/core\/http$/,
    ]), [])
  })

  test('actions do not import module bootstrap composition roots', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app/modules'], [
      /^#bootstrap\//,
      /^#modules\/[^/]+\/bootstrap\//,
    ]).filter((violation) => violation.file.includes('/actions/')), [])
  })

  test('business modules do not import HTTP DTO buckets or legacy validation rules', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app/modules'], [
      /^#modules\/http\/actions\/dtos\//,
      /^#types\/validation_rules$/,
    ]).filter((violation) => !violation.file.includes('/modules/http/')), [])
  })

  test('module boundary violations do not exceed generated baseline', ({ assert }) => {
    const baseline = readBoundaryBaseline()
    const newViolations = scanBoundaryViolations().filter((violation) => {
      return !baseline.has(`${violation.file}:${violation.specifier}`)
    })

    const outerComposition = readFileSync('app/composition/project_detail_composition.ts', 'utf8')
    assert.include(outerComposition, './adapters/project_detail_reader_adapter.js')
    assert.include(outerComposition, '#modules/projects/public_contracts/project_detail')

    const organizationController = readFileSync(
      'app/modules/organizations/projects/controllers/show_project_controller.ts',
      'utf8'
    )
    assert.include(
      organizationController,
      '#modules/organizations/projects/actions/ports/inbound/organization_project_detail_query_factory'
    )
    assert.notInclude(
      organizationController,
      '#modules/organizations/projects/actions/ports/outbound/'
    )
    assert.notInclude(organizationController, '#composition/')

    for (const projectController of [
      'app/modules/projects/controllers/show_project_controller.ts',
      'app/modules/projects/controllers/get_project_detail_api_controller.ts',
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
      'app/modules/projects/actions/queries/get_project_detail_query.ts',
      'app/modules/projects/actions/queries/get_project_member_candidates_query.ts',
      'app/modules/projects/actions/queries/get_role_staffing_candidates_query.ts',
      'app/modules/projects/actions/queries/get_marketplace_project_access_query.ts',
      'app/modules/projects/actions/commands/transfer_project_ownership_command.ts',
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
      'app/modules/projects/actions/queries/get_project_detail_query.ts',
      'app/modules/projects/actions/queries/get_project_member_candidates_query.ts',
    ]) {
      assert.notInclude(readFileSync(candidateQuery, 'utf8'), 'userPublicApi')
    }

    const roleStaffingQuery = readFileSync(
      'app/modules/projects/actions/queries/get_role_staffing_candidates_query.ts',
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
      'app/composition/adapters/project_role_staffing_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      roleStaffingAdapter,
      '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
    )
    for (const providerApi of [
      '#composition/skills_application_composition',
      '#composition/organization_persistence_composition',
    ]) {
      assert.include(roleStaffingAdapter, providerApi)
    }
    assert.include(
      roleStaffingAdapter,
      '#modules/users/actions/queries/get_user_staffing_candidate_profiles_query'
    )
    assert.notInclude(roleStaffingAdapter, '#modules/users/actions/services/user_public_api')

    const adapterExpectations = [
      [
        'app/composition/adapters/project_organization_reader_adapter.ts',
        '#composition/organization_persistence_composition',
      ],
      [
        'app/composition/adapters/project_task_reader_writer_adapter.ts',
        '#modules/tasks/infra/repositories/read/aggregate_queries',
      ],
      [
        'app/composition/adapters/project_user_reader_adapter.ts',
        '#composition/user_application_composition',
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

    const provider = readFileSync('app/composition/project_consumer_ports_provider.ts', 'utf8')
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
      'app/composition/adapters/project_task_stats_reader_adapter.ts',
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
      'app/modules/projects/actions/commands/delete_project_command.ts',
      'app/modules/projects/actions/queries/get_project_members_query.ts',
      'app/composition/projects_search_composition.ts',
    ]) {
      const source = readFileSync(useCasePath, 'utf8')
      assert.notInclude(source, 'TasksPublicApiProjectTaskStatsReader')
      assert.notInclude(source, 'tasks_public_api_project_task_stats_reader')
    }

    const provider = readFileSync('app/composition/project_consumer_ports_provider.ts', 'utf8')
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
      '#modules/auth/actions/commands/process_auth_session_observed_command'
    )
    assert.notMatch(authListener, /#modules\/user_activity\//)

    const authCommand = readFileSync(
      'app/modules/auth/actions/commands/process_auth_session_observed_command.ts',
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
      'app/composition/adapters/audit_auth_session_evidence_writer_adapter.ts',
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
      'app/composition/adapters/lucid_auth_session_evidence_transaction_runner.ts',
      'utf8'
    )
    assert.include(
      transactionAdapter,
      '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
    )
    assert.include(transactionAdapter, '@adonisjs/lucid/services/db')

    const eventComposition = readFileSync(
      'app/composition/auth_session_observed_composition.ts',
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

  test('organization project lifecycle crosses a consumer-owned port', ({ assert }) => {
    assert.isFalse(
      existsSync('app/modules/organizations/projects/actions/command/create_project_command.ts'),
      'the forwarding Organizations create-project command must remain eliminated'
    )

    const deleteCommand = readFileSync(
      'app/modules/organizations/directory/actions/command/delete_organization_command.ts',
      'utf8'
    )
    assert.include(
      deleteCommand,
      '#modules/organizations/directory/actions/ports/outbound/organization_project_lifecycle_reader'
    )
    assert.notMatch(deleteCommand, /#modules\/projects\//)

    const adapter = readFileSync(
      'app/composition/adapters/organization_project_lifecycle_adapter.ts',
      'utf8'
    )
    assert.include(
      adapter,
      '#modules/organizations/directory/actions/ports/outbound/organization_project_lifecycle_reader'
    )
    assert.include(adapter, '#modules/projects/infra/repositories/read/project_model_queries')

    const projectCreatorAdapter = readFileSync(
      'app/composition/adapters/organization_project_creator_adapter.ts',
      'utf8'
    )
    assert.include(
      projectCreatorAdapter,
      '#modules/organizations/projects/actions/ports/outbound/organization_project_creator'
    )
    assert.include(
      projectCreatorAdapter,
      '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
    )

    for (const organizationPresentationFile of [
      'app/modules/organizations/projects/controllers/create_project_controller.ts',
      'app/modules/organizations/projects/controllers/mappers/request/current_project_request_mapper.ts',
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
      'app/composition/adapters/marketplace_project_access_adapter.ts',
      'utf8'
    )
    assert.include(
      marketplaceProjectAccessAdapter,
      '#modules/marketplace/actions/ports/outbound/project_access_port'
    )
    assert.include(
      marketplaceProjectAccessAdapter,
      '#modules/projects/actions/queries/get_marketplace_project_access_query'
    )
    assert.notInclude(marketplaceProjectAccessAdapter, 'projectPublicApi')

    const projectConsumerPortsProvider = readFileSync(
      'app/composition/project_consumer_ports_provider.ts',
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
      'app/composition/adapters/inertia_project_directory_adapter.ts',
      'utf8'
    )
    assert.include(
      inertiaProjectAdapter,
      '#modules/http/actions/ports/outbound/inertia_project_directory'
    )
    assert.include(
      inertiaProjectAdapter,
      '#modules/projects/infra/repositories/read/project_model_queries'
    )

    const skillsProjectAdapter = readFileSync(
      'app/composition/adapters/skills_project_access_authorizer_adapter.ts',
      'utf8'
    )
    assert.include(
      skillsProjectAdapter,
      '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'
    )
    assert.include(
      skillsProjectAdapter,
      '#modules/projects/actions/queries/get_user_project_access_query'
    )

    const reviewProjectAdapter = readFileSync(
      'app/composition/adapters/review_project_membership_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      reviewProjectAdapter,
      '#modules/reviews/actions/ports/outbound/review_project_membership_reader'
    )
    assert.include(
      reviewProjectAdapter,
      '#modules/projects/infra/repositories/read/project_member_queries'
    )

    const userWorkHistoryAdapter = readFileSync(
      'app/composition/adapters/user_work_history_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      userWorkHistoryAdapter,
      '#modules/users/actions/ports/outbound/user_work_history_reader'
    )
    assert.include(
      userWorkHistoryAdapter,
      '#modules/projects/infra/repositories/read/project_work_history_queries'
    )
    assert.include(
      userWorkHistoryAdapter,
      '#modules/organizations/members/infra/repositories/read/organization_work_history_queries'
    )
    assert.isFalse(
      existsSync('app/modules/users/actions/ports/user_work_history_reader_impl.ts'),
      'Users work-history concrete default must remain eliminated'
    )

    const organizationExternalDependencies = readFileSync(
      'app/modules/organizations/directory/actions/ports/outbound/organization_external_dependencies.ts',
      'utf8'
    )
    assert.notInclude(organizationExternalDependencies, 'OrganizationProjectTaskReaderWriter')

    for (const outerAdapter of [
      'app/composition/adapters/organization_portfolio_stats_adapter.ts',
      'app/composition/adapters/organization_member_project_offboarding_adapter.ts',
    ]) {
      const source = readFileSync(outerAdapter, 'utf8')
      assert.match(source, /#modules\/organizations\/(?:directory|members)\/actions\/ports\//)
      assert.match(source, /#modules\/projects\/infra\/repositories\//)
      assert.match(source, /#modules\/tasks\/infra\/repositories\//)
    }
  })

  test('task project notification audience is resolved by an outer adapter', ({ assert }) => {
    const revokeCommand = readFileSync(
      'app/modules/tasks/actions/commands/revoke_task_access_command.ts',
      'utf8'
    )
    assert.include(
      revokeCommand,
      '#modules/tasks/actions/ports/outbound/task_project_notification_audience_reader'
    )
    assert.notMatch(revokeCommand, /#modules\/projects\//)

    const outerAdapter = readFileSync(
      'app/composition/adapters/task_project_notification_audience_adapter.ts',
      'utf8'
    )
    assert.include(
      outerAdapter,
      '#modules/tasks/actions/ports/outbound/task_project_notification_audience_reader'
    )
    assert.include(outerAdapter, '#modules/projects/infra/repositories/read/project_member_queries')

    const taskFactory = readFileSync('app/composition/task_action_factory.ts', 'utf8')
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
      'app/composition/create_task_external_dependencies.ts',
      'utf8'
    )
    assert.notMatch(
      taskDependencyFactory,
      /#modules\/(projects|organizations|users|skills|reviews)\//
    )

    const projectAdapter = readFileSync(
      'app/composition/adapters/task_project_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      projectAdapter,
      '#modules/tasks/actions/ports/outbound/task_external_dependencies'
    )
    assert.include(
      projectAdapter,
      '#modules/projects/infra/repositories/read/project_model_queries'
    )

    const permissionAdapter = readFileSync(
      'app/composition/adapters/task_permission_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      permissionAdapter,
      '#modules/tasks/actions/ports/outbound/task_external_dependencies'
    )
    assert.include(
      permissionAdapter,
      '#modules/organizations/members/infra/repositories/organization_user_repository/'
    )
    assert.include(
      permissionAdapter,
      '#modules/projects/infra/repositories/read/project_member_queries'
    )
    assert.notInclude(permissionAdapter, '#modules/users/')

    for (const [outerAdapter, providerComposition] of [
      [
        'app/composition/adapters/task_organization_reader_adapter.ts',
        '#composition/organization_persistence_composition',
      ],
      [
        'app/composition/adapters/task_skill_reader_adapter.ts',
        '#composition/skills_application_composition',
      ],
      [
        'app/composition/adapters/task_user_reader_adapter.ts',
        '#composition/user_application_composition',
      ],
    ] as const) {
      const source = readFileSync(outerAdapter, 'utf8')
      assert.include(source, '#modules/tasks/actions/ports/outbound/task_external_dependencies')
      assert.include(source, providerComposition)
      assert.notMatch(source, /#modules\/(organizations|skills|users)\//)
    }

    const reviewAdapter = readFileSync(
      'app/composition/adapters/task_review_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      reviewAdapter,
      '#modules/tasks/actions/ports/outbound/task_external_dependencies'
    )
    assert.include(reviewAdapter, '#composition/review_public_api_composition')
    assert.include(
      reviewAdapter,
      '#modules/tasks/actions/queries/review_assignment_context_v1_query'
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
      'app/modules/tasks/actions/queries/get_task_audit_logs_query.ts',
      'app/modules/tasks/actions/queries/get_task_detail_query.ts',
      'app/modules/projects/actions/queries/get_project_detail_query.ts',
      'app/modules/projects/actions/queries/get_project_members_query.ts',
    ]) {
      const source = readFileSync(consumerQuery, 'utf8')
      assert.notMatch(source, /#modules\/audit\//)
      assert.notInclude(source, 'auditPublicApi')
    }

    const taskAdapter = readFileSync(
      'app/composition/adapters/task_audit_trail_reader_adapter.ts',
      'utf8'
    )
    assert.include(taskAdapter, '#modules/tasks/actions/ports/outbound/task_audit_trail_reader')
    assert.include(taskAdapter, '#composition/audit_read_composition')
    assert.include(taskAdapter, '#composition/user_application_composition')

    const projectAdapter = readFileSync(
      'app/composition/adapters/project_audit_activity_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      projectAdapter,
      '#modules/projects/actions/ports/outbound/project_audit_activity_reader'
    )
    assert.include(projectAdapter, '#composition/audit_read_composition')
    assert.include(projectAdapter, '#composition/user_application_composition')

    const auditReadRepository = readFileSync(
      'app/modules/audit/infra/repositories/read/audit_log_read_repository.ts',
      'utf8'
    )
    assert.notMatch(auditReadRepository, /#modules\/users\//)

    const auditReadQueries = [
      'app/modules/audit/actions/queries/list_audit_logs_by_entity_query.ts',
      'app/modules/audit/actions/queries/list_admin_audit_logs_query.ts',
      'app/modules/audit/actions/queries/get_last_audit_activity_by_users_query.ts',
    ].map((path) => readFileSync(path, 'utf8'))
    for (const query of auditReadQueries) {
      assert.include(query, '#modules/audit/actions/ports/outbound/audit_log_read_repository')
      assert.notMatch(query, /#modules\/(projects|tasks|users)\//)
      assert.notInclude(query, '@adonisjs/lucid')
    }

    const auditReadComposition = readFileSync('app/composition/audit_read_composition.ts', 'utf8')
    assert.include(auditReadComposition, '#modules/audit/actions/queries/')
    assert.include(auditReadComposition, '#modules/audit/domain/audit_change_formatter')
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
      'app/modules/admin/audit_logs/actions/ports/outbound/admin_audit_event_reader.ts',
      'utf8'
    )
    const adminProjectionPort = readFileSync(
      'app/modules/admin/audit_logs/actions/ports/outbound/admin_audit_projection_reader.ts',
      'utf8'
    )
    const adminQuery = readFileSync(
      'app/modules/admin/audit_logs/actions/query/list_audit_logs_query.ts',
      'utf8'
    )
    const auditReadRepository = readFileSync(
      'app/modules/audit/infra/repositories/read/audit_log_read_repository.ts',
      'utf8'
    )
    const auditReadQueries = [
      'app/modules/audit/actions/queries/list_audit_logs_by_entity_query.ts',
      'app/modules/audit/actions/queries/list_admin_audit_logs_query.ts',
      'app/modules/audit/actions/queries/get_last_audit_activity_by_users_query.ts',
    ].map((path) => readFileSync(path, 'utf8'))
    const auditReadComposition = readFileSync('app/composition/audit_read_composition.ts', 'utf8')
    const eventAdapter = readFileSync(
      'app/composition/adapters/admin_audit_event_reader_adapter.ts',
      'utf8'
    )
    const projectionAdapter = readFileSync(
      'app/composition/adapters/admin_audit_projection_reader_adapter.ts',
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
          'app/modules/admin/audit_logs/actions/ports/outbound/admin_audit_event_reader.ts',
          'app/modules/admin/audit_logs/actions/ports/outbound/admin_audit_projection_reader.ts',
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
      '#modules/admin/audit_logs/actions/ports/outbound/admin_audit_event_reader'
    )
    assert.include(eventAdapter, '#composition/audit_read_composition')
    assert.notMatch(eventAdapter, /#modules\/audit\/(actions|infra)\//)
    assert.include(
      projectionAdapter,
      '#modules/admin/audit_logs/actions/ports/outbound/admin_audit_projection_reader'
    )
    assert.notInclude(projectionAdapter, '@adonisjs/lucid')
    for (const table of ['organizations', 'projects', 'tasks']) {
      assert.notInclude(projectionAdapter, `.from('${table}')`)
    }
    assert.include(
      projectionAdapter,
      '#modules/organizations/directory/infra/repositories/read/organization_audit_target_queries'
    )
    assert.include(
      projectionAdapter,
      '#modules/projects/infra/repositories/read/project_audit_target_queries'
    )
    assert.include(
      projectionAdapter,
      '#modules/tasks/infra/repositories/read/task_audit_target_queries'
    )
  })

  test('notification transactional staging crosses consumer-owned ports and outer wiring only', ({
    assert,
  }) => {
    for (const eliminatedPath of [
      'app/modules/notifications/public_contracts/notification_creator.ts',
      'app/modules/tasks/bootstrap/task_application_capability_composition.ts',
    ]) {
      assert.isFalse(existsSync(eliminatedPath), `${eliminatedPath} must remain eliminated`)
    }

    const commandContract = readFileSync(
      'app/modules/notifications/public_contracts/notification_command.ts',
      'utf8'
    )
    assert.notMatch(
      commandContract,
      /#modules\/notifications\/(actions|bootstrap|domain|infra|services)\//
    )
    assert.notMatch(commandContract, /@adonisjs\/|@vinejs\/|@poppinss\//)

    assert.deepEqual(
      scanProductionImportSpecifiers(
        [
          'app/modules/tasks',
          'app/modules/organizations',
          'app/modules/projects',
          'app/modules/users',
        ],
        [
          /^#modules\/notifications\/(actions|bootstrap|domain|infra|services)(?:\/|$)/,
          /^#modules\/notifications\/public_contracts\/notification_creator$/,
        ]
      ),
      []
    )

    const outerAdapter = readFileSync(
      'app/composition/adapters/notification_transaction_stager_adapter.ts',
      'utf8'
    )
    for (const consumerPort of [
      '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager',
      '#modules/projects/actions/ports/outbound/project_notification_stager',
      '#modules/tasks/actions/ports/outbound/task_notification_stager',
      '#modules/users/actions/ports/outbound/user_notification_stager',
    ]) {
      assert.include(outerAdapter, consumerPort)
    }
    assert.notMatch(outerAdapter, /#modules\/notifications\//)

    const notificationComposition = readFileSync(
      'app/composition/notification_composition.ts',
      'utf8'
    )
    assert.include(
      notificationComposition,
      '#modules/notifications/actions/commands/accept_notification_command'
    )
    assert.include(notificationComposition, 'NotificationTransactionStagerAdapter')
    assert.include(notificationComposition, 'acceptNotificationCommand')
    assert.isFalse(
      existsSync('app/modules/notifications/actions/services/notification_public_api.ts'),
      'the internal notification action-service facade must remain eliminated'
    )
  })

  test('admin review disputes cross the pure capability and outer adapter only', ({ assert }) => {
    assert.isFalse(
      existsSync('app/modules/reviews/public_contracts/review_admin_disputes.ts'),
      'the executable Reviews public facade must remain eliminated'
    )

    const contract = readFileSync(
      'app/modules/reviews/public_contracts/admin_review_dispute_capability.ts',
      'utf8'
    )
    assert.notMatch(contract, /#modules\/reviews\/(actions|infra|services|bootstrap|domain)\//)
    assert.notMatch(contract, /@adonisjs\/|@vinejs\/|@poppinss\//)

    const adminController = readFileSync(
      'app/modules/admin/disputes/controllers/admin_disputes_controller.ts',
      'utf8'
    )
    assert.notInclude(adminController, 'ai_dispute_evaluations')
    assert.notInclude(adminController, '@adonisjs/lucid/services/db')
    assert.notMatch(adminController, /#modules\/reviews\/actions\//)

    const outerAdapter = readFileSync(
      'app/composition/adapters/reviews_admin_dispute_read_adapter.ts',
      'utf8'
    )
    assert.include(
      outerAdapter,
      '#modules/admin/disputes/actions/ports/outbound/review_admin_dispute_read_port'
    )
    assert.include(
      outerAdapter,
      '#modules/reviews/public_contracts/admin_review_dispute_capability'
    )
  })

  test('business modules do not import HTTP DTO buckets or legacy validation rules', ({
    assert,
  }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules'],
        [/^#modules\/http\/actions\/dtos\//, /^#types\/validation_rules$/]
      ).filter((reference) => !reference.file.includes('/modules/http/')),
      []
    )
  })

  test('canonical runtime module-boundary guard accepts only tracked debt', () => {
    runArchitectureGuard('scripts/check_module_domain_boundary.mjs')
  })

  test('canonical exception boundary guard rejects raw and diagnostic HTTP failures', () => {
    runArchitectureGuard('scripts/check_exception_boundaries.mjs')
  })

  test('exception boundary guard rejects a raw controller error', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/controllers'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(probe, 'export function probe() { throw new Error("raw boundary failure") }\n')

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects unsanitized command diagnostic logs', ({ assert }) => {
    const probe = 'commands/__exception_boundary_probe.ts'
    writeFileSync(
      probe,
      [
        'declare const logger: { error(message: string): void }',
        'export class Probe {',
        '  logger = logger',
        '  run(error: unknown) {',
        '    this.logger.error(error instanceof Error ? error.message : String(error))',
        '  }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync(probe, { force: true })
    }
  })

  test('exception boundary guard rejects unsanitized loggerService diagnostics', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const loggerService: { error(message: string, data: object): void }',
        'export function probe(error: unknown) {',
        '  loggerService.error("dependency failed", {',
        '    error: error instanceof Error ? error.message : String(error),',
        '  })',
        '}',
      ].join('\n')
    )
  })
})
