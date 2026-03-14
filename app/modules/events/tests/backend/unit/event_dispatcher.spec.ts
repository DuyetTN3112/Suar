import { test } from '@japa/runner'

import {
  EventDispatcher,
  EventListenerTimeoutError,
} from '#modules/events/event_dispatcher'
import { TaskCreatedEvent } from '#modules/events/task_events'

interface TaskEventMap {
  'task.created': TaskCreatedEvent
}

function createTaskEvent(): TaskCreatedEvent {
  return new TaskCreatedEvent({
    taskId: 'task-1',
    title: 'Task Title',
    creatorId: 'user-1',
    organizationId: 'org-1',
  })
}

test.group('Event dispatcher', () => {
  test('dispatches typed listeners in registration order', async ({ assert }) => {
    const dispatcher = new EventDispatcher<TaskEventMap>()
    const seen: string[] = []

    dispatcher.on('task.created', (event) => {
      seen.push(`first:${event.taskId}`)
    })
    dispatcher.on('task.created', (event) => {
      seen.push(`second:${event.taskId}`)
    })

    await dispatcher.dispatch(createTaskEvent())

    assert.deepEqual(seen, ['first:task-1', 'second:task-1'])
  })

  test('continues dispatching and aggregates every listener error', async ({ assert }) => {
    const dispatcher = new EventDispatcher<TaskEventMap>()
    const seen: string[] = []

    dispatcher.on('task.created', () => {
      seen.push('failed')
      throw new Error('first listener failed')
    })
    dispatcher.on('task.created', () => {
      seen.push('completed')
      throw new Error('second listener failed')
    })

    let captured: unknown
    try {
      await dispatcher.dispatch(createTaskEvent())
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, AggregateError)
    assert.lengthOf((captured as AggregateError).errors, 2)
    assert.match(
      ((captured as AggregateError).errors[0] as Error).message,
      /first listener failed/
    )
    assert.match(
      ((captured as AggregateError).errors[1] as Error).message,
      /second listener failed/
    )
    assert.deepEqual(seen, ['failed', 'completed'])
  })

  test('bounds a stalled listener and continues dispatching', async ({ assert }) => {
    const dispatcher = new EventDispatcher<TaskEventMap>(5)
    const seen: string[] = []

    dispatcher.on('task.created', () => new Promise<void>(() => {}))
    dispatcher.on('task.created', () => {
      seen.push('completed-after-timeout')
    })

    let captured: unknown
    try {
      await dispatcher.dispatch(createTaskEvent())
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, AggregateError)
    assert.instanceOf((captured as AggregateError).errors[0], EventListenerTimeoutError)
    assert.deepEqual(seen, ['completed-after-timeout'])
  })

  test('stops notifying a listener after its subscription is removed', async ({ assert }) => {
    const dispatcher = new EventDispatcher<TaskEventMap>()
    const seen: string[] = []
    const unsubscribe = dispatcher.on('task.created', (event) => {
      seen.push(event.taskId)
    })

    await dispatcher.dispatch(createTaskEvent())
    unsubscribe()
    unsubscribe()
    await dispatcher.dispatch(createTaskEvent())

    assert.deepEqual(seen, ['task-1'])
  })
})
