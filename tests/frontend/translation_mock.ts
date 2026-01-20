import { writable } from 'svelte/store'

import adminUi from '../../resources/lang/vi/admin_ui.json' with { type: 'json' }
import auth from '../../resources/lang/vi/auth.json' with { type: 'json' }
import common from '../../resources/lang/vi/common.json' with { type: 'json' }
import index from '../../resources/lang/vi/index.json' with { type: 'json' }
import messages from '../../resources/lang/vi/messages.json' with { type: 'json' }
import notifications from '../../resources/lang/vi/notifications.json' with { type: 'json' }
import organization from '../../resources/lang/vi/organization.json' with { type: 'json' }
import project from '../../resources/lang/vi/project.json' with { type: 'json' }
import settings from '../../resources/lang/vi/settings.json' with { type: 'json' }
import task from '../../resources/lang/vi/task.json' with { type: 'json' }
import uiMisc from '../../resources/lang/vi/ui_misc.json' with { type: 'json' }
import user from '../../resources/lang/vi/user.json' with { type: 'json' }
import userAudit from '../../resources/lang/vi/user_audit.json' with { type: 'json' }
import validator from '../../resources/lang/vi/validator.json' with { type: 'json' }
import workspace from '../../resources/lang/vi/workspace.json' with { type: 'json' }

type TranslationTree = Record<string, unknown>

const translations: TranslationTree = {
  admin_ui: adminUi,
  auth,
  common,
  index,
  messages,
  notifications,
  organization,
  project,
  settings,
  task,
  ui_misc: uiMisc,
  user,
  user_audit: userAudit,
  validator,
  workspace,
}

const state = writable({
  locale: 'vi',
  loadedModules: Object.keys(translations),
  translations,
})

function isRecord(value: unknown): value is TranslationTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nestedValue(source: unknown, keys: string[]): unknown {
  let current = source

  for (const key of keys) {
    if (!isRecord(current) || !(key in current)) return undefined
    current = current[key]
  }

  return current
}

function moduleValue(moduleName: string, restKeys: string[]): unknown {
  const moduleTree = translations[moduleName]
  if (!isRecord(moduleTree)) return undefined

  const flatValue = restKeys.length > 0 ? nestedValue(moduleTree, restKeys) : moduleTree
  if (flatValue !== undefined) return flatValue

  const wrappedTree = nestedValue(moduleTree, [moduleName])
  if (!isRecord(wrappedTree)) return undefined

  return restKeys.length > 0 ? nestedValue(wrappedTree, restKeys) : wrappedTree
}

function t(key: string, params: Record<string, unknown> = {}, fallback?: string): string {
  const [moduleName, ...restKeys] = key.split('.')
  const resolved = moduleName ? moduleValue(moduleName, restKeys) : undefined
  const text = typeof resolved === 'string' ? resolved : fallback ?? key

  return text.replace(
    /:(\w+)|\{(\w+)\}/g,
    (match: string, colonKey?: string, braceKey?: string) => {
      const parameter = params[colonKey ?? braceKey ?? '']
      if (parameter === undefined || parameter === null) return match
      if (
        typeof parameter === 'string' ||
        typeof parameter === 'number' ||
        typeof parameter === 'boolean'
      ) {
        return String(parameter)
      }
      return JSON.stringify(parameter)
    }
  )
}

export const translationStore = {
  subscribe: state.subscribe,
  locale: 'vi',
  translations,
  t,
  init: () => Promise.resolve(),
  setLocale: () => Promise.resolve(),
}

export function useTranslation() {
  return translationStore
}

export default useTranslation
