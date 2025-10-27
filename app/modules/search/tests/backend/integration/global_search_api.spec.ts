import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Global Search API', (group) => {
  let previousSearchEnabled: boolean

  group.setup(async () => {
    await setupApp()
    previousSearchEnabled = searchConfig.enabled
    searchConfig.enabled = false
  })
  group.teardown(() => {
    searchConfig.enabled = previousSearchEnabled
    return teardownApp()
  })
  group.each.teardown(() => cleanupTestData())

  test('returns grouped talent, task, project, and skill hits for a query', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await org
      .merge({
        name: 'Discovery Org',
        slug: 'discovery-org',
      })
      .save()
    const talent = await UserFactory.create({
      username: 'discovery_talent',
    })
    await talent
      .merge({
        profile_settings: {
          is_searchable: true,
          show_contact_info: true,
          show_organizations: true,
          show_projects: true,
          show_spider_chart: true,
          show_technical_skills: true,
          custom_headline: 'Discovery platform engineer',
          preferred_job_types: [],
          preferred_locations: [],
          min_salary_expectation: null,
          salary_currency: 'USD',
          available_from: null,
        },
      })
      .save()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Discovery Hub',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Discovery task rollout',
      task_visibility: 'external',
      assigned_to: null,
    })
    const skill = await SkillFactory.create({
      skill_name: 'Discovery Mapping',
      skill_code: 'discovery_mapping',
    })

    const response = await client.get('/api/search').qs({ q: 'Discovery' }).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        query: string
        talents: Array<{ id: string }>
        tasks: Array<{ id: string }>
        projects: Array<{ id: string }>
        skills: Array<{ id: string }>
        organizations: Array<{ id: string }>
        candidateResultCount: number
        candidateTotalByType: {
          all: number
          talent: number
          task: number
          project: number
          skill: number
          organization: number
          comment: number
        }
        candidateFieldFacets: Array<{ label: string; entityType: string; count: number }>
        resultLimit: number
        resultsTruncated: boolean
      }
    }

    assert.equal(body.data.query, 'Discovery')
    assert.include(
      body.data.talents.map((item) => item.id),
      talent.id
    )
    assert.include(
      body.data.tasks.map((item) => item.id),
      task.id
    )
    assert.include(
      body.data.projects.map((item) => item.id),
      project.id
    )
    assert.include(
      body.data.skills.map((item) => item.id),
      skill.id
    )
    assert.include(
      body.data.organizations.map((item) => item.id),
      org.id
    )
    assert.isAtLeast(body.data.candidateResultCount, 5)
    assert.isAtLeast(body.data.candidateTotalByType.all, 5)
    assert.isAtLeast(body.data.candidateTotalByType.task, 1)
    assert.isAtLeast(body.data.candidateTotalByType.project, 1)
    assert.isAtLeast(body.data.candidateTotalByType.talent, 1)
    assert.isAtLeast(body.data.candidateTotalByType.skill, 1)
    assert.isAtLeast(body.data.candidateTotalByType.organization, 1)
    assert.isTrue(
      body.data.candidateFieldFacets.some(
        (facet) => facet.label === 'Task title' && facet.entityType === 'task'
      )
    )
    assert.isTrue(
      body.data.candidateFieldFacets.some(
        (facet) => facet.label === 'Project name' && facet.entityType === 'project'
      )
    )
    assert.equal(body.data.resultLimit, 24)
    assert.isFalse(body.data.resultsTruncated)
  })

  test('returns public task comments as distinct search center results', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Comment Search Project',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Comment searchable task',
      task_visibility: 'external',
      assigned_to: null,
    })
    const commentId = testId()

    await db.table('task_comments').insert({
      id: commentId,
      task_id: task.id,
      author_id: owner.id,
      body: 'duyet lives inside this public comment',
      comment_type: 'normal',
      visibility: 'public',
      review_relevance: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const response = await client.get('/api/search').qs({ q: 'duyet' }).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        comments: Array<{ id: string; taskId: string; body: string }>
        results: Array<{
          entityType: string
          entityId: string
          sourceLabel: string
          url: string
          matchedFields: string[]
        }>
      }
    }

    assert.isTrue(
      body.data.comments.some(
        (comment) =>
          comment.id === commentId &&
          comment.taskId === task.id &&
          comment.body === 'duyet lives inside this public comment'
      )
    )
    assert.isTrue(
      body.data.results.some(
        (result) =>
          result.entityType === 'comment' &&
          result.entityId === commentId &&
          result.sourceLabel === 'Comment' &&
          result.url === `/tasks/${task.id}?comment=${commentId}` &&
          result.matchedFields.includes('comment')
      )
    )
  })

  test('returns accented public comments for unaccented Vietnamese query', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Vietnamese Comment Search Project',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Vietnamese comment searchable task',
      task_visibility: 'external',
      assigned_to: null,
    })
    const commentId = testId()

    await db.table('task_comments').insert({
      id: commentId,
      task_id: task.id,
      author_id: owner.id,
      body: 'Duyệt hồ sơ ứng viên trong comment public',
      comment_type: 'normal',
      visibility: 'public',
      review_relevance: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const response = await client.get('/api/search').qs({ q: 'duyet' }).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        comments: Array<{ id: string; body: string }>
        results: Array<{
          entityType: string
          entityId: string
          highlightedSnippets: Array<Array<{ text: string; match: boolean }>>
        }>
      }
    }

    assert.isTrue(
      body.data.comments.some(
        (comment) =>
          comment.id === commentId && comment.body === 'Duyệt hồ sơ ứng viên trong comment public'
      )
    )
    const result = body.data.results.find(
      (item) => item.entityType === 'comment' && item.entityId === commentId
    )
    assert.exists(result)
    assert.deepEqual(result?.highlightedSnippets[0], [
      { text: 'Duyệt', match: true },
      { text: ' hồ sơ ứng viên trong comment public', match: false },
    ])
  })

  test('does not leak private task or comment matches into search center', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Duyetacl private search project',
    })
    const publicTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Duyetacl public marketplace task',
      task_visibility: 'external',
      assigned_to: null,
    })
    const internalTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Duyetacl internal task',
      task_visibility: 'internal',
      assigned_to: null,
    })
    const assignedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Duyetacl assigned task',
      task_visibility: 'external',
      assigned_to: owner.id,
    })
    const publicCommentId = testId()
    const internalTaskCommentId = testId()
    const assignedTaskCommentId = testId()
    const internalCommentId = testId()

    await db.table('task_comments').multiInsert([
      {
        id: publicCommentId,
        task_id: publicTask.id,
        author_id: owner.id,
        body: 'duyetacl public searchable comment',
        comment_type: 'normal',
        visibility: 'public',
        review_relevance: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: internalTaskCommentId,
        task_id: internalTask.id,
        author_id: owner.id,
        body: 'duyetacl comment on internal task',
        comment_type: 'normal',
        visibility: 'public',
        review_relevance: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: assignedTaskCommentId,
        task_id: assignedTask.id,
        author_id: owner.id,
        body: 'duyetacl comment on assigned task',
        comment_type: 'normal',
        visibility: 'public',
        review_relevance: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: internalCommentId,
        task_id: publicTask.id,
        author_id: owner.id,
        body: 'duyetacl internal comment on public task',
        comment_type: 'normal',
        visibility: 'internal',
        review_relevance: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    const response = await client.get('/api/search').qs({ q: 'duyetacl' }).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        tasks: Array<{ id: string }>
        comments: Array<{ id: string }>
        results: Array<{ entityType: string; entityId: string }>
      }
    }
    const taskIds = body.data.tasks.map((task) => task.id)
    const commentIds = body.data.comments.map((comment) => comment.id)
    const resultIds = body.data.results.map((result) => result.entityId)

    assert.include(taskIds, publicTask.id)
    assert.notInclude(taskIds, internalTask.id)
    assert.notInclude(taskIds, assignedTask.id)
    assert.include(commentIds, publicCommentId)
    assert.notInclude(commentIds, internalTaskCommentId)
    assert.notInclude(commentIds, assignedTaskCommentId)
    assert.notInclude(commentIds, internalCommentId)
    assert.include(resultIds, publicTask.id)
    assert.include(resultIds, publicCommentId)
    assert.notInclude(resultIds, internalTask.id)
    assert.notInclude(resultIds, assignedTask.id)
    assert.notInclude(resultIds, internalTaskCommentId)
    assert.notInclude(resultIds, assignedTaskCommentId)
    assert.notInclude(resultIds, internalCommentId)
  })
})
