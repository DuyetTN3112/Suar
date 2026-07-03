import { test } from '@japa/runner'

import {
  decideWorkPackagePublication,
  decideProjectContextPublication,
  sanitizeProjectContextJson,
  validateWorkPackageDraft,
} from '#modules/projects/domain/project-context/project_context_rules'

test.group('Unit | Project Context and Work Package rules', () => {
  test('TC-TVA-006 allows an authorized local context and returns an auditable version token', ({
    assert,
  }) => {
    const result = decideProjectContextPublication({
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      current: { activeVersionId: 'context-v1', activeVersionNumber: 1 },
      expectedActiveVersionId: 'context-v1',
      title: 'Pre-order platform context',
      summary: 'Shared security, architecture, and delivery constraints.',
      localCriticalContent: 'All mutating APIs require idempotency keys and audit events.',
      richContent: { type: 'document', text: 'Use OpenAPI 3.1.' },
      confirmed: true,
      supportingReferences: [
        { url: 'https://docs.example.test/pre-order', access: 'authenticated' },
      ],
    })

    assert.isTrue(result.allowed)
    if (result.allowed) {
      assert.equal(result.nextVersionNumber, 2)
      assert.equal(result.versionToken, 'project-1:context:2')
      assert.deepEqual(result.sanitizedRichContent, {
        type: 'document',
        text: 'Use OpenAPI 3.1.',
      })
    }
  })

  test('AR-003 AR-017 blocks link-only, read-only, archived and stale publications with stable codes', ({
    assert,
  }) => {
    const base = {
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      current: { activeVersionId: 'context-v1', activeVersionNumber: 1 },
      expectedActiveVersionId: 'context-v1' as string | null,
      title: 'Pre-order platform context',
      summary: 'Shared constraints.',
      localCriticalContent: 'Critical execution content stored in Suar.',
      richContent: { type: 'document' },
      confirmed: true,
      supportingReferences: [
        { url: 'https://docs.example.test/private', access: 'authenticated' as const },
      ],
    }

    const cases = [
      {
        input: { ...base, localCriticalContent: '   ' },
        code: 'PROJECT_CONTEXT_LOCAL_CONTENT_REQUIRED',
      },
      {
        input: {
          ...base,
          authorization: { ...base.authorization, canManageContext: false },
        },
        code: 'PROJECT_CONTEXT_EDIT_FORBIDDEN',
      },
      {
        input: {
          ...base,
          authorization: { ...base.authorization, projectArchived: true },
        },
        code: 'PROJECT_CONTEXT_PROJECT_ARCHIVED',
      },
      {
        input: { ...base, expectedActiveVersionId: 'context-stale' },
        code: 'PROJECT_CONTEXT_VERSION_CONFLICT',
      },
    ]

    for (const entry of cases) {
      const result = decideProjectContextPublication(entry.input)
      assert.isFalse(result.allowed)
      if (!result.allowed) assert.equal(result.code, entry.code)
    }
  })

  test('requires explicit creator confirmation before publishing either shared context surface', ({
    assert,
  }) => {
    const context = decideProjectContextPublication({
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      current: { activeVersionId: null, activeVersionNumber: 0 },
      expectedActiveVersionId: null,
      title: 'Context',
      summary: 'Summary',
      localCriticalContent: 'Critical local content',
      richContent: {},
      confirmed: false,
      supportingReferences: [],
    })
    assert.isFalse(context.allowed)
    if (!context.allowed) assert.equal(context.code, 'PROJECT_CONTEXT_CONFIRMATION_REQUIRED')

    const workPackage = decideWorkPackagePublication({
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      workPackage: {
        id: 'package-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        state: 'active',
        activeVersionId: null,
        activeVersionNumber: 0,
      },
      expectedActiveVersionId: null,
      projectContextVersionId: null,
      projectContextVersionValid: true,
      draft: {
        projectId: 'project-1',
        organizationId: 'org-1',
        key: 'PKG',
        title: 'Package',
        summary: 'Package summary',
      },
      localCriticalContent: 'Critical package content',
      richContent: {},
      confirmed: false,
    })
    assert.isFalse(workPackage.allowed)
    if (!workPackage.allowed) assert.equal(workPackage.code, 'WORK_PACKAGE_CONFIRMATION_REQUIRED')
  })

  test('AR-007 recursively removes executable rich-content keys without discarding safe text', ({
    assert,
  }) => {
    assert.deepEqual(
      sanitizeProjectContextJson({
        type: 'document',
        onclick: 'steal()',
        script: '<script>steal()</script>',
        sections: [
          { title: 'Safe', text: 'Keep me', onload: 'steal()' },
          { title: 'Nested', metadata: { href: 'javascript:alert(1)', label: 'Keep label' } },
        ],
      }),
      {
        type: 'document',
        sections: [
          { title: 'Safe', text: 'Keep me' },
          { title: 'Nested', metadata: { label: 'Keep label' } },
        ],
      }
    )
  })

  test('AR-007 rejects executable markup hidden inside rich-content strings', ({ assert }) => {
    const context = decideProjectContextPublication({
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      current: { activeVersionId: null, activeVersionNumber: 0 },
      expectedActiveVersionId: null,
      title: 'Context',
      summary: 'Summary',
      localCriticalContent: 'Critical local content',
      richContent: { text: '<img src=x onerror="alert(1)">' },
      confirmed: true,
      supportingReferences: [],
    })
    assert.isFalse(context.allowed)
    if (!context.allowed) assert.equal(context.code, 'PROJECT_CONTEXT_RICH_CONTENT_INVALID')

    const workPackage = decideWorkPackagePublication({
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      workPackage: {
        id: 'package-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        state: 'active',
        activeVersionId: null,
        activeVersionNumber: 0,
      },
      expectedActiveVersionId: null,
      projectContextVersionId: null,
      projectContextVersionValid: true,
      draft: {
        projectId: 'project-1',
        organizationId: 'org-1',
        key: 'PKG',
        title: 'Package',
        summary: 'Package summary',
      },
      localCriticalContent: 'Critical package content',
      richContent: { html: '<script>alert(1)</script>' },
      confirmed: true,
    })
    assert.isFalse(workPackage.allowed)
    if (!workPackage.allowed) assert.equal(workPackage.code, 'PROJECT_CONTEXT_RICH_CONTENT_INVALID')
  })

  test('AR-012 AR-013 keeps Work Package optional but rejects empty and cross-project drafts', ({
    assert,
  }) => {
    const absent = validateWorkPackageDraft(null, {
      projectId: 'project-1',
      organizationId: 'org-1',
    })
    const valid = validateWorkPackageDraft(
      {
        projectId: 'project-1',
        organizationId: 'org-1',
        key: 'PREORDER',
        title: 'Pre-order lifecycle',
        summary: 'Shared feature behavior.',
      },
      { projectId: 'project-1', organizationId: 'org-1' }
    )
    const invalid = [
      validateWorkPackageDraft(
        {
          projectId: 'project-1',
          organizationId: 'org-1',
          key: '',
          title: '',
          summary: '',
        },
        { projectId: 'project-1', organizationId: 'org-1' }
      ),
      validateWorkPackageDraft(
        {
          projectId: 'project-2',
          organizationId: 'org-1',
          key: 'PREORDER',
          title: 'Wrong project',
          summary: 'Must not inherit across projects.',
        },
        { projectId: 'project-1', organizationId: 'org-1' }
      ),
    ]

    assert.isTrue(absent.allowed)
    assert.isTrue(valid.allowed)
    for (const result of invalid) assert.isFalse(result.allowed)
  })

  test('publishes a local Work Package version with deterministic precedence inputs', ({
    assert,
  }) => {
    const result = decideWorkPackagePublication({
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      workPackage: {
        id: 'package-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        state: 'active',
        activeVersionId: 'package-version-1',
        activeVersionNumber: 1,
      },
      expectedActiveVersionId: 'package-version-1',
      projectContextVersionId: 'context-version-2',
      projectContextVersionValid: true,
      draft: {
        projectId: 'project-1',
        organizationId: 'org-1',
        key: 'PREORDER',
        title: 'Pre-order lifecycle',
        summary: 'Shared feature execution context.',
      },
      localCriticalContent: 'Reserve stock before payment authorization.',
      richContent: { type: 'document', script: 'remove-me', text: 'Keep me' },
      confirmed: true,
    })

    assert.isTrue(result.allowed)
    if (result.allowed) {
      assert.equal(result.nextVersionNumber, 2)
      assert.equal(result.versionToken, 'project-1:work-package:package-1:2')
      assert.deepEqual(result.sanitizedRichContent, { type: 'document', text: 'Keep me' })
    }
  })

  test('blocks link-only, cross-tenant, archived, stale and invalid inherited context packages', ({
    assert,
  }) => {
    const base = {
      authorization: {
        actorId: 'actor-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        canManageContext: true,
        projectArchived: false,
      },
      workPackage: {
        id: 'package-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        state: 'active' as const,
        activeVersionId: 'package-version-1',
        activeVersionNumber: 1,
      },
      expectedActiveVersionId: 'package-version-1' as string | null,
      projectContextVersionId: 'context-version-2',
      projectContextVersionValid: true,
      draft: {
        projectId: 'project-1',
        organizationId: 'org-1',
        key: 'PREORDER',
        title: 'Pre-order lifecycle',
        summary: 'Shared feature execution context.',
      },
      localCriticalContent: 'Reserve stock before payment authorization.',
      richContent: { type: 'document' },
      confirmed: true,
    }
    const cases = [
      {
        input: { ...base, localCriticalContent: '  ' },
        code: 'WORK_PACKAGE_LOCAL_CONTENT_REQUIRED',
      },
      {
        input: {
          ...base,
          workPackage: { ...base.workPackage, organizationId: 'org-2' },
        },
        code: 'WORK_PACKAGE_SCOPE_MISMATCH',
      },
      {
        input: {
          ...base,
          workPackage: { ...base.workPackage, state: 'archived' as const },
        },
        code: 'WORK_PACKAGE_ARCHIVED',
      },
      {
        input: { ...base, expectedActiveVersionId: 'stale-version' },
        code: 'WORK_PACKAGE_VERSION_CONFLICT',
      },
      {
        input: { ...base, projectContextVersionValid: false },
        code: 'WORK_PACKAGE_PROJECT_CONTEXT_INVALID',
      },
    ]

    for (const scenario of cases) {
      const result = decideWorkPackagePublication(scenario.input)
      assert.isFalse(result.allowed)
      if (!result.allowed) assert.equal(result.code, scenario.code)
    }
  })
})
