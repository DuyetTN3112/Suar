import { test } from '@japa/runner'

import { EventDispatcher } from '#modules/events/event_dispatcher'
import { TaskCreatedEvent } from '#modules/events/task_events'

test.group('Event dispatcher', () => {
  test('dispatches listeners in registration order and propagates first listener error', async ({
    assert,
  }) => {
    const dispatcher = new EventDispatcher()
    const taskEvent = new TaskCreatedEvent({
      taskId: 'task-1',
      title: 'Task Title',
      creatorId: 'user-1',
      organizationId: 'org-1',
    })
    const seen: string[] = []

    dispatcher.on(taskEvent.eventName, (event) => {
      const typedEvent = event as TaskCreatedEvent
      seen.push(typedEvent.taskId)
    })

    await dispatcher.dispatch(taskEvent)
    assert.deepEqual(seen, ['task-1'])

    dispatcher.on(taskEvent.eventName, () => {
      throw new Error('listener failed')
    })

    await assert.rejects(() => dispatcher.dispatch(taskEvent), /listener failed/)
  })
})
