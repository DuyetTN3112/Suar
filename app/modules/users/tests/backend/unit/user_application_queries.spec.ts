import { test } from '@japa/runner'

import GetMyInvitationsPageQuery from '#modules/users/actions/queries/invitations/get_my_invitations_page_query'
import GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/talent/get_talent_directory_options_query'
import { assertRecruitingTalentAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'

test.group('User application queries', () => {
  test('recruiting access fails closed before checking talent membership', async ({ assert }) => {
    const calls: string[] = []
    await assert.rejects(
      () =>
        assertRecruitingTalentAccess(
          {
            userId: 'actor-1',
            organizationId: 'organization-1',
            ip: '127.0.0.1',
            userAgent: 'test',
          },
          'talent-1',
          {
            canAccessDirectory: () => {
              calls.push('access')
              return Promise.resolve(false)
            },
            talentBelongsToOrganization: () => {
              calls.push('membership')
              return Promise.resolve(true)
            },
          }
        ),
      /Bạn không có quyền truy cập danh bạ talent/
    )
    assert.deepEqual(calls, ['access'])
  })

  test('talent directory options preserve provider-owned skill and task facts', async ({
    assert,
  }) => {
    const query = new GetTalentDirectoryOptionsQuery({
      listActiveSkills: () =>
        Promise.resolve([
          {
            id: 'skill-1',
            skill_name: 'Architecture',
            category_code: 'software',
            is_active: true,
          },
        ]),
      listRootTasks: (organizationId) => {
        assert.equal(organizationId, 'organization-1')
        return Promise.resolve([{ id: 'task-1', title: 'Design boundary' }])
      },
    })

    assert.deepEqual(await query.execute('organization-1'), {
      availableSkills: [
        {
          id: 'skill-1',
          skill_name: 'Architecture',
          category_code: 'software',
          is_active: true,
        },
      ],
      availableTasks: [{ id: 'task-1', title: 'Design boundary' }],
    })
  })

  test('invitation page query maps the Users-owned projection and canonical pagination', async ({
    assert,
  }) => {
    const query = new GetMyInvitationsPageQuery({
      findPendingByUser: (userId, pagination) => {
        assert.equal(userId, 'user-1')
        assert.deepEqual(pagination, { page: '2', perPage: '10' })
        return Promise.resolve({
          data: [
            {
              organizationId: 'organization-1',
              organizationName: 'Suar',
              organizationLogo: null,
              organizationRole: 'org_member',
              invitedBy: {
                id: 'owner-1',
                username: 'owner',
                email: 'owner@example.com',
                avatarUrl: null,
              },
              createdAt: '2026-07-26T00:00:00.000Z',
            },
          ],
          meta: {
            total: 11,
            perPage: 10,
            currentPage: 2,
            lastPage: 2,
          },
        })
      },
    })

    assert.deepEqual(await query.execute('user-1', { page: '2', perPage: '10' }), {
      invitations: [
        {
          organization_id: 'organization-1',
          organization_name: 'Suar',
          organization_logo: null,
          org_role: 'org_member',
          invited_by: {
            id: 'owner-1',
            username: 'owner',
            email: 'owner@example.com',
            avatar_url: null,
          },
          created_at: '2026-07-26T00:00:00.000Z',
        },
      ],
      pagination: {
        mode: 'offset',
        page: 2,
        perPage: 10,
        total: 11,
        lastPage: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    })
  })
})
