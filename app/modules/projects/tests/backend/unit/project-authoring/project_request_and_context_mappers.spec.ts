import { test } from '@japa/runner'

import { fakeRequest } from '../support/project_controller_mappers_test_support.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { UpdateProjectDTO } from '#modules/projects/actions/dtos/request/update_project_dto'
import {
  buildAddProjectMemberDTO,
  buildCreateProjectDTO,
  buildDeleteProjectDTO,
  buildOrganizationProjectsListInput,
  buildProjectsListDTO,
  buildUpdateProjectMemberDTO,
} from '#modules/projects/controllers/mappers/request/project-context/project_request_mapper'
import { mapProjectContextPageProjection } from '#modules/projects/domain/project-context/project_context_page_projection'
import type { ProjectContextFactV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

test.group('Unit | Project Controller Mappers - Request & Context', () => {
  test('project context page projection keeps readable context and strips internal provenance', ({
    assert,
  }) => {
    const fact: ProjectContextFactV1 = {
      schemaVersion: 'suar.project_context_fact.v1',
      projectId: 'project-1',
      organizationId: 'org-1',
      activeVersionId: 'context-version-2',
      activeVersionNumber: 2,
      versionToken: 'project-1:context:2',
      context: {
        schemaVersion: 'suar.project_context_version.v1',
        id: 'context-version-2',
        organizationId: 'org-1',
        projectId: 'project-1',
        versionNumber: 2,
        title: 'Checkout reliability',
        summary: 'The team owns checkout reliability for the next release.',
        richContent: '<p>Keep payment retries observable.</p>',
        plainTextProjection: 'Keep payment retries observable.',
        structuredDefaults: { internal: 'do not expose' },
        activeFrom: '2026-08-01T00:00:00.000Z',
        retiredAt: null,
        createdBy: 'user-secret',
        confirmedBy: 'reviewer-secret',
        changeClass: 'material_scope',
        changeReason: 'Quarterly refresh',
        privacyClassification: 'internal',
        contentHash: 'sha256:secret',
        sourceProvenance: {
          class: 'native_prework',
          sourceType: 'authored',
          sourceReferenceIds: ['source-secret'],
          confirmedBy: 'reviewer-secret',
          confirmedAt: '2026-08-01T00:00:00.000Z',
        },
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    }

    const projection = mapProjectContextPageProjection(fact)

    assert.deepEqual(projection, {
      active_version_id: 'context-version-2',
      active_version_number: 2,
      context: {
        id: 'context-version-2',
        version_number: 2,
        title: 'Checkout reliability',
        summary: 'The team owns checkout reliability for the next release.',
        rich_content: '<p>Keep payment retries observable.</p>',
        plain_text_projection: 'Keep payment retries observable.',
        active_from: '2026-08-01T00:00:00.000Z',
        retired_at: null,
        privacy_classification: 'internal',
        created_at: '2026-08-01T00:00:00.000Z',
      },
    })

    assert.isUndefined((projection?.context as Record<string, unknown>)['sourceProvenance'])
    assert.isUndefined((projection?.context as Record<string, unknown>)['createdBy'])
    assert.isUndefined((projection?.context as Record<string, unknown>)['confirmedBy'])
    assert.isUndefined((projection?.context as Record<string, unknown>)['contentHash'])
    assert.isUndefined((projection?.context as Record<string, unknown>)['structuredDefaults'])
    const viewerProjection = mapProjectContextPageProjection(fact, {
      includeConcurrencyFence: false,
    })
    assert.isNull(viewerProjection?.active_version_id)
    assert.equal(viewerProjection?.context?.title, 'Checkout reliability')
    assert.isNull(mapProjectContextPageProjection({ ...fact, context: null }))
    assert.isNull(mapProjectContextPageProjection(null))
  })

  test('project request mappers normalize list filters and delete payloads for controller adapters', ({
    assert,
  }) => {
    const listDto = buildProjectsListDTO(
      fakeRequest({
        page: '0',
        limit: '15',
        search: 'alpha',
        visibility: 'team',
        sort_by: 'name',
        sort_order: 'asc',
      }) as never,
      'org-1'
    )

    assert.equal(listDto.page, 1)
    assert.equal(listDto.limit, 15)
    assert.equal(listDto.organization_id, 'org-1')
    assert.equal(listDto.search, 'alpha')
    assert.equal(listDto.visibility, 'team')
    assert.equal(listDto.sort_by, 'name')
    assert.equal(listDto.sort_order, 'asc')

    const orgListInput = buildOrganizationProjectsListInput(
      fakeRequest({
        page: '0',
        limit: '999',
        search: ' beta ',
        status: 'active',
      }) as never
    )

    assert.deepEqual(orgListInput, {
      page: 1,
      perPage: 100,
      search: ' beta ',
      status: 'active',
    })

    const createDto = buildCreateProjectDTO(
      fakeRequest({
        name: 'Project Camel',
        status: 'in_progress',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        managerId: 'manager-1',
        businessDomains: ['saas', 'security', 'saas'],
      }) as never,
      'org-1'
    )

    assert.equal(createDto.organization_id, 'org-1')
    assert.equal(createDto.name, 'Project Camel')
    assert.equal(createDto.manager_id, 'manager-1')
    assert.isNotNull(createDto.start_date)
    assert.isNotNull(createDto.end_date)
    assert.deepEqual(createDto.business_domains, ['saas', 'security'])

    const deleteDto = buildDeleteProjectDTO(
      fakeRequest({
        reason: '  cleanup stale project  ',
        permanent: 'true',
      }) as never,
      'project-1',
      'org-1'
    )

    assert.equal(deleteDto.project_id, 'project-1')
    assert.equal(deleteDto.reason, 'cleanup stale project')
    assert.isTrue(deleteDto.permanent)
    assert.equal(deleteDto.currentOrganizationId, 'org-1')
    assert.equal(deleteDto.current_organization_id, 'org-1')
  })

  test('project business domains accept camelCase input, normalize duplicates, and reject unknown values', ({
    assert,
  }) => {
    const updateDto = new UpdateProjectDTO({
      project_id: 'project-1',
      business_domains: ['fintech', 'security', 'fintech'],
    })

    assert.deepEqual(updateDto.business_domains, ['fintech', 'security'])
    assert.deepEqual(updateDto.getUpdatedFields(), ['business_domains'])
    assert.deepEqual(updateDto.toObject(), { business_domains: ['fintech', 'security'] })
    assert.throws(
      () => new UpdateProjectDTO({ project_id: 'project-1', business_domains: ['not-a-domain'] }),
      ValidationException,
      'Lĩnh vực Project không hợp lệ: not-a-domain'
    )
  })

  test('project creation mapper rejects missing project names', ({ assert }) => {
    assert.throws(
      () =>
        buildCreateProjectDTO(
          fakeRequest({
            name: '   ',
          }) as never,
          'org-1'
        ),
      ValidationException,
      'Tên dự án là bắt buộc'
    )
  })

  test('project member request mappers normalize camelCase professional role aliases', ({
    assert,
  }) => {
    const addDto = buildAddProjectMemberDTO(
      fakeRequest({
        projectId: 'project-1',
        userId: 'user-1',
        projectRole: 'project_member',
        projectProfessionalRoleId: 'role-1',
      }) as never
    )
    const updateDto = buildUpdateProjectMemberDTO(
      fakeRequest({
        projectId: 'project-1',
        projectRole: 'project_manager',
        projectProfessionalRoleId: 'role-2',
      }) as never,
      'user-2'
    )

    assert.equal(addDto.project_professional_role_id, 'role-1')
    assert.equal(updateDto.project_professional_role_id, 'role-2')
  })

  test('project list mapper accepts camelCase query aliases for reviewer-facing API filters', ({
    assert,
  }) => {
    const listDto = buildProjectsListDTO(
      fakeRequest({
        creatorId: 'creator-1',
        managerId: 'manager-1',
        sortBy: 'name',
        sortOrder: 'asc',
      }) as never,
      'org-1'
    )

    assert.equal(listDto.creator_id, 'creator-1')
    assert.equal(listDto.manager_id, 'manager-1')
    assert.equal(listDto.sort_by, 'name')
    assert.equal(listDto.sort_order, 'asc')
  })
})
