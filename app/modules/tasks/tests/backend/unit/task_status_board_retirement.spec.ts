import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

const retiredController = 'app/modules/tasks/controllers/patch_task_status_board_poc_controller.ts'
const routeFiles = ['start/routes/tasks.ts', 'start/routes/deprecated/task_surface_aliases.ts']
const retiredControllerSymbol = ['PatchTaskStatusBoard', 'PocController'].join('')
const retiredPageRouteName = ['tasks.board_state', 'show'].join('.')

test('retired status board POC has no controller or route-table references', ({ assert }) => {
  assert.isFalse(existsSync(retiredController))

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, 'utf8')
    assert.notInclude(source, retiredControllerSymbol)
    assert.notInclude(source, retiredPageRouteName)
    assert.notInclude(source, 'status-board')
    assert.notInclude(source, 'board-state')
  }
})
