import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { UserWorkHistoryReaderAdapter } from '#composition/adapters/users/user_work_history_reader_adapter'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  ProjectRole,
  ProjectVisibility,
} from '#modules/projects/public_contracts/project_constants'
import GetUserWorkHistoryQuery, {
  GetUserWorkHistoryDTO,
} from '#modules/users/actions/queries/talent/get_user_work_history_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import { listVerifiedDemonstratedWorkByUser, listDemonstratedWorkByUser  } from '#modules/users/infra/repositories/read/user_work_history_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { seedPublicTalentAccomplishment } from '#tests/helpers/seed_public_talent_accomplishment'

test.group('Integration | Get user work history query', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('isolates self and public history while excluding pending organizations', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create()
    const subject = await UserFactory.create()
    const viewer = await UserFactory.create()
    const approvedOrganization = await OrganizationFactory.create({
      name: 'Approved organization',
      owner_id: owner.id,
    })
    const pendingOrganization = await OrganizationFactory.create({
      name: 'Pending organization',
      owner_id: owner.id,
    })

    await OrganizationUserFactory.create({
      organization_id: approvedOrganization.id,
      user_id: subject.id,
      status: OrganizationUserStatus.APPROVED,
    })
    await OrganizationUserFactory.create({
      organization_id: pendingOrganization.id,
      user_id: subject.id,
      status: OrganizationUserStatus.PENDING,
    })

    const publicProject = await ProjectFactory.create({
      name: 'Public project',
      organization_id: approvedOrganization.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: ProjectVisibility.PUBLIC,
    })
    const teamProject = await ProjectFactory.create({
      name: 'Team project',
      organization_id: approvedOrganization.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: ProjectVisibility.TEAM,
    })
    const privateProject = await ProjectFactory.create({
      name: 'Private project',
      organization_id: approvedOrganization.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: ProjectVisibility.PRIVATE,
    })

    await Promise.all(
      [publicProject, teamProject, privateProject].map((project) =>
        ProjectMemberFactory.create({
          project_id: project.id,
          user_id: subject.id,
          project_role: ProjectRole.MEMBER,
        })
      )
    )

    const publicAssignmentId = randomUUID()
    const privateAssignmentId = randomUUID()
    await db.table('user_work_history').multiInsert([
      {
        user_id: subject.id,
        task_id: publicProject.id,
        task_assignment_id: publicAssignmentId,
        organization_id: approvedOrganization.id,
        project_id: publicProject.id,
        task_title: 'Public API design',
        task_type: 'architecture_design',
        business_domain: 'payments',
        problem_category: 'scalability',
        role_in_task: 'architect',
        collaboration_type: 'cross_team',
        difficulty: 'hard',
        overall_quality_score: 5,
        was_on_time: true,
        is_public: true,
      },
      {
        user_id: subject.id,
        task_id: privateProject.id,
        task_assignment_id: privateAssignmentId,
        organization_id: approvedOrganization.id,
        project_id: privateProject.id,
        task_title: 'Private incident response',
        task_type: 'debugging',
        role_in_task: 'contributor',
        is_public: false,
      },
    ])
    const publishedSource = await seedPublicTalentAccomplishment({
      userId: subject.id,
      organizationId: approvedOrganization.id,
      seedKey: 'profile-public-projection',
    })
    const publication = await client
      .post(`/api/v1/accomplishments/${publishedSource.accomplishmentId}/publication`)
      .loginAs(subject)
      .json({
        idempotencyKey: 'profile-public-projection',
        expectedSourceCanonicalHash: publishedSource.canonicalHash,
        expectedLifecycleRevisionId: publishedSource.lifecycleRevisionId,
        confirmed: true,
      })
    publication.assertStatus(201)

    const workHistoryReader = new UserWorkHistoryReaderAdapter()
    const selfResult = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext(subject.id),
      workHistoryReader
    ).handle(new GetUserWorkHistoryDTO(subject.id))
    const publicResult = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext(viewer.id),
      workHistoryReader
    ).handle(new GetUserWorkHistoryDTO(subject.id))

    assert.deepEqual(
      selfResult.organizations.map((organization) => organization.org_name),
      ['Approved organization']
    )
    assert.sameMembers(
      selfResult.projects.map((project) => project.project_name),
      ['Public project', 'Team project', 'Private project']
    )
    assert.deepEqual(
      publicResult.projects.map((project) => project.project_name),
      ['Public project']
    )
    assert.equal(publicResult.projects[0]?.org_name, 'Approved organization')
    assert.equal(selfResult.demonstratedWork.length, 3)
    assert.equal(publicResult.demonstratedWork.length, 2)
    const publicVerifiedWork = publicResult.demonstratedWork.find(
      (item) => item.verification.status === 'review_confirmed'
    )
    assert.isDefined(publicVerifiedWork)
    assert.equal(publicVerifiedWork?.action, 'design_and_implement')
    assert.equal(publicVerifiedWork?.object, 'pre_order_api')
    assert.equal(publicVerifiedWork?.ownership, 'primary_owner')
    assert.equal(publicVerifiedWork?.verification.confidence, 'high')
  })

  test('keeps the user predicate when verified work is read inside a transaction', async ({
    assert,
  }) => {
    const subject = await UserFactory.create()
    const otherUser = await UserFactory.create()
    const makeVerifiedRow = (userId: string, assignmentId: string) => ({
      id: randomUUID(),
      projection_key: `profile-transaction-test:${assignmentId}`,
      contract_version: 1,
      schema_version: 'suar.verified_work_accomplishment.v1',
      policy_version: 'accomplishment-policy-v1',
      user_id: userId,
      organization_id: randomUUID(),
      project_id: randomUUID(),
      task_id: randomUUID(),
      task_assignment_id: assignmentId,
      title: `Verified work ${assignmentId}`,
      concise_statement: 'A transaction-scoped verified work row.',
      detailed_statement: null,
      action: 'design',
      object: 'transaction_scope',
      task_type: 'architecture_design',
      business_domain: 'commerce',
      problem_category: 'privacy',
      role: 'primary_owner',
      ownership_level: 'primary_owner',
      autonomy_level: 'independent',
      collaboration_type: 'individual',
      environment: 'test',
      system_area: 'profile',
      scale_summary: 'transaction test',
      verification_method: 'integration_test',
      confidence_score: 0.9,
      confidence_band: 'high',
      evidence_sufficiency: 'adequate',
      lifecycle_state: 'verified',
      visibility: 'public',
      provenance_class: 'native_prework',
      project_context_version_id: null,
      work_package_version_id: null,
      task_specification_version_id: randomUUID(),
      task_contract_version_id: randomUUID(),
      assignment_snapshot_id: randomUUID(),
      completion_report_id: randomUUID(),
      review_workflow_id: randomUUID(),
      task_specification_hash: `sha256:${'1'.repeat(64)}`,
      task_contract_hash: `sha256:${'2'.repeat(64)}`,
      assignment_snapshot_hash: `sha256:${'3'.repeat(64)}`,
      completion_report_hash: `sha256:${'4'.repeat(64)}`,
      review_hash: `sha256:${'5'.repeat(64)}`,
      canonical_hash: `sha256:${'6'.repeat(64)}`,
      canonical_payload: {},
      verified_at: new Date('2026-01-03T00:00:00.000Z'),
    })

    await db
      .table('verified_work_accomplishments')
      .insert([
        makeVerifiedRow(subject.id, randomUUID()),
        makeVerifiedRow(otherUser.id, randomUUID()),
      ])

    const rows = await db.transaction(async (trx) =>
      listVerifiedDemonstratedWorkByUser(subject.id, { trx })
    )

    assert.lengthOf(rows, 1)
    assert.equal(rows[0]?.user_id, subject.id)
  })

  test('removes an unpublished accomplishment from public history while self retains it', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'profile_unpublish_owner' })
    const viewer = await UserFactory.create({ username: 'profile_unpublish_viewer' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'profile-unpublish-cache',
    })

    const published = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'profile-unpublish-cache',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })
    published.assertStatus(201)
    const projection = published.body() as {
      projection?: { id?: string; publicationVersion?: number }
    }
    const projectionId = projection.projection?.id
    const publicationVersion = projection.projection?.publicationVersion
    assert.isString(projectionId)
    assert.equal(publicationVersion, 1)
    if (typeof projectionId !== 'string' || publicationVersion !== 1) return

    const reader = new UserWorkHistoryReaderAdapter()
    const publicQuery = () =>
      new GetUserWorkHistoryQuery(makeSystemUserActionContext(viewer.id), reader).handle(
        new GetUserWorkHistoryDTO(owner.id)
      )
    const before = await publicQuery()
    assert.lengthOf(before.demonstratedWork, 1)

    const unpublished = await client
      .delete(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({ projectionId, publicationVersion, confirmed: true })
    unpublished.assertStatus(200)

    const after = await publicQuery()
    const self = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext(owner.id),
      reader
    ).handle(new GetUserWorkHistoryDTO(owner.id))
    assert.lengthOf(after.demonstratedWork, 0)
    assert.lengthOf(self.demonstratedWork, 1)
  })

  test('returns every storage row so application pagination is not capped at one hundred', async ({
    assert,
  }) => {
    const subject = await UserFactory.create()
    const organizationId = randomUUID()
    const projectId = randomUUID()
    await db.table('user_work_history').multiInsert(
      Array.from({ length: 101 }, (_, index) => ({
        user_id: subject.id,
        task_id: randomUUID(),
        task_assignment_id: randomUUID(),
        organization_id: organizationId,
        project_id: projectId,
        task_title: `Stored work ${index}`,
        is_public: index % 2 === 0,
      }))
    )

    const rows = await listDemonstratedWorkByUser(subject.id)

    assert.lengthOf(rows, 101)
  })
})
