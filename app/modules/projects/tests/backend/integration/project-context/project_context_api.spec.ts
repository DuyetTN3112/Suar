import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { cleanupTestData } from '#tests/helpers/factories'
import { ProjectFactory } from '#tests/helpers/factories/project_task'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories/user_org'

/**
 * WP-28 integration: a real organization owner authors shared Project Context
 * through the HTTP boundary, and an unrelated member cannot.
 */
async function seedOwnedProject(orgRole: string) {
  const owner = await UserFactory.create()
  const organization = await OrganizationFactory.create({ owner_id: owner.id })
  await OrganizationUserFactory.create({
    organization_id: organization.id,
    user_id: owner.id,
    org_role: orgRole,
  })
  const project = await ProjectFactory.create({
    organization_id: organization.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  return { owner, organization, project }
}

function contextBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Security and definition of done',
    summary: 'Shared engineering context for every task in this project.',
    plainTextProjection:
      'All endpoints require authentication. Definition of done includes tests and review.',
    richContent: {},
    structuredDefaults: {},
    supportingReferences: [],
    confirmed: true,
    changeClass: 'initial',
    privacyClassification: 'internal',
    ...overrides,
  }
}

function workPackageBody(overrides: Record<string, unknown> = {}) {
  return {
    workPackageId: null,
    expectedActiveVersionId: null,
    projectContextVersionId: null,
    key: 'PREORDER',
    title: 'Pre-order lifecycle',
    summary: 'Shared feature context.',
    plainTextProjection: 'Reserve stock before payment authorization.',
    richContent: {},
    structuredOverrides: {},
    confirmed: true,
    changeClass: 'initial',
    changeReason: null,
    privacyClassification: 'internal',
    sourceProvenance: {
      class: 'native_prework',
      sourceType: 'authored',
      sourceReferenceIds: [],
    },
    ...overrides,
  }
}

test.group('Integration | Project Context API', (group) => {
  group.each.teardown(async () => {
    await cleanupTestData()
  })

  test('returns a privacy-safe authoring selector only to project viewers', async ({
    client,
    assert,
  }) => {
    const { owner, organization, project } = await seedOwnedProject('org_owner')

    const visible = await client
      .get(`/api/v1/projects/${project.id}/task-authoring-context`)
      .loginAs(owner)

    visible.assertStatus(200)
    const body = visible.body() as {
      data: {
        projectId: string
        activeProjectContext: null
        workPackages: unknown[]
        actorId?: string
        contentHash?: string
        sourceProvenance?: unknown
      }
    }
    assert.equal(body.data.projectId, project.id)
    assert.isNull(body.data.activeProjectContext)
    assert.deepEqual(body.data.workPackages, [])
    assert.notProperty(body.data, 'actorId')
    assert.notProperty(body.data, 'contentHash')
    assert.notProperty(body.data, 'sourceProvenance')

    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: member.id,
      org_role: 'org_member',
    })

    const denied = await client
      .get(`/api/v1/projects/${project.id}/task-authoring-context`)
      .loginAs(member)

    denied.assertStatus(403)
  })

  test('an organization owner publishes the first Project Context version', async ({
    client,
    assert,
  }) => {
    const { owner, project } = await seedOwnedProject('org_owner')

    const response = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(owner)
      .json(contextBody())

    response.assertStatus(201)
    const body = response.body() as {
      contextVersion: { id: string; versionNumber: number; contentHash: string; projectId: string }
    }

    assert.equal(body.contextVersion.projectId, project.id)
    assert.equal(body.contextVersion.versionNumber, 1)
    assert.match(body.contextVersion.contentHash, /^sha256:/)

    const stored = await db
      .from('project_context_versions')
      .where('id', body.contextVersion.id)
      .first()
    assert.isNotNull(stored, 'the published version must be durable, not only echoed back')

    const projectRow = (await db.from('projects').where('id', project.id).first()) as {
      active_project_context_version_id: string | null
    }
    assert.equal(
      projectRow.active_project_context_version_id,
      body.contextVersion.id,
      'the project must point at the newly published active version'
    )
  })

  test('publishing twice increments the version and fences a stale expectation', async ({
    client,
    assert,
  }) => {
    const { owner, project } = await seedOwnedProject('org_owner')

    const first = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(owner)
      .json(contextBody())
    first.assertStatus(201)
    const firstId = (first.body() as { contextVersion: { id: string } }).contextVersion.id

    const second = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(owner)
      .json(contextBody({ expectedActiveVersionId: firstId, changeClass: 'editorial' }))
    second.assertStatus(201)
    assert.equal(
      (second.body() as { contextVersion: { versionNumber: number } }).contextVersion.versionNumber,
      2
    )

    const stale = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(owner)
      .json(contextBody({ expectedActiveVersionId: firstId, changeClass: 'editorial' }))

    assert.equal(stale.status(), 409, 'a stale expected version must conflict, not overwrite')
  })

  test('an ordinary organization member cannot publish shared context', async ({ client }) => {
    const { organization, project } = await seedOwnedProject('org_owner')
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: member.id,
      org_role: 'org_member',
    })

    const response = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(member)
      .json(contextBody())

    response.assertStatus(403)
  })

  test('rejects an unconfirmed Project Context before it reaches storage', async ({
    client,
    assert,
  }) => {
    const { owner, project } = await seedOwnedProject('org_owner')

    const response = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(owner)
      .json(contextBody({ confirmed: false }))

    assert.oneOf(response.status(), [400, 422])

    const rows = await db.from('project_context_versions').where('project_id', project.id)
    assert.lengthOf(rows, 0, 'an invalid request must not persist a version')
  })

  test('rejects an unconfirmed Work Package before it reaches storage', async ({
    client,
    assert,
  }) => {
    const { owner, project } = await seedOwnedProject('org_owner')

    const response = await client
      .post(`/api/v1/projects/${project.id}/work-packages`)
      .loginAs(owner)
      .json(workPackageBody({ confirmed: false }))

    assert.oneOf(response.status(), [400, 422])

    const packages = await db.from('work_packages').where('project_id', project.id)
    const versions = await db.from('work_package_versions').where('project_id', project.id)
    assert.lengthOf(packages, 0, 'an unconfirmed package must not create an identity')
    assert.lengthOf(versions, 0, 'an unconfirmed package must not persist a version')
  })

  test('rejects executable markup in rich content at the HTTP boundary', async ({
    client,
    assert,
  }) => {
    const { owner, project } = await seedOwnedProject('org_owner')

    const response = await client
      .post(`/api/v1/projects/${project.id}/context-versions`)
      .loginAs(owner)
      .json(contextBody({ richContent: { text: '<img src=x onerror="alert(1)">' } }))

    assert.oneOf(response.status(), [400, 422])
    assert.lengthOf(
      await db.from('project_context_versions').where('project_id', project.id),
      0,
      'unsafe rich content must not persist a version'
    )
  })
})
