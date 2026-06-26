import { test } from '@japa/runner'

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
import {
  mapOrganizationProjectsPageProps,
  mapProjectDetailApiBody,
  mapProjectDetailPageProps,
  mapProjectMutationApiBody,
  mapProjectsIndexPageProps,
  mapRoleStaffingCandidatesApiBody,
} from '#modules/projects/controllers/mappers/response/project-context/project_response_mapper'
import { mapProjectContextPageProjection } from '#modules/projects/domain/project-context/project_context_page_projection'
import type { ProjectContextFactV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}


function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}


test.group('', () => {
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

  test('project response mappers keep page props and api envelopes stable', ({ assert }) => {
    const result = {
      data: [serializable({ id: 'project-1', name: 'Mapped project' })],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      filters: {
        search: 'mapped',
      },
      stats: {
        total_projects: 1,
      },
    }
    const detail = {
      project: { id: 'project-1', name: 'Mapped project' },
      members: [],
      tasks: [],
      permissions: {
        canEdit: true,
      },
    }

    assert.deepEqual(mapProjectsIndexPageProps(result, true), {
      projects: [{ id: 'project-1', name: 'Mapped project' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      filters: result.filters,
      stats: result.stats,
      showOrganizationRequiredModal: true,
    })
    assert.deepEqual(
      mapProjectMutationApiBody(
        serializable({
          id: 'project-1',
          organization_id: 'org-1',
          creator_id: 'user-1',
          manager_id: null,
          owner_id: 'user-1',
          start_date: null,
          end_date: null,
          created_at: null,
          updated_at: null,
        })
      ),
      {
        data: {
          id: 'project-1',
          organizationId: 'org-1',
          creatorId: 'user-1',
          managerId: undefined,
          ownerId: 'user-1',
          startDate: undefined,
          endDate: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        },
      }
    )
    assert.deepEqual(mapProjectDetailPageProps(detail), detail)
    assert.deepEqual(mapProjectDetailApiBody({
      project_context: {
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
      },
      project: {
        id: 'project-1',
        name: 'Mapped project',
        description: null,
        organization_id: 'org-1',
        organization_name: 'Org',
        creator_id: 'user-1',
        creator_name: 'alice',
        manager_id: null,
        manager_name: null,
        owner_id: 'user-1',
        owner_name: 'alice',
        start_date: null,
        end_date: null,
        status: 'active',
        visibility: 'team',
        business_domains: [],
        created_at: null,
        updated_at: null,
      },
      members: [
        {
          user_id: 'user-1',
          username: 'duyet',
          email: 'duyet@example.com',
          role: 'project_member',
          project_professional_role_id: 'role-1',
          professional_role_name: 'Backend Lead',
          professional_role_code: 'backend_lead',
          joined_at: new Date('2026-07-01T00:00:00.000Z'),
          task_count: 3,
          reviewed_skills_count: 2,
          imported_skills_count: 1,
          under_dispute_skills_count: 1,
          latest_confidence_signal: 'high',
        },
      ],
      tasks: [],
      tasks_summary: {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
      },
      project_reverse_reviews: {
        total_reviews: 2,
        anonymous_reviews: 1,
        average_rating: 4.5,
        recent: [
          {
            id: 'rr-1',
            reviewer_id: 'user-2',
            reviewer_username: 'bob',
            rating: 5,
            comment: 'Project coordination was clear',
            is_anonymous: false,
            created_at: '2026-07-02T00:00:00.000Z',
          },
        ],
      },
      recent_activity: [],
      review_governance: {
        total_sessions: 1,
        pending_sessions: 0,
        overdue_sessions: 0,
        disputed_sessions: 0,
        completed_sessions: 1,
        required_pending_assignments: 0,
        fallback_pending_assignments: 0,
        completion_rate: 100,
      },
      permissions: {
        isOwner: true,
        isManager: false,
        isCreator: true,
        isMember: true,
        canEdit: true,
        canDelete: true,
        canAddMembers: true,
      },
    }), {
      data: {
        projectContext: {
          activeVersionId: 'context-version-2',
          activeVersionNumber: 2,
          context: {
            id: 'context-version-2',
            versionNumber: 2,
            title: 'Checkout reliability',
            summary: 'The team owns checkout reliability for the next release.',
            richContent: '<p>Keep payment retries observable.</p>',
            plainTextProjection: 'Keep payment retries observable.',
            activeFrom: '2026-08-01T00:00:00.000Z',
            retiredAt: null,
            privacyClassification: 'internal',
            createdAt: '2026-08-01T00:00:00.000Z',
          },
        },
        project: {
          id: 'project-1',
          name: 'Mapped project',
          description: null,
          organizationId: 'org-1',
          organizationName: 'Org',
          creatorId: 'user-1',
          creatorName: 'alice',
          managerId: null,
          managerName: null,
          ownerId: 'user-1',
          ownerName: 'alice',
          startDate: null,
          endDate: null,
          status: 'active',
          visibility: 'team',
          businessDomains: [],
          createdAt: null,
          updatedAt: null,
        },
        members: [
          {
            userId: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            role: 'project_member',
            projectProfessionalRoleId: 'role-1',
            professionalRoleName: 'Backend Lead',
            professionalRoleCode: 'backend_lead',
            joinedAt: new Date('2026-07-01T00:00:00.000Z'),
            taskCount: 3,
            reviewedSkillsCount: 2,
            importedSkillsCount: 1,
            underDisputeSkillsCount: 1,
            latestConfidenceSignal: 'high',
          },
        ],
        tasks: [],
        tasksSummary: {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
        },
        projectReverseReviews: {
          totalReviews: 2,
          anonymousReviews: 1,
          averageRating: 4.5,
          recent: [
            {
              id: 'rr-1',
              reviewerId: 'user-2',
              reviewerUsername: 'bob',
              rating: 5,
              comment: 'Project coordination was clear',
              isAnonymous: false,
              createdAt: '2026-07-02T00:00:00.000Z',
            },
          ],
        },
        reviewGovernance: {
          totalSessions: 1,
          pendingSessions: 0,
          overdueSessions: 0,
          disputedSessions: 0,
          completedSessions: 1,
          requiredPendingAssignments: 0,
          fallbackPendingAssignments: 0,
          completionRate: 100,
        },
        recentActivity: [],
        permissions: {
          isOwner: true,
          isManager: false,
          isCreator: true,
          isMember: true,
          canEdit: true,
          canDelete: true,
          canAddMembers: true,
        },
      },
    })
    assert.deepEqual(mapOrganizationProjectsPageProps(detail), detail)

    assert.deepEqual(
      mapRoleStaffingCandidatesApiBody({
        role: {
          id: 'role-1',
          name: 'Backend Lead',
          code: 'backend_lead',
        },
        requirements: [
          {
            skill_id: 'skill-1',
            skill_name: 'TypeScript',
            minimum_level_id: 'lvl-1',
            target_level_id: 'lvl-2',
            assessment_ceiling_level_id: 'lvl-3',
            is_mandatory: true,
            importance: 'critical',
            weight: 2,
          },
        ],
        candidates: [
          {
            user_id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            source: 'project_member',
            match_score: 92,
            matched_skills: 3,
            total_required_skills: 4,
            skill_gaps: ['Leadership'],
            reviewed_skills_count: 2,
            imported_skills_count: 1,
            under_dispute_skills_count: 1,
            latest_confidence_signal: 'high',
          },
        ],
        project_members: [
          {
            user_id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            source: 'project_member',
            match_score: 92,
            matched_skills: 3,
            total_required_skills: 4,
            skill_gaps: ['Leadership'],
            reviewed_skills_count: 2,
            imported_skills_count: 1,
            under_dispute_skills_count: 1,
            latest_confidence_signal: 'high',
          },
        ],
        org_members: [],
      }),
      {
        data: {
          role: {
            id: 'role-1',
            name: 'Backend Lead',
            code: 'backend_lead',
          },
          requirements: [
            {
              skillId: 'skill-1',
              skillName: 'TypeScript',
              minimumLevelId: 'lvl-1',
              targetLevelId: 'lvl-2',
              assessmentCeilingLevelId: 'lvl-3',
              isMandatory: true,
              importance: 'critical',
              weight: 2,
            },
          ],
          candidates: [
            {
              userId: 'user-1',
              username: 'duyet',
              email: 'duyet@example.com',
              source: 'project_member',
              matchScore: 92,
              matchedSkills: 3,
              totalRequiredSkills: 4,
              skillGaps: ['Leadership'],
              reviewedSkillsCount: 2,
              importedSkillsCount: 1,
              underDisputeSkillsCount: 1,
              latestConfidenceSignal: 'high',
            },
          ],
          projectMembers: [
            {
              userId: 'user-1',
              username: 'duyet',
              email: 'duyet@example.com',
              source: 'project_member',
              matchScore: 92,
              matchedSkills: 3,
              totalRequiredSkills: 4,
              skillGaps: ['Leadership'],
              reviewedSkillsCount: 2,
              importedSkillsCount: 1,
              underDisputeSkillsCount: 1,
              latestConfidenceSignal: 'high',
            },
          ],
          orgMembers: [],
        },
      }
    )
  })

})
