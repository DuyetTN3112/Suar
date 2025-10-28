import { test } from '@japa/runner'

import {
  canAttachTaskToSprint,
  canTransitionProjectSprint,
  classifySprintTaskCompletion,
} from '#modules/sprints/domain/sprint_core_rules'

test.group('Sprint core rules', () => {
  test('task can attach to sprint only inside the same project while sprint is editable', ({ assert }) => {
    assert.isTrue(
      canAttachTaskToSprint({
        taskProjectId: 'project-1',
        sprintProjectId: 'project-1',
        sprintStatus: 'active',
      }).allowed
    )

    assert.isFalse(
      canAttachTaskToSprint({
        taskProjectId: 'project-1',
        sprintProjectId: 'project-2',
        sprintStatus: 'active',
      }).allowed
    )

    assert.isFalse(
      canAttachTaskToSprint({
        taskProjectId: 'project-1',
        sprintProjectId: 'project-1',
        sprintStatus: 'review_closed',
      }).allowed
    )
  })

  test('sprint close classifies unfinished task as carry-over and done task as completed', ({
    assert,
  }) => {
    assert.equal(classifySprintTaskCompletion({ statusCategory: 'done' }), 'completed')
    assert.equal(classifySprintTaskCompletion({ statusCategory: 'in_progress' }), 'carry_over')
    assert.equal(classifySprintTaskCompletion({ statusCategory: 'todo' }), 'carry_over')
  })

  test('project sprint lifecycle follows draft active review archived order', ({ assert }) => {
    assert.isTrue(
      canTransitionProjectSprint({
        from: 'draft',
        to: 'active',
        actorCanManageSprint: true,
      }).allowed
    )
    assert.isTrue(
      canTransitionProjectSprint({
        from: 'active',
        to: 'review_open',
        actorCanManageSprint: true,
      }).allowed
    )
    assert.isFalse(
      canTransitionProjectSprint({
        from: 'review_open',
        to: 'active',
        actorCanManageSprint: true,
      }).allowed
    )
    assert.isFalse(
      canTransitionProjectSprint({
        from: 'draft',
        to: 'active',
        actorCanManageSprint: false,
      }).allowed
    )
  })
})
