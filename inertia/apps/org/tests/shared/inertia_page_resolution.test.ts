import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

type AppName = 'org' | 'user'

const appRoots: Record<AppName, string> = {
  org: 'inertia/apps/org',
  user: 'inertia/apps/user',
}

function candidatePagePaths(app: AppName, pageName: string): string[] {
  if (app === 'org') {
    const names = pageName.startsWith('org/') ? [pageName, pageName.slice('org/'.length)] : [pageName]

    return names.flatMap((name) => {
      const parts = name.split('/')
      const candidates = [`pages/${name}.svelte`]

      if (parts.length >= 2) {
        const moduleName = parts[0]
        if (moduleName !== undefined) {
          candidates.push(`modules/${moduleName}/${parts.slice(1).join('/')}.svelte`)
        }
      }

      candidates.push(`modules/${name}.svelte`)

      if (!name.includes('/')) {
        candidates.push(`modules/${name}/index.svelte`, `modules/${name}/${name}.svelte`)
      }

      return candidates
    })
  }

  const parts = pageName.split('/')
  const candidates = [`pages/${pageName}.svelte`]

  if (parts.length >= 2) {
    const moduleName = parts[0]
    if (moduleName !== undefined) {
      candidates.push(`modules/${moduleName}/${parts.slice(1).join('/')}.svelte`)
    }
  }

  candidates.push(`modules/${pageName}.svelte`)

  if (!pageName.includes('/')) {
    candidates.push(`modules/${pageName}/index.svelte`)
  }

  if (pageName === 'index') {
    candidates.push('modules/dashboard/index.svelte')
  }

  return candidates
}

function resolvesPage(app: AppName, pageName: string): boolean {
  const root = appRoots[app]

  return candidatePagePaths(app, pageName).some((candidate) =>
    existsSync(path.join(process.cwd(), root, candidate))
  )
}

describe('Inertia multi-app page resolution', () => {
  test.each([
    ['user', 'index'],
    ['org', 'org/no_org'],
  ] as const)('%s app resolves %s', (app, pageName) => {
    expect(resolvesPage(app, pageName), `${app} page not found: ${pageName}`).toBe(true)
  })
})
