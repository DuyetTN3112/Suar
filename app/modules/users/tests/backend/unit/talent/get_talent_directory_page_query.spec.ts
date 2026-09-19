import { test } from '@japa/runner'

import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/talent/get_talent_directory_page_query'

test.group('Unit | Get Talent Directory Page Query', () => {
  test('uses paginated repository path for default browsing instead of full search fetch', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetTalentDirectoryPageQuery(
      {
        userId: 'recruiter-1',
        organizationId: null,
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      {
        searchTalents: {
          handle: () => {
            calls.push('searchTalents')
            return Promise.resolve([])
          },
        },
        skillCategoryReader: {
          resolveActiveSkillIdsByCategoryCodes: (categoryCodes) => {
            calls.push(`categories:${categoryCodes.join('|')}`)
            return Promise.resolve(['category-skill-1'])
          },
        },
        pageReader: {
          fetchTalentPage: ({
            page,
            perPage,
            q,
            categorySkillIds,
            skillIds,
            businessDomain,
            taskType,
            problemCategory,
            roleInTask,
            techStack,
            domainTags,
            sortBy,
            sortOrder,
          }) => {
            calls.push(
              `page:${page}:${perPage}:${q ?? ''}:${skillIds?.join('|') ?? ''}:${businessDomain ?? ''}:${taskType ?? ''}:${problemCategory ?? ''}:${roleInTask ?? ''}:${techStack ?? ''}:${domainTags ?? ''}:${sortBy ?? ''}:${sortOrder ?? ''}`
            )
            calls.push(`resolved-categories:${categorySkillIds?.join('|') ?? ''}`)
            return Promise.resolve({
              items: [
                {
                  id: 'talent-2',
                  username: 'bravo',
                  status: 'active',
                  trust_data: {},
                  avatar_url: null,
                  bio: null,
                  profile_settings: {},
                  is_external_contributor: true,
                  external_contributor_completed_tasks_count: 0,
                },
              ],
              total: 7,
            })
          },
          fetchBookmarks: (recruiterUserId, talentUserIds) => {
            calls.push(`bookmarks:${recruiterUserId}:${talentUserIds.join(',')}`)
            return Promise.resolve(
              new Map([
                [
                  'talent-2',
                  {
                    id: 'bookmark-2',
                    talent_user_id: 'talent-2',
                    notes: 'Priority',
                    folder: null,
                    rating: null,
                  },
                ],
              ])
            )
          },
          countSavedBookmarks: (recruiterUserId) => {
            calls.push(`saved:${recruiterUserId}`)
            return Promise.resolve(4)
          },
        },
        buildExplainabilitySummary: (talentUserIds) => {
          calls.push(`explain:${talentUserIds.join(',')}`)
          return Promise.resolve(new Map())
        },
      }
    )

    const result = await query.execute({
      q: 'br',
      skill_categories: ['technology', 'delivery'],
      skill_ids: ['skill-1'],
      business_domain: 'fintech',
      task_type: 'api_design',
      problem_category: 'compliance',
      role_in_task: 'architect',
      tech_stack: 'AdonisJS',
      domain_tags: 'settlement',
      sort_by: 'trust_score',
      sort_order: 'asc',
      page: 2,
      per_page: 1,
    })

    assert.deepEqual(calls, [
      'categories:technology|delivery',
      'page:2:1:br:skill-1:fintech:api_design:compliance:architect:AdonisJS:settlement:trust_score:asc',
      'resolved-categories:category-skill-1',
      'bookmarks:recruiter-1:talent-2',
      'explain:talent-2',
      'saved:recruiter-1',
    ])
    assert.equal(result.page, 2)
    assert.equal(result.per_page, 1)
    assert.equal(result.total_pages, 7)
    assert.deepInclude(result.pagination, {
      mode: 'offset',
      page: 2,
      perPage: 1,
      total: 7,
      lastPage: 7,
      hasNextPage: true,
      hasPreviousPage: true,
    })
    assert.equal(result.stats.total, 7)
    assert.equal(result.stats.saved, 4)
    assert.deepEqual(result.filters.skill_categories, ['technology', 'delivery'])
    assert.deepEqual(result.filters.skill_ids, ['skill-1'])
    assert.equal(result.filters.business_domain, 'fintech')
    assert.equal(result.filters.task_type, 'api_design')
    assert.equal(result.filters.problem_category, 'compliance')
    assert.equal(result.filters.role_in_task, 'architect')
    assert.equal(result.filters.tech_stack, 'AdonisJS')
    assert.equal(result.filters.domain_tags, 'settlement')
    assert.equal(result.filters.sort_by, 'trust_score')
    assert.equal(result.filters.sort_order, 'asc')
    assert.isTrue(result.talents[0]?.bookmark.isSaved ?? false)
  })

  test('uses ranked task search results when a task is selected', async ({ assert }) => {
    const calls: string[] = []

    const query = new GetTalentDirectoryPageQuery(
      {
        userId: 'recruiter-1',
        organizationId: 'org-1',
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      {
        searchTalents: {
          handle: (dto) => {
            calls.push(`search:${dto.task_id ?? ''}:${dto.page ?? ''}:${dto.per_page ?? ''}`)
            return Promise.resolve([
              {
                id: 'talent-1',
                username: 'alpha',
                status: 'active',
                match_score: 92,
                skill_match: 90,
                domain_match: 80,
                delivery_reliability: 85,
                trust_score: 88,
                explanations: ['Strong verified review history'],
                risks: [],
                avatar_url: null,
                bio: null,
                custom_headline: 'Staffing lead',
                completed_tasks: 12,
                reviewed_skills_count: 3,
                imported_skills_count: 1,
                under_dispute_skills_count: 0,
                latest_confidence_signal: 'high',
              },
              {
                id: 'talent-2',
                username: 'bravo',
                status: 'active',
                match_score: 61,
                skill_match: 50,
                domain_match: 55,
                delivery_reliability: 60,
                trust_score: 70,
                explanations: ['Some task match evidence'],
                risks: ['Missing mandatory skill'],
                avatar_url: null,
                bio: null,
                custom_headline: null,
                completed_tasks: 4,
                reviewed_skills_count: 1,
                imported_skills_count: 0,
                under_dispute_skills_count: 0,
                latest_confidence_signal: 'medium',
              },
            ])
          },
        },
        skillCategoryReader: {
          resolveActiveSkillIdsByCategoryCodes: () => Promise.resolve([]),
        },
        pageReader: {
          fetchTalentPage: () => {
            throw new Error('fetchTalentPage should not be used for selected-task ranking')
          },
          fetchBookmarks: (recruiterUserId, talentUserIds) => {
            calls.push(`bookmarks:${recruiterUserId}:${talentUserIds.join(',')}`)
            return Promise.resolve(new Map())
          },
          countSavedBookmarks: (recruiterUserId) => {
            calls.push(`saved:${recruiterUserId}`)
            return Promise.resolve(0)
          },
        },
        buildExplainabilitySummary: (talentUserIds) => {
          calls.push(`explain:${talentUserIds.join(',')}`)
          return Promise.resolve(
            new Map([
              [
                'talent-1',
                {
                  reviewedSkillsCount: 3,
                  importedSkillsCount: 1,
                  underDisputeSkillsCount: 0,
                  latestConfidenceSignal: 'high' as const,
                },
              ],
              [
                'talent-2',
                {
                  reviewedSkillsCount: 1,
                  importedSkillsCount: 0,
                  underDisputeSkillsCount: 0,
                  latestConfidenceSignal: 'medium' as const,
                },
              ],
            ])
          )
        },
      }
    )

    const result = await query.execute({
      task_id: 'task-1',
      sort_by: 'relevance',
      sort_order: 'desc',
    })

    assert.deepEqual(calls, [
      'search:task-1::',
      'bookmarks:recruiter-1:talent-1,talent-2',
      'explain:talent-1,talent-2',
      'saved:recruiter-1',
    ])
    assert.equal(result.talents[0]?.id, 'talent-1')
    assert.equal(result.talents[0]?.match_score, 92)
    assert.deepEqual(result.talents[0]?.explanations, ['Strong verified review history'])
    assert.deepEqual(result.talents[1]?.risks, ['Missing mandatory skill'])
    assert.equal(result.filters.task_id, 'task-1')
    assert.equal(result.stats.total, 2)
  })
})
