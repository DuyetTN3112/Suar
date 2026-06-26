import { test } from '@japa/runner'

import { mapProjectTaskAuthoringContext } from '#modules/projects/domain/project-context/task_authoring_context_projection'
import type {
  ProjectContextFactV1,
  WorkPackageFactV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

test.group('Task authoring context projection', () => {
  test('keeps the authoring selector privacy-safe and preserves stable package order', ({ assert }) => {
    const context: ProjectContextFactV1 = {
      schemaVersion: 'suar.project_context_fact.v1',
      projectId: 'project-1',
      organizationId: 'org-1',
      activeVersionId: 'context-version-1',
      activeVersionNumber: 3,
      versionToken: 'private-context-token',
      context: {
        schemaVersion: 'suar.project_context_version.v1',
        id: 'context-version-1',
        versionNumber: 3,
        title: 'Checkout context',
        summary: 'Reserve stock before payment.',
        plainTextProjection: 'Internal authoring context.',
        richContent: { secret: 'do-not-send' },
        structuredDefaults: { hidden: true },
        organizationId: 'org-1',
        projectId: 'project-1',
        activeFrom: '2026-08-01T00:00:00.000Z',
        retiredAt: null,
        createdBy: 'actor-secret',
        confirmedBy: 'reviewer-secret',
        changeClass: 'initial',
        privacyClassification: 'internal',
        contentHash: `sha256:${'a'.repeat(64)}`,
        sourceProvenance: {
          class: 'native_prework',
          sourceType: 'authored',
          sourceReferenceIds: ['private-source'],
          confirmedBy: 'reviewer-secret',
          confirmedAt: '2026-08-01T00:00:00.000Z',
        },
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    }
    const packageA: WorkPackageFactV1 = {
      schemaVersion: 'suar.work_package_fact.v1',
      projectId: 'project-1',
      organizationId: 'org-1',
      versionToken: 'private-package-token-a',
      workPackage: {
        id: 'package-a',
        key: 'CHECKOUT',
        title: 'Checkout',
        summary: 'Checkout lifecycle.',
        state: 'active',
        activeVersionId: 'package-version-a',
        organizationId: 'org-1',
        projectId: 'project-1',
        createdBy: 'actor-secret',
        createdAt: '2026-08-01T00:00:00.000Z',
        archivedAt: null,
        schemaVersion: 'suar.work_package.v1',
      },
      activeVersion: {
        id: 'package-version-a',
        workPackageId: 'package-a',
        projectId: 'project-1',
        projectContextVersionId: 'context-version-1',
        versionNumber: 2,
        title: 'Checkout v2',
        summary: 'Reserve stock before payment.',
        plainTextProjection: 'Private package details.',
        richContent: { secret: 'do-not-send' },
        structuredOverrides: { hidden: true },
        authorId: 'actor-secret',
        confirmedBy: 'reviewer-secret',
        changeClass: 'material_scope',
        changeReason: 'Internal detail',
        privacyClassification: 'internal',
        contentHash: `sha256:${'b'.repeat(64)}`,
        sourceProvenance: {
          class: 'native_prework',
          sourceType: 'authored',
          sourceReferenceIds: ['private-source'],
          confirmedBy: 'reviewer-secret',
          confirmedAt: '2026-08-01T00:00:00.000Z',
        },
        createdAt: '2026-08-01T00:00:00.000Z',
        schemaVersion: 'suar.work_package_version.v1',
      },
    }
    const packageB: WorkPackageFactV1 = {
      ...packageA,
      workPackage: { ...packageA.workPackage, id: 'package-b', key: 'AUTH', title: 'Auth' },
      activeVersion: null,
    }

    const projection = mapProjectTaskAuthoringContext(context, [packageA, packageB])
    const serialized = JSON.stringify(projection)

    assert.deepEqual(
      projection.workPackages.map((item) => item.key),
      ['AUTH', 'CHECKOUT']
    )
    assert.equal(projection.activeProjectContext?.id, 'context-version-1')
    assert.equal(projection.workPackages[0]?.status, 'no_active_version')
    assert.equal(projection.workPackages[1]?.activeVersion?.projectContextVersionId, 'context-version-1')
    assert.notInclude(serialized, 'actor-secret')
    assert.notInclude(serialized, 'private-source')
    assert.notInclude(serialized, 'contentHash')
    assert.notInclude(serialized, 'richContent')
    assert.notInclude(serialized, 'structuredOverrides')
  })

  test('represents a project without active context or packages explicitly', ({ assert }) => {
    const projection = mapProjectTaskAuthoringContext(
      {
        schemaVersion: 'suar.project_context_fact.v1',
        projectId: 'project-1',
        organizationId: 'org-1',
        activeVersionId: null,
        activeVersionNumber: 0,
        versionToken: 'project-1:context:0',
        context: null,
      },
      []
    )

    assert.equal(projection.activeProjectContext, null)
    assert.deepEqual(projection.workPackages, [])
  })
})
