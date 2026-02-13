import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const retiredPageName = ['status', 'board.svelte'].join('_')
const retiredPages = [
  `inertia/apps/user/modules/tasks/${retiredPageName}`,
  `inertia/apps/org/modules/tasks/${retiredPageName}`,
]

function sourceFilesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)
    return statSync(path).isDirectory() ? sourceFilesUnder(path) : [path]
  })
}

describe('retired task status board POC', () => {
  it('removes both shipped page copies', () => {
    for (const page of retiredPages) {
      expect(existsSync(resolve(process.cwd(), page)), page).toBe(false)
    }
  })

  it('leaves no navigation or task-surface link to the retired route', () => {
    const sourceRoots = [
      'inertia/apps/user/shared/components/navigation',
      'inertia/apps/org/shared/components/navigation',
      'inertia/apps/user/modules/tasks',
      'inertia/apps/org/modules/tasks',
    ]
    const linkedSources = sourceRoots
      .flatMap((root) => sourceFilesUnder(resolve(process.cwd(), root)))
      .filter((path) => !path.endsWith('retired_task_surface.test.ts'))
      .filter((path) => /\.(svelte|ts)$/.test(path))
      .filter((path) => readFileSync(path, 'utf8').includes('/tasks/status-board'))

    expect(linkedSources).toEqual([])
  })
})
