import { test } from '@japa/runner'

import {
  handleOrganizationCreatedLifecycleLog,
  handleProjectCreatedLifecycleLog,
  type LifecycleLogListenerDependencies,
} from '#modules/logger/listeners/lifecycle_log_listener'

test.group('Lifecycle log listener', () => {
  test('adapts organization and project events into bounded debug records', ({ assert }) => {
    const records: Array<{ message: string; context: unknown }> = []
    const dependencies: LifecycleLogListenerDependencies = {
      logger: {
        debug(message, context) {
          records.push({ message, context })
        },
      },
    }

    handleOrganizationCreatedLifecycleLog(
      {
        organizationId: 'organization-1',
        ownerId: 'user-1',
        name: 'Organization One',
        slug: 'organization-one',
        ip: '127.0.0.1',
      },
      dependencies
    )
    handleProjectCreatedLifecycleLog(
      {
        projectId: 'project-1',
        creatorId: 'user-1',
        organizationId: 'organization-1',
        name: 'Project One',
      },
      dependencies
    )

    assert.deepEqual(records, [
      {
        message: 'Organization created event',
        context: {
          orgId: 'organization-1',
          ownerId: 'user-1',
          ip: '127.0.0.1',
        },
      },
      {
        message: 'Project created event',
        context: {
          projectId: 'project-1',
          creatorId: 'user-1',
          organizationId: 'organization-1',
        },
      },
    ])
  })
})
